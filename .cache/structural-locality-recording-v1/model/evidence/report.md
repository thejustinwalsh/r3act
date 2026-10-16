# Recording B model gate receipt

## Gate status

**Stopped at the first command because the exit-capture wrapper failed.** The pinned Node 24.18.0 schedule syntax-check command was invoked once. Node stdout and stderr files are empty, but the wrapper assigned to zsh's read-only special variable `status` and terminated with exit 1 (`zsh:1: read-only variable: status`). The Node process's own exit code was not captured, so this receipt does not claim that the syntax check passed or failed.

Per the stop-first-failure instruction, I did not retry this command and did not run either remaining syntax check or the synthetic model check. No build, server, browser, matrix, or runtime work was performed.

Exact attempted command:

```text
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/model/schedule.mjs
```

The wrapper failure and unavailable Node exit are recorded in `capture-wrapper-failure.json`; raw empty streams are `check-schedule.stdout.log` and `check-schedule.stderr.log`. No Node exit-code receipt was written.

## Preservation audit

Before the attempt, 644 files were hashed, including the model files and self-lock, both preserved prior attempts, context copies/provenance, original 413-input lock entries, v2 424-input lock entries, prior v2 runner/API/build/assets/synthetic receipts, v1 failure preservation files, and original 126 evidence files. The model self-lock matched `0f50718e3b6d86ba86784dc4fcc1193c4dcbbb34d5220b324ae60efd0078096f`. The after-audit found all 644 files unchanged and every expected source hash still matching. Full per-file records are in `before.json` and `after.json`.

The initial evidence audit command had a capture-preparation error: I used the nonexistent compiler path under `node_modules`. It stopped before writing `before.json` or invoking any gate. The corrected audit read the compiler from the prior build report's actual path and verified its pinned hash as part of the 644-file audit.

This task provides no validation of schedule/model semantics; that synthetic was not run.
