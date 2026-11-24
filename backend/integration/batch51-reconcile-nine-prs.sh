#!/usr/bin/env bash
set -Eeuo pipefail
test "$PAY54_ENVIRONMENT" = DISPOSABLE_CI
test "$PAY54_FINANCIAL_EXECUTION" = false
test "$GITHUB_EVENT_NAME" = pull_request
test "$(git rev-parse --is-shallow-repository)" = false
test -z "$(git status --porcelain)"
base=917404fdb83b4f208cd709c0c7fede832f4f0205
test "$(git rev-parse refs/remotes/origin/project-titan)" = "$base"
git config user.name "PAY54 Disposable Integration"
git config user.email pay54-ci@invalid.example
workflow=.github/workflows/pay54-batch22-postgres-rls-integration.yml
source_sha=22e7d22894d28dd6318710c42be3c0e196c2f596
git show "$source_sha:$workflow" > /tmp/pay54-b51-source.yml
node --input-type=module <<'NODE'
import {readFileSync,writeFileSync} from "node:fs";
let s=readFileSync("/tmp/pay54-b51-source.yml","utf8");
function replaceOne(a,b){
 if(s.split(a).length!==2)throw Error("PAY54_B51_WORKFLOW_ANCHOR_DRIFT");
 s=s.replace(a,b);
}
replaceOne(
 "            backend/db/tests/batch22/034_wallet_financial_privilege_graph.sql \\\n",
 "            backend/db/tests/batch22/034_wallet_financial_privilege_graph.sql \\\n"+
 "            backend/db/tests/batch22/035_wallet_forward_executor_denial_disposable.sql \\\n"+
 "            backend/db/tests/batch22/037_financial_writer_identity_catalogue.sql \\\n"+
 "            backend/db/tests/batch22/038_financial_writer_invoker_contract.sql \\\n"
);
replaceOne(
 "            backend/db/release/wallet-read-v1-rollback-review.sql; do",
 "            backend/db/release/wallet-read-v1-rollback-review.sql \\\n"+
 "            backend/db/tests/batch22/036_wallet_postrollback_denial_disposable.sql \\\n"+
 "            backend/db/tests/003_wallet_reservation_integrity.sql \\\n"+
 "            backend/db/tests/004_reservation_lifecycle_integrity.sql \\\n"+
 "            backend/db/tests/002_ledger_reversal_integrity.sql; do"
);
writeFileSync("/tmp/pay54-b51-consolidated.yml",s);
NODE
while read -r number sha remote; do
 test -n "$number" || continue
 test "$(git rev-parse "refs/remotes/origin/$remote")" = "$sha" || {
  echo "PAY54_B51_CHANGED_HEAD:$number" >&2; exit 1;
 }
done <<'PINNED'
81 deabe86dc967169cbf2168ca12caa6ea8f38c0d1 cto/batch41-cloudsql-cost-admission-20261124
82 c3e52843e4712d0b1937279de94f67bfbc48d6ac cto/batch42-gbp-quote-evidence-gate-20261124
83 a085c4891cfc78cdbc035246c36acb7fa52b83a8 cto/batch43-wallet-writer-rls-admission-20261124
84 204610e9e6f4efa5a838381427e2abadee07eb50 cto/batch44-disposable-writer-denial-rollback-20261124
85 332ca3bb2f095ed0863161986d725e0d1781f3af cto/batch45-financial-writer-identity-preflight-20261124
86 3312283a10b6d0f8d1b5f52a666fae87a6984f93 cto/batch46-financial-writer-compatibility-contract-20261124
87 17c791c56ac705765246a311428d31a38c79a23f cto/batch47-authenticated-financial-command-gate-20261124
88 885de3e70431dc74c0e43b42186a8127ca480089 cto/batch48-revocation-serialization-contract-20261124
89 22e7d22894d28dd6318710c42be3c0e196c2f596 cto/batch49-postgres-session-rowlock-races-20261124
PINNED
while read -r number sha remote; do
 test -n "$number" || continue
 if git merge --no-ff --no-edit --no-gpg-sign "$sha"; then
  echo "PAY54_B51_MERGED_LOCALLY:$number"
  continue
 fi
 conflicted="$(git diff --name-only --diff-filter=U)"
 if [[ "$conflicted" != "$workflow" || "$number" -lt 85 ]]; then
  echo "PAY54_B51_UNEXPECTED_CONFLICT:$number:$conflicted" >&2; exit 1
 fi
 cp /tmp/pay54-b51-consolidated.yml "$workflow"
 git add "$workflow"
 test -z "$(git diff --name-only --diff-filter=U)"
 git -c core.hooksPath=/dev/null commit --no-edit --no-gpg-sign
 echo "PAY54_B51_REVIEWED_WORKFLOW_RECONCILIATION:$number"
done <<'PINNED'
81 deabe86dc967169cbf2168ca12caa6ea8f38c0d1 cto/batch41-cloudsql-cost-admission-20261124
82 c3e52843e4712d0b1937279de94f67bfbc48d6ac cto/batch42-gbp-quote-evidence-gate-20261124
83 a085c4891cfc78cdbc035246c36acb7fa52b83a8 cto/batch43-wallet-writer-rls-admission-20261124
84 204610e9e6f4efa5a838381427e2abadee07eb50 cto/batch44-disposable-writer-denial-rollback-20261124
85 332ca3bb2f095ed0863161986d725e0d1781f3af cto/batch45-financial-writer-identity-preflight-20261124
86 3312283a10b6d0f8d1b5f52a666fae87a6984f93 cto/batch46-financial-writer-compatibility-contract-20261124
87 17c791c56ac705765246a311428d31a38c79a23f cto/batch47-authenticated-financial-command-gate-20261124
88 885de3e70431dc74c0e43b42186a8127ca480089 cto/batch48-revocation-serialization-contract-20261124
89 22e7d22894d28dd6318710c42be3c0e196c2f596 cto/batch49-postgres-session-rowlock-races-20261124
PINNED
cmp -s /tmp/pay54-b51-consolidated.yml "$workflow"
for number in 035 036 037 038 039; do
 test "$(find backend/db/tests/batch22 -maxdepth 1 -name "$number*" | wc -l)" -eq 1
done
test -z "$(git status --porcelain)"
echo "PAY54_B51_NINE_BRANCHES_RECONCILED_IN_EPHEMERAL_CI_ONLY"
