# Package Index Contract (`.flow-spec-<stage>.json`)

The supervisor reads this file, then recomputes every path, hash and byte range from the actual files. Unknown fields grant nothing. A mismatch blocks review, so compute the index after the documents are final.

## Shape (`schemaVersion: 1`)

| Member | Required content |
| --- | --- |
| `schemaVersion` | The number `1`. |
| `stage` | `prd`, `tech_spec` or `tasks`, matching the file name. |
| `documents[]` | `path`, `role`, `sha256`, `sourceBytes` for every document you wrote in this stage (the index itself is excluded). |
| `upstream[]` | `{ packageId, manifestHash, stage }` for each approved upstream package, copied from the run prompt. |
| `stories[]` | `id`, `title`, `source`, `acceptance[]`, `edges[]`; empty on the TechSpec-only route. |
| `tests[]` | `id`, `tier` (`task-required`, `feature-gate`, `qa-release`), `source`, `references[]`, and `ownerTaskId` or `gateOwner` (only the applicable one). |
| `tasks[]` | `id`, `title`, `path`, `dependsOn[]`, `testIds[]`, `scope`, `acceptance` (Tasks stage only). |
| `decisions[]` | `id`, `severity` (`blocking` or `observation`), `status` (`open` or `resolved`), `source`, optional `resolutionInteractionId`. A resolved decision names its recorded answer or a documented rationale. |

## Source reference

`{ documentPath, startByte, endByte, sourceHash }`

- Offsets are UTF-8 byte offsets into the exact file, `startByte` inclusive and `endByte` exclusive, on character boundaries.
- `sourceHash` is the lowercase hex SHA-256 of `bytes[startByte:endByte]`.
- Generate references with `node shared/scripts/source-ref.mjs <file> <startMarker> [endMarker]`; it prints the JSON object.

## Validation the supervisor applies

IDs are unique and every referenced ID exists. Every task-required test has exactly one owner task; every other test has one gate owner. Task dependencies exist and have no cycles. Decisions that are `blocking` and `open` prevent approval. Titles and IDs must match the documents.
