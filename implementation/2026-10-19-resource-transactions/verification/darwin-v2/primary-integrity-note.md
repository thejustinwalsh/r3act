# Primary archive-scope clarification

The authoritative Darwin-v2 runner inventory contains **844** inputs, as recorded in source-before.json and source-after.json. They match each other and the pre-execution archive. The verification summary incorrectly calls the broader preflight count of 2,314 the runner selection; it is not the runner selection.

The source-v2 manifest contains 2,322 files: those 844 runner inputs plus 1,478 extra files. The extras comprise 757 prior Linux evidence-docker-v2 files, 709 prior evidence-docker-v1 files, four image-docker-v1 files and eight context/document files. The preflight walker used a broader exclusion scope than the actual runner. These extra historical bytes were archived, not executed as current verification inputs. They do not enlarge the gate's verification scope.

The original summary, preflight audit, source archive and manifest remain unchanged. This note corrects scope wording; it does not relabel the failed gate or alter its results. Future source archives should reproduce the runner's exclusions and preserve selected current inputs plus explicitly named context files without duplicating unrelated frozen evidence.
