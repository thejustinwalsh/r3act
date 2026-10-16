export function assertExecutedResponseHashes(expectedResponses, responses) {
  for (const [name, expected] of expectedResponses) {
    const matched = responses.filter((item) => item.path === name);
    if (matched.length !== 1) throw Error(`executed response absent/duplicated: ${name}`);
    if (matched[0].status !== 200) throw Error(`executed response HTTP ${matched[0].status}: ${name}`);
    if (matched[0].sha256 !== expected) throw Error(`executed response hash drift: ${name}`);
  }
}
