const profileNode = document.querySelector<HTMLElement>("#phase-profile")!;
const params = new URLSearchParams(location.search);

if (params.get("diagnostics") !== "1") {
  profileNode.textContent =
    "Add diagnostics=1 to the URL to display instrumented runtime phase timings.";
} else {
  const readProfile = () =>
    (window as typeof window & { __structuralProfileV1?: unknown })
      .__structuralProfileV1;
  const timer = window.setInterval(() => {
    const profile = readProfile();
    if (profile === undefined) return;
    profileNode.textContent = JSON.stringify(profile, null, 2);
    window.clearInterval(timer);
    void fetch("/__benchmark/save-component-state-structural-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    }).then(async (response) => {
      const responseText = await response.text();
      let saved: { filename?: string; error?: string };
      try {
        saved = JSON.parse(responseText);
      } catch {
        saved = { error: responseText };
      }
      profileNode.textContent += response.ok
        ? `\n\nArchived: ${saved.filename}`
        : `\n\nArchive failed: ${saved.error ?? response.status}`;
    }).catch((error: unknown) => {
      profileNode.textContent += `\n\nArchive failed: ${String(error)}`;
    });
  }, 100);
}
