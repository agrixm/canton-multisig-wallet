#!/usr/bin/env bash

# Helper script to bootstrap a new multisig wallet via the Canton JSON API.
#
# It creates a Wallet.Wallet contract with the specified custodian, signatories,
# and signature threshold.

set -euo pipefail

# --- Configuration ---
DEFAULT_LEDGER_HOST="localhost"
DEFAULT_LEDGER_PORT="7575"

# --- Functions ---

# Displays usage information and exits.
usage() {
    cat << EOF
Usage: $0 -c <custodian> -t <threshold> -s <signatory1> [-s <signatory2> ...]

Creates a new m-of-n multisig wallet on a Canton ledger. The JWT for the custodian
must be provided via the LEDGER_JWT environment variable.

Required Arguments:
  -c, --custodian <party>     The party that custodies the wallet and can create proposals.
  -t, --threshold <m>         The number of required signatures (the 'm' in m-of-n).
  -s, --signatory <party>     A signatory party (an 'n'). Specify this option multiple
                              times for multiple signatories.

Optional Arguments:
  -i, --id <wallet_id>        A unique text identifier for the wallet (default: random UUID).
  -h, --host <hostname>       Ledger JSON API hostname (default: $DEFAULT_LEDGER_HOST).
  -p, --port <port>           Ledger JSON API port (default: $DEFAULT_LEDGER_PORT).
  --help                      Display this help message and exit.

Example:
  export LEDGER_JWT=<custodian's_jwt>
  ./scripts/create-wallet.sh \\
    -c "Custodian::1220..." \\
    -t 2 \\
    -s "Signatory1::1220..." \\
    -s "Signatory2::1220..." \\
    -s "Signatory3::1220..."
EOF
    exit 1
}

# --- Argument Parsing ---

# Variables to hold parsed arguments
CUSTODIAN=""
THRESHOLD=0
SIGNATORIES=()
WALLET_ID=$(uuidgen)
LEDGER_HOST="$DEFAULT_LEDGER_HOST"
LEDGER_PORT="$DEFAULT_LEDGER_PORT"

# Use getopt for robust argument parsing, supporting both short and long options.
TEMP=$(getopt -o c:t:s:i:h:p: --long custodian:,threshold:,signatory:,id:,host:,port:,help -n "$0" -- "$@")
if [ $? != 0 ]; then echo "Terminating..." >&2; exit 1; fi
eval set -- "$TEMP"

while true; do
  case "$1" in
    -c | --custodian ) CUSTODIAN="$2"; shift 2 ;;
    -t | --threshold ) THRESHOLD="$2"; shift 2 ;;
    -s | --signatory ) SIGNATORIES+=("$2"); shift 2 ;;
    -i | --id )        WALLET_ID="$2"; shift 2 ;;
    -h | --host )      LEDGER_HOST="$2"; shift 2 ;;
    -p | --port )      LEDGER_PORT="$2"; shift 2 ;;
    --help )           usage ;;
    -- )               shift; break ;;
    * )                break ;;
  esac
done

# --- Input Validation ---

# Check for required arguments
if [ -z "$CUSTODIAN" ] || [ "$THRESHOLD" -eq 0 ] || [ ${#SIGNATORIES[@]} -eq 0 ]; then
    echo "Error: Missing required arguments: --custodian, --threshold, and at least one --signatory are required." >&2
    usage
fi

# Check for JWT in environment variable
if [ -z "${LEDGER_JWT:-}" ]; then
    echo "Error: The LEDGER_JWT environment variable is not set." >&2
    echo "Please set it to the JWT of the custodian party ($CUSTODIAN)." >&2
    exit 1
fi

# Validate threshold
NUM_SIGNATORIES=${#SIGNATORIES[@]}
if ! [[ "$THRESHOLD" =~ ^[0-9]+$ ]] || [ "$THRESHOLD" -le 0 ]; then
    echo "Error: Threshold must be a positive integer." >&2
    exit 1
fi
if [ "$THRESHOLD" -gt "$NUM_SIGNATORIES" ]; then
    echo "Error: Threshold ($THRESHOLD) cannot be greater than the number of signatories ($NUM_SIGNATORIES)." >&2
    exit 1
fi

# Check for dependencies
if ! command -v curl &> /dev/null; then
    echo "Error: 'curl' is not installed. Please install it to continue." >&2
    exit 1
fi
if ! command -v jq &> /dev/null; then
    echo "Warning: 'jq' is not installed. JSON output will not be pretty-printed." >&2
fi


# --- Main Logic ---

echo "▶️  Creating ${THRESHOLD}-of-${NUM_SIGNATORIES} multisig wallet..."
echo "  ID:          $WALLET_ID"
echo "  Custodian:   $CUSTODIAN"
echo "  Signatories: ${SIGNATORIES[*]}"
echo "  Ledger:      http://${LEDGER_HOST}:${LEDGER_PORT}"
echo

# Prepare signatories JSON array
SIGNATORIES_JSON=$(printf '%s\n' "${SIGNATORIES[@]}" | jq -R . | jq -s .)

# Construct the JSON payload for the create command
PAYLOAD=$(cat <<EOF
{
  "templateId": "Wallet:Wallet",
  "payload": {
    "id": "$WALLET_ID",
    "custodian": "$CUSTODIAN",
    "signatories": $SIGNATORIES_JSON,
    "threshold": $THRESHOLD
  }
}
EOF
)

# Use a variable for the pipe command to handle jq's presence gracefully
PIPE_CMD="cat"
if command -v jq &> /dev/null; then
    PIPE_CMD="jq"
fi

API_URL="http://${LEDGER_HOST}:${LEDGER_PORT}/v1/create"

# Send the request to the JSON API and capture the response
# We capture HTTP status code separately to check for non-2xx responses.
HTTP_STATUS=$(curl --silent --show-error -X POST "$API_URL" \
    --write-out "%{http_code}" --output >(tee /dev/stderr) \
    -H "Authorization: Bearer $LEDGER_JWT" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

# Check response and print result
if [[ "$HTTP_STATUS" -eq 200 ]]; then
    echo
    echo "✅ Success! Wallet created."
else
    echo
    echo "❌ Error: Failed to create wallet. Ledger returned HTTP status $HTTP_STATUS." >&2
    exit 1
fi