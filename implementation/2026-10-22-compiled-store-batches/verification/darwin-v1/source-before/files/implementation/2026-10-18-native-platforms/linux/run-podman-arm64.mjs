import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { copyFile, lstat, mkdir, readFile, readdir, readlink, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { finished } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stageNativeVerificationSource } from "../../../scripts/native_verification_inputs.mjs";

const stage = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(stage, "../../..");
const options = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  assert.ok(process.argv[index]?.startsWith("--") && process.argv[index + 1]);
  assert.ok(!options.has(process.argv[index]));
  options.set(process.argv[index], process.argv[index + 1]);
}
const phase = options.get("--phase");
const phases = ["prepare-image", "bootstrap", "verify", "benchmark-prepare", "benchmark-run", "archive", "finalize"];
assert.ok(phases.includes(phase));
assert.deepEqual([...options.keys()].sort(),
  (phase === "prepare-image" ? ["--phase", "--output-dir", "--machine-proof"]
    : ["--phase", "--image-proof", "--evidence-dir", "--machine-proof"]).sort());
const output = phase === "prepare-image" ? path.resolve(options.get("--output-dir")) : null;
const evidence = phase === "prepare-image" ? null : path.resolve(options.get("--evidence-dir"));
assert.equal(path.dirname(output ?? evidence), stage);
assert.match(path.basename(output ?? evidence), /^(?:image|evidence)-podman-[a-z0-9-]+$/);
const podman = process.env.R3ACT_PODMAN_COMMAND ?? "/Users/mini/.local/bin/podman";
const machineProofBytes = await readFile(path.resolve(options.get("--machine-proof")));
const machineProof = JSON.parse(machineProofBytes);
assert.equal(machineProof.schemaVersion, 1);
assert.equal(machineProof.status, "READY");
assert.equal(machineProof.podmanCommand, podman);
assert.equal(machineProof.machineName, "r3act-dev");
assert.equal(machineProof.provider, "applehv");
assert.equal(machineProof.cpus, 1);
assert.ok(Number.isSafeInteger(machineProof.memoryMiB) &&
  machineProof.memoryMiB >= 2048 && machineProof.memoryMiB <= 4096);
assert.ok(path.isAbsolute(machineProof.diskImagePath));
assert.equal(await realpath(machineProof.diskImagePath), machineProof.diskImagePath);
assert.ok(machineProof.diskImagePath.startsWith("/Volumes/Depot/Containers/podman/"));
const diskStat = await lstat(machineProof.diskImagePath);
assert.ok(diskStat.isFile() && diskStat.size > 0);
assert.equal(machineProof.inspect.Name, machineProof.machineName);
assert.equal(machineProof.inspect.Resources.CPUs, machineProof.cpus);
assert.equal(machineProof.inspect.Resources.Memory, machineProof.memoryMiB);
assert.ok(typeof machineProof.info?.store?.graphRoot === "string" && machineProof.info.store.graphRoot);
assert.ok(typeof machineProof.info?.store?.volumePath === "string" && machineProof.info.store.volumePath);
const machineResult = spawnSync(podman, ["machine", "inspect", machineProof.machineName],
  { cwd: root, encoding: "utf8", timeout: 10_000 });
assert.equal(machineResult.status, 0, `Podman machine inspect failed: ${machineResult.error ?? machineResult.stderr}`);
const inspectedMachine = JSON.parse(machineResult.stdout);
assert.equal(inspectedMachine.length, 1);
const machine = inspectedMachine[0];
assert.equal(machine.Name, machineProof.machineName);
assert.equal(machine.State, "running");
assert.equal(machine.Resources.CPUs, machineProof.cpus);
assert.equal(machine.Resources.Memory, machineProof.memoryMiB);
assert.equal(machine.Resources.DiskSize, machineProof.inspect.Resources.DiskSize);
assert.equal(machine.ConfigDir.Path, machineProof.inspect.ConfigDir.Path);
assert.match(machine.ConfigDir.Path, /\/applehv(?:\/|$)/);
const machineConfig = JSON.parse(await readFile(path.join(machine.ConfigDir.Path, `${machine.Name}.json`)));
assert.equal(machineConfig.Name, machine.Name);
assert.equal(machineConfig.Resources.CPUs, machine.Resources.CPUs);
assert.equal(machineConfig.Resources.Memory, machine.Resources.Memory);
assert.equal(machineConfig.Resources.DiskSize, machine.Resources.DiskSize);
assert.ok(path.isAbsolute(machineConfig.ImagePath.Path));
assert.equal(await realpath(machineConfig.ImagePath.Path), machineProof.diskImagePath);
const memoryMiB = Number(process.env.R3ACT_WORKLOAD_MEMORY_MIB ?? 1536);
assert.ok(Number.isSafeInteger(memoryMiB) && memoryMiB >= 200 &&
  memoryMiB <= machineProof.memoryMiB - 512);
const workloadResources = { cpus: "1", memory: `${memoryMiB}m`, cargoBuildJobs: "1" };
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const command = (args, timeout = 30_000) => {
  const result = spawnSync(podman, ["--connection", machineProof.machineName, ...args],
    { cwd: root, encoding: "utf8", timeout,
    killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 0, `podman ${args[0]} failed: ${result.error ?? result.stderr}`);
  return result.stdout.trim();
};
const inspect = (kind, name) => {
  const items = JSON.parse(command([kind, "inspect", name]));
  assert.equal(items.length, 1);
  return items[0];
};
const daemon = () => {
  const item = JSON.parse(command(["info", "--format", "json"]));
  assert.ok(["aarch64", "arm64"].includes(item.host?.arch));
  assert.equal(item.host.arch, machineProof.info.host.arch);
  assert.equal(item.store?.graphRoot, machineProof.info.store.graphRoot);
  assert.equal(item.store?.volumePath, machineProof.info.store.volumePath);
  return { arch: item.host.arch, graphRoot: item.store.graphRoot,
    volumePath: item.store.volumePath, machineName: machineProof.machineName };
};
const baseTag = "docker.io/library/node:24.18.0-bookworm";
const launcherSha256 = hash(await readFile(fileURLToPath(import.meta.url)));
const transferRoot = "/Volumes/Depot/Containers/podman/transfers";
const remoteArgs = (args) => ["--connection", machineProof.machineName, ...args];
const missingContainer = (value) => /no such (container|object)|container not found/i.test(String(value));
const mergeEvidence = async (from, to, base = from) => {
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await mkdir(target, { recursive: true });
      await mergeEvidence(source, target, base);
    } else if (entry.isFile()) {
      let existing;
      try { existing = await readFile(target); }
      catch (error) { if (error?.code !== "ENOENT") throw error; }
      if (existing) assert.equal(hash(existing), hash(await readFile(source)),
        `evidence conflict: ${target}`);
      else await copyFile(source, target);
    } else if (entry.isSymbolicLink()) {
      const link = await readlink(source);
      assert.ok(!path.isAbsolute(link) && path.resolve(path.dirname(source), link).startsWith(`${base}${path.sep}`),
        `Evidence link escapes archive: ${source}`);
      let existing;
      try { existing = await lstat(target); }
      catch (error) { if (error?.code !== "ENOENT") throw error; }
      if (existing) {
        assert.ok(existing.isSymbolicLink(), `evidence conflict: ${target}`);
        assert.equal(await readlink(target), link, `evidence conflict: ${target}`);
      } else await symlink(link, target);
    } else throw new Error(`Unsupported evidence entry: ${source}`);
  }
};

if (phase === "prepare-image") {
  await mkdir(output);
  const receiptPath = path.join(output, "image-attempt.json");
  const receipt = { schemaVersion: 1, status: "STARTED", baseTag, podmanCommand: podman,
    machineProofSha256: hash(machineProofBytes), daemon: null, pull: null, error: null };
  await writeFile(receiptPath, json(receipt), { flag: "wx" });
  let child;
  let interrupted = false;
  const stop = () => { interrupted = true; child?.kill("SIGKILL"); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    receipt.daemon = daemon();
    const stdout = createWriteStream(path.join(output, "base-pull.stdout.log"), { flags: "wx" });
    const stderr = createWriteStream(path.join(output, "base-pull.stderr.log"), { flags: "wx" });
    child = spawn(podman, ["--connection", machineProof.machineName,
      "pull", "--platform", "linux/arm64", baseTag],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (bytes) => stdout.write(bytes));
    child.stderr.on("data", (bytes) => stderr.write(bytes));
    const timer = setTimeout(stop, 600_000);
    const pull = await new Promise((resolve) => {
      let error = null;
      child.once("error", (cause) => { error = String(cause); });
      child.once("close", (code, signal) => resolve({ code, signal, error }));
    });
    clearTimeout(timer);
    stdout.end();
    stderr.end();
    await Promise.all([finished(stdout), finished(stderr)]);
    child = undefined;
    receipt.pull = pull;
    assert.equal(interrupted, false, "image pull timed out or interrupted");
    assert.equal(pull.code, 0, `image pull failed: ${pull.error ?? pull.signal ?? pull.code}`);
    assert.deepEqual(daemon(), receipt.daemon, "Podman daemon changed during image preparation");
    const image = inspect("image", baseTag);
    assert.equal(image.Os, "linux");
    assert.equal(image.Architecture, "arm64");
    assert.match(image.Id, /^(?:sha256:)?[a-f0-9]{64}$/);
    const digest = image.RepoDigests?.find((entry) =>
      /^(?:docker\.io\/library\/)?node@sha256:[a-f0-9]{64}$/.test(entry));
    assert.ok(digest, "official Node image must expose a pullable repository digest");
    const baseReference = digest.startsWith("docker.io/") ? digest : `docker.io/library/${digest}`;
    const pinned = inspect("image", baseReference);
    assert.equal(pinned.Id, image.Id);
    assert.equal(pinned.Architecture, "arm64");
    const proof = { schemaVersion: 1, status: "BASE_IDENTITY_CAPTURED", platform: "linux/arm64",
      baseTag, baseReference, baseDigest: baseReference.split("@")[1], imageId: image.Id,
      podmanCommand: podman, machineProofSha256: hash(machineProofBytes),
      daemon: receipt.daemon, launcherSha256,
      runtime: "Podman Linux ARM64 machine on this Mac; no independent hardware claim",
      storage: "Named volumes in the Depot-resident Podman machine disk; no per-volume quota" };
    await writeFile(path.join(output, "image-proof.json"), json(proof), { flag: "wx" });
    receipt.status = "READY";
  } catch (error) {
    receipt.status = "FAIL";
    receipt.error = String(error?.stack ?? error);
    throw error;
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    await writeFile(receiptPath, json(receipt));
  }
} else {
  const proofBytes = await readFile(path.resolve(options.get("--image-proof")));
  const image = JSON.parse(proofBytes);
  assert.equal(image.status, "BASE_IDENTITY_CAPTURED");
  assert.equal(image.platform, "linux/arm64");
  assert.equal(image.podmanCommand, podman);
  assert.equal(image.machineProofSha256, hash(machineProofBytes));
  assert.equal(image.launcherSha256, launcherSha256);
  assert.deepEqual(daemon(), image.daemon, "Podman context or daemon changed");
  const currentImage = inspect("image", image.baseReference);
  assert.equal(currentImage.Id, image.imageId);
  assert.equal(currentImage.Architecture, "arm64");
  assert.equal(currentImage.Os, "linux");
  if (phase === "bootstrap") await mkdir(evidence);
  const ownershipPath = path.join(evidence, "owned-volume.json");
  let ownership;
  if (phase === "bootstrap") {
    const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", timeout: 10_000 });
    assert.equal(git.status, 0, String(git.error ?? git.stderr));
    assert.match(git.stdout.trim(), /^[a-f0-9]{40}$/);
    const receiptId = randomUUID();
    ownership = { schemaVersion: 1, receiptId, volumeName: `r3act-native-platform-${receiptId}`,
      sourceVolumeName: `r3act-native-source-${receiptId}`,
      evidenceVolumeName: `r3act-native-evidence-${receiptId}`,
      sourceCommit: git.stdout.trim(), daemon: image.daemon, imageProofSha256: hash(proofBytes),
      machineProofSha256: hash(machineProofBytes), workloadResources, launcherSha256, evidence };
    await writeFile(ownershipPath, json(ownership), { flag: "wx" });
    for (const name of [ownership.volumeName, ownership.sourceVolumeName, ownership.evidenceVolumeName])
      command(["volume", "create", "--label", `r3act.native-platform=${receiptId}`, name]);
  } else {
    ownership = JSON.parse(await readFile(ownershipPath));
    assert.equal(ownership.evidence, evidence);
    assert.deepEqual(ownership.daemon, image.daemon);
    assert.equal(ownership.imageProofSha256, hash(proofBytes));
    assert.equal(ownership.machineProofSha256, hash(machineProofBytes));
    if (phase !== "archive" && phase !== "finalize")
      assert.deepEqual(ownership.workloadResources, workloadResources);
    assert.equal(ownership.launcherSha256, launcherSha256);
    if (phase !== "archive" && phase !== "finalize") {
      assert.equal(hash(await readFile(path.join(evidence, "container-source-lock.json"))),
        ownership.sourceLockSha256);
      const toolchainBytes = await readFile(path.join(evidence, "toolchain-proof.json"));
      assert.equal(hash(toolchainBytes), ownership.toolchainProofSha256);
      assert.equal(JSON.parse(toolchainBytes).status, "READY");
    }
  }
  const volumes = [ownership.volumeName, ownership.sourceVolumeName, ownership.evidenceVolumeName]
    .map((name) => inspect("volume", name));
  for (let index = 0; index < volumes.length; index++) {
    assert.equal(volumes[index].Name,
      [ownership.volumeName, ownership.sourceVolumeName, ownership.evidenceVolumeName][index]);
    assert.equal(volumes[index].Labels?.["r3act.native-platform"], ownership.receiptId);
  }
  const receiptPath = path.join(evidence, `host-${phase}.json`);
  const receipt = { schemaVersion: 1, phase, status: "STARTED", receiptId: ownership.receiptId,
    daemon: image.daemon, imageId: image.imageId, machineProofSha256: hash(machineProofBytes),
    volumeName: ownership.volumeName,
    sourceVolumeName: ownership.sourceVolumeName, evidenceVolumeName: ownership.evidenceVolumeName,
    volumeMountpoints: volumes.map((item) => item.Mountpoint),
    requestedWorkloadResources: null,
    exit: null, stopReason: null,
    cleanupErrors: [], error: null };
  await writeFile(receiptPath, json(receipt), { flag: "wx" });
  let activeChild;
  let containerName;
  let stopped = false;
  const transfer = async (action, filename) => {
    const name = `r3act-transfer-${randomUUID()}`;
    let primaryError;
    try {
      command(["run", "-d", "--name", name, "--label",
        `r3act.native-platform=${ownership.receiptId}`,
        "--cpus", "1", "--memory", "128m", "--network", "none",
        "--mount", `type=volume,source=${ownership.sourceVolumeName},target=/source`,
        "--mount", `type=volume,source=${ownership.evidenceVolumeName},target=/evidence`,
        image.baseReference, "node", "-e", "setInterval(() => {}, 1000)"], 30_000);
      if (action === "source") command(["cp", `${filename}/.`, `${name}:/source/`], 120_000);
      else if (action === "authorization") command(["cp", filename,
        `${name}:/evidence/benchmark/proof-v1/run-authorization.json`], 30_000);
      else {
        await mkdir(transferRoot, { recursive: true });
        const temporary = path.join(transferRoot, `r3act-evidence-${randomUUID()}`);
        await mkdir(temporary);
        try {
          command(["cp", `${name}:/evidence/.`, temporary], 120_000);
          await mergeEvidence(temporary, evidence);
        } finally { await rm(temporary, { recursive: true, force: true }); }
      }
    } catch (error) { primaryError = error; }
    const item = spawnSync(podman, remoteArgs(["container", "inspect", name]),
      { cwd: root, encoding: "utf8", timeout: 10_000 });
    if (item.status === 0) {
      try {
        const container = JSON.parse(item.stdout)[0];
        assert.equal(container.Config?.Labels?.["r3act.native-platform"], ownership.receiptId);
        command(["container", "rm", "--force", name], 20_000);
      } catch (error) {
        if (primaryError) receipt.cleanupErrors.push(`Transfer cleanup: ${String(error)}`);
        else primaryError = error;
      }
    } else if (!missingContainer(item.stderr)) {
      const error = new Error(`Could not inspect transfer container: ${item.error ?? item.stderr}`);
      if (primaryError) receipt.cleanupErrors.push(String(error));
      else primaryError = error;
    }
    if (primaryError) throw primaryError;
  };
  const availablePodmanBytes = () => {
    const name = `r3act-space-${randomUUID()}`;
    let primaryError;
    let bytes;
    try {
      const probe = command(["run", "--rm", "--name", name, "--platform", "linux/arm64",
        "--label", `r3act.native-platform=${ownership.receiptId}`,
        "--cpus", "1", "--memory", "128m", "--read-only", "--network", "none",
        "--mount", `type=volume,source=${ownership.volumeName},target=/workspace`,
        image.baseReference, "node", "-e",
        "const f=require('node:fs').statfsSync('/workspace');process.stdout.write(String(f.bavail*f.bsize))"], 30_000);
      assert.match(probe, /^\d+$/);
      bytes = Number(probe);
    } catch (error) { primaryError = error; }
    const item = spawnSync(podman, remoteArgs(["container", "inspect", name]),
      { cwd: root, encoding: "utf8", timeout: 10_000 });
    if (item.status === 0) {
      try {
        const container = JSON.parse(item.stdout)[0];
        assert.equal(container.Config?.Labels?.["r3act.native-platform"], ownership.receiptId);
        command(["container", "rm", "--force", name], 20_000);
      } catch (error) {
        if (primaryError) receipt.cleanupErrors.push(`Space probe cleanup: ${String(error)}`);
        else primaryError = error;
      }
    } else if (!missingContainer(item.stderr)) {
      const error = new Error(`Could not inspect space probe: ${item.error ?? item.stderr}`);
      if (primaryError) receipt.cleanupErrors.push(String(error));
      else primaryError = error;
    }
    if (primaryError) throw primaryError;
    return bytes;
  };
  const cleanup = () => {
    if (!containerName) return;
    try {
      const item = spawnSync(podman, remoteArgs(["container", "inspect", containerName]),
        { encoding: "utf8", timeout: 10_000 });
      if (item.status !== 0) {
        if (missingContainer(item.stderr)) return;
        throw new Error(`Could not inspect owned container: ${item.error ?? item.stderr}`);
      }
      const container = JSON.parse(item.stdout)[0];
      if (container?.Config?.Labels?.["r3act.native-platform"] !== ownership.receiptId) {
        throw new Error("Container ownership label mismatch; no deletion attempted");
      }
      command(["container", "rm", "--force", containerName], 20_000);
    } catch (error) { receipt.cleanupErrors.push(`Owned container cleanup: ${String(error)}`); }
  };
  const stop = (reason) => {
    if (stopped) return;
    stopped = true;
    receipt.stopReason = reason;
    activeChild?.kill("SIGKILL");
    cleanup();
  };
  const interrupt = () => stop("SIGINT");
  const terminate = () => stop("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  let timer;
  try {
    if (phase === "finalize") {
      for (const name of [ownership.volumeName, ownership.sourceVolumeName, ownership.evidenceVolumeName])
        command(["volume", "rm", name]);
      receipt.status = "PASS";
    } else if (phase === "archive" && !ownership.sourceLockSha256) {
      await transfer("evidence");
      receipt.status = "INCOMPLETE";
      receipt.error = "Bootstrap did not finish; host logs remain";
    } else {
      const limitMs = phase === "benchmark-run" ? 300_000
        : phase === "benchmark-prepare" ? 1_800_000
          : phase === "verify" ? 2_700_000 : 600_000;
      containerName = `r3act-${phase}-${randomUUID()}`;
      receipt.requestedWorkloadResources = workloadResources;
      if (phase === "bootstrap") {
        receipt.podmanAvailableBytes = availablePodmanBytes();
        assert.ok(Number.isSafeInteger(receipt.podmanAvailableBytes) &&
          receipt.podmanAvailableBytes >= 12 * 1024 ** 3,
        "Podman daemon needs at least 12 GiB free for the owned Linux build workspace");
        await mkdir(transferRoot, { recursive: true });
        const temporary = path.join(transferRoot, `r3act-source-${randomUUID()}`);
        await mkdir(temporary);
        try {
          const staged = await stageNativeVerificationSource(root, temporary);
          receipt.stagedSourceCount = staged.files.length;
          await writeFile(path.join(evidence, "host-source-snapshot-lock.json"), json(staged), { flag: "wx" });
          await transfer("source", temporary);
        } finally { await rm(temporary, { recursive: true, force: true }); }
      }
      if (phase === "benchmark-run") {
        await transfer("authorization", path.join(evidence,
          "benchmark", "proof-v1", "run-authorization.json"));
      }
      const args = ["run", "--rm", "--name", containerName, "--platform", "linux/arm64",
        "--cpus", workloadResources.cpus, "--memory", workloadResources.memory,
        "--label", `r3act.native-platform=${ownership.receiptId}`,
        "--mount", `type=volume,source=${ownership.volumeName},target=/workspace`,
        "--mount", `type=volume,source=${ownership.sourceVolumeName},target=/source,readonly`,
        "--mount", `type=volume,source=${ownership.evidenceVolumeName},target=/evidence`,
        "--env", `R3ACT_SOURCE_COMMIT=${ownership.sourceCommit}`,
        "--env", `CARGO_BUILD_JOBS=${workloadResources.cargoBuildJobs}`,
        "--env", "RUSTUP_HOME=/workspace/toolchain/rustup",
        "--env", "CARGO_HOME=/workspace/toolchain/cargo",
        "--env", "PATH=/workspace/toolchain/cargo/bin:/workspace/toolchain/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        image.baseReference, "node",
        phase === "bootstrap"
          ? "/source/implementation/2026-10-18-native-platforms/linux/run-container.mjs"
          : "/workspace/r3act/implementation/2026-10-18-native-platforms/linux/run-container.mjs", phase];
      const stdout = createWriteStream(path.join(evidence, `host-${phase}.stdout.log`), { flags: "wx" });
      const stderr = createWriteStream(path.join(evidence, `host-${phase}.stderr.log`), { flags: "wx" });
      activeChild = spawn(podman, remoteArgs(args), { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
      activeChild.stdout.on("data", (bytes) => { stdout.write(bytes); process.stdout.write(bytes); });
      activeChild.stderr.on("data", (bytes) => { stderr.write(bytes); process.stderr.write(bytes); });
      timer = setTimeout(() => stop(`${limitMs}ms phase deadline`), limitMs);
      const result = await new Promise((resolve) => {
        let error = null;
        activeChild.once("error", (cause) => { error = String(cause); });
        activeChild.once("close", (code, signal) => resolve({ code, signal, error }));
      });
      clearTimeout(timer);
      stdout.end();
      stderr.end();
      await Promise.all([finished(stdout), finished(stderr)]);
      receipt.exit = result;
      activeChild = undefined;
      if (stopped) throw new Error(`owned container phase interrupted: ${receipt.stopReason}`);
      assert.equal(result.code, 0, `container phase failed: ${result.error ?? result.signal ?? result.code}`);
      await transfer("evidence");
      cleanup();
      assert.equal(receipt.cleanupErrors.length, 0, "owned container cleanup was not confirmed");
      if (phase === "bootstrap") {
        const sourceLock = await readFile(path.join(evidence, "container-source-lock.json"));
        const hostLock = JSON.parse(await readFile(path.join(evidence, "host-source-snapshot-lock.json")));
        assert.deepEqual(JSON.parse(sourceLock).files, hostLock.files,
          "container bootstrap source differs from the staged host snapshot");
        const toolchainBytes = await readFile(path.join(evidence, "toolchain-proof.json"));
        assert.equal(JSON.parse(toolchainBytes).status, "READY");
        ownership.sourceLockSha256 = hash(sourceLock);
        ownership.toolchainProofSha256 = hash(toolchainBytes);
        await writeFile(ownershipPath, json(ownership));
      }
      receipt.status = "PASS";
    }
  } catch (error) {
    stop(receipt.stopReason ?? "failure");
    if (phase !== "finalize") {
      try { await transfer("evidence"); }
      catch (exportError) { receipt.cleanupErrors.push(`Evidence export: ${String(exportError)}`); }
    }
    cleanup();
    receipt.status = "FAIL";
    receipt.error = String(error?.stack ?? error);
    throw error;
  } finally {
    clearTimeout(timer);
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
    if (receipt.cleanupErrors.length && receipt.status === "PASS") receipt.status = "FAIL";
    await writeFile(receiptPath, json(receipt));
  }
}
