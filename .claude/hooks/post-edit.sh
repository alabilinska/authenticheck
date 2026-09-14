#!/usr/bin/env bash
# PostToolUse (Write|Edit) quality hook — 10xDevs m3l3.
# Per edit: eslint --fix on the edited source file; for files in the risk areas of
# context/foundation/test-plan.md (rule engine, knowledge file, list/report mapping, wizard)
# also the tests related to it. Exit 2 sends stderr back to the agent so it fixes the problem
# in its next step; anything that is not a real finding exits 0 and stays silent.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0

root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0
rel=${file#"$root"/}

problems=""
nl=$'\n'

case "$rel" in
  src/*.ts | src/*.tsx | src/*.astro)
    if ! out=$(npx eslint --fix "$rel" 2>&1); then
      problems+="eslint --fix $rel:${nl}${out}${nl}"
    fi
    ;;
esac

cmd=()
case "$rel" in
  src/lib/services/tag-validation/* | src/lib/services/verifications*.ts | src/components/verification/* | src/data/balenciaga-classic-city/*)
    cmd=(npx vitest related "$rel" --run --passWithNoTests)
    ;;
  balenciaga-city-tag-rules.md)
    # The document is read with readFileSync, not imported, so `vitest related` cannot find its guard.
    cmd=(npx vitest run src/lib/services/tag-validation/knowledge.test.ts)
    ;;
esac
if [ ${#cmd[@]} -gt 0 ]; then
  if ! out=$("${cmd[@]}" 2>&1); then
    problems+="${cmd[*]}:${nl}$(printf '%s\n' "$out" | tail -40)${nl}"
  fi
fi

if [ -n "$problems" ]; then
  printf 'Post-edit check failed for %s — fix it before continuing:\n%s' "$rel" "$problems" >&2
  exit 2
fi
exit 0
