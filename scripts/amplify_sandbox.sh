#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

IDENTIFIER="${AMPLIFY_SANDBOX_IDENTIFIER:-${USER:-sandbox}}"
STACK_PREFIX="amplify-marsgreenhouse-${IDENTIFIER}-sandbox-"

run_sandbox() {
  npx ampx sandbox --outputs-out-dir . "$@"
}

find_latest_stack() {
  aws cloudformation list-stacks \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE \
    --query "sort_by(StackSummaries[?starts_with(StackName, \`${STACK_PREFIX}\`)], &CreationTime)[-1].StackName" \
    --output text 2>/dev/null
}

recover_outputs() {
  local stack_name
  stack_name="$(find_latest_stack || true)"

  if [[ -z "${stack_name}" || "${stack_name}" == "None" ]]; then
    return 1
  fi

  echo
  echo "Amplify sandbox deploy appears to have completed, but client output generation failed."
  echo "Recovering outputs from stack: ${stack_name}"

  npx ampx generate outputs --stack "${stack_name}" --out-dir .
}

if run_sandbox "$@"; then
  exit 0
fi

echo
echo "Amplify sandbox exited with an error. Checking whether the stack still deployed successfully..."

if recover_outputs; then
  echo
  echo "Recovered amplify_outputs.json from the deployed sandbox stack."
  exit 0
fi

echo
echo "Sandbox recovery was not possible. Please inspect the CloudFormation stack events for details."
exit 1
