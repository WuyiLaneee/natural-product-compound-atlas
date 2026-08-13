# Design QA — Local ingredient knowledge archive

**Reference visual:** selected option 3, `C:\Users\frdgh\.codex\generated_images\019fef84-aa74-72d3-9b14-9f9dfa380a17\exec-15342cd4-bfbd-4abe-93a0-36902e84729c.png`.

**Implementation checks:** desktop, lower-section and 390 px mobile captures were reviewed locally during QA.

## Comparison

- The selected visual's restrained green ribbon, white archival identity card, navy navigation band, pale canvas, thin divider system and split research-detail layout are carried through the ingredient route.
- The visual is reused as an information-dense ingredient dossier, rather than a generic compound record: identity/type, database source, functional factors, representative components, composition, research effects, mechanism clues and related literature are all visible.
- Related literature now follows the research-effects panel and presents verified records with journal/year, PMID or DOI, relationship labels, corresponding efficacy tags and direct source links. The former data-notes area has been removed.
- The targets-and-mechanisms panel is omitted when an ingredient has no actual mechanism clue beyond the generic absence marker.
- Every visible origin label on this route is `中国日化前沿靶点与植物化学数据库`; implementation wording such as local preset, source file and Word/DOCX is absent.

## Functional checks

- Exact `五味子` search returned `/ingredient/schisandra` before remote compound resolution.
- `POST /api/search` returned `status: ingredient` for `五味子`.
- Non-preset `姜黄素` returned the existing PubChem candidate-confirmation response (`status: ambiguous`, CID 969516).
- Desktop and 390 px mobile checks showed no console warnings/errors and no horizontal overflow. The mobile literature route retained a single main landmark and did not display the removed data-notes section.

## Validation

- `npm run typecheck`
- `npm run typecheck:pages`
- `npm run lint -- --quiet`
- `node --test tests/local-ingredients.test.mjs` (7 passing)
- `npm run build`
- `npm run build:pages`
- `git diff --check`

final result: passed
