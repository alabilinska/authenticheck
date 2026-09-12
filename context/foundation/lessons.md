# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Pin the API contract before the agent writes the first endpoint

- **Context**: any API route or shared type that defines a response contract (src/pages/api/**, src/types.ts)
- **Problem**: Without an explicit contract in CLAUDE.md the agent invents one and codifies it as a shared type — in the 2026-09-12 calibration 3/3 runs wrote `ApiErrorDto { error: string, issues? }` into src/types.ts labelled "shared by all JSON API routes"; the next endpoint would inherit it.
- **Rule**: Before an agent writes the first endpoint of any new API surface, pin the response and error contract in CLAUDE.md; when reviewing, treat a new "shared" DTO in src/types.ts that was not requested as a contract the agent invented.
- **Applies to**: plan, implement, impl-review
