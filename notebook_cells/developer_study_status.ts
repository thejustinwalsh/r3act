{
  const studyRaw = JSON.parse(
    await Deno.readTextFile("results/developer-study-v1-raw.json"),
  );
  const studySummary = JSON.parse(
    await Deno.readTextFile("results/developer-study-v1-summary.json"),
  );
  if (
    studySummary.schemaVersion !== "developer-extension-study-v1-summary" ||
    studySummary.studyVersion !== studyRaw.studyVersion ||
    studySummary.participantsObserved !== studyRaw.participants.length
  ) throw new Error("Developer-study summary does not match its raw data");
  console.log("Developer feature-authoring/comprehension pilot");
  console.log({
    protocol: studySummary.studyVersion,
    participantsObserved: studySummary.participantsObserved,
    completeCrossovers: studySummary.completeCrossovers,
    analysisStatus: studySummary.analysisStatus,
    adapterCompilerExtensionTested: false,
  });
  console.table(Object.entries(studySummary.quantitativeGates).map(([gate, value]: [string, any]) => ({
    gate,
    status: value.status ?? value,
  })));
  console.log(studySummary.quantitativeGates.humanReview);
}
