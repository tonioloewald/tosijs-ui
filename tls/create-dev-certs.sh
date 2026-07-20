#!/usr/bin/env bash
#
# Generate a locally-trusted dev certificate using mkcert.
#
# Unlike a bare self-signed cert, mkcert installs a local CA into the system
# (and Firefox/Chrome) trust stores, so browsers show NO warnings. Run once;
# re-run to regenerate or to add hostnames.
#
# Outputs ./tls/key.pem and ./tls/certificate.pem in the current project — the
# files the dev server loads. Works run from this repo (`bun tls`) or from an
# adopter's project (`bunx tosijs-dev-certs`).

set -euo pipefail

# Write into ./tls/ relative to where it was invoked (the project root the dev
# server runs from), creating it if needed.
mkdir -p tls
cd tls

# Never run mkcert as root. mkcert installs its CA into the *current user's*
# browser trust stores (Firefox/Chrome NSS); under sudo it installs root's CA
# instead, so the cert it issues is signed by a CA your browser doesn't trust —
# and you still get warnings. Run as your normal user; mkcert prompts for sudo
# itself when (and only when) it needs the system trust store.
if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  echo "Don't run this with sudo — run it as your normal user."
  echo "mkcert will ask for your password itself when it needs elevated access,"
  echo "and it must install its CA into YOUR browser's trust store, not root's."
  exit 1
fi

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert is not installed."
  echo
  if [[ "$(uname)" == "Darwin" ]]; then
    echo "  Install it with Homebrew:"
    echo "    brew install mkcert"
    echo "    brew install nss        # only needed if you use Firefox"
  else
    echo "  Install it (Linux):"
    echo "    sudo apt install libnss3-tools"
    echo "    curl -JLO 'https://dl.filippo.io/mkcert/latest?for=linux/amd64'"
    echo "    chmod +x mkcert-v*-linux-amd64 && sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert"
  fi
  echo
  echo "Then re-run the certs command (bun tls, or bunx tosijs-dev-certs)."
  exit 1
fi

# Trust the local CA (idempotent — safe to run every time).
mkcert -install

# Bonjour/mDNS name of this machine, so the same cert works when another device
# on the LAN hits https://<name>.local:8787. On macOS the advertised name is the
# LocalHostName (`scutil --get LocalHostName`), e.g. "Persiflex" → persiflex.local.
#
# Hardened: lowercase it (the mDNS convention, and dodges any case-sensitive
# client), strip a `.local` the source may already carry (no `foo.local.local`),
# and only add it when we actually have a usable name — so a machine with no
# LocalHostName never gets a bare ".local" SAN.
if [[ "$(uname)" == "Darwin" ]]; then
  MDNS="$(scutil --get LocalHostName 2>/dev/null || true)"
  [[ -z "$MDNS" ]] && MDNS="$(hostname -s 2>/dev/null || true)"
else
  MDNS="$(hostname -s 2>/dev/null || true)"
fi
MDNS="$(printf '%s' "$MDNS" | tr '[:upper:]' '[:lower:]' | sed -E 's/\.local$//')"

NAMES=(localhost 127.0.0.1 ::1)
LOCAL_NAME=""
if [[ -n "$MDNS" && "$MDNS" != "localhost" ]]; then
  LOCAL_NAME="${MDNS}.local"
  NAMES+=("$LOCAL_NAME")
fi

mkcert -key-file key.pem -cert-file certificate.pem "${NAMES[@]}"

echo
echo "Wrote tls/key.pem and tls/certificate.pem"
echo "Valid for: ${NAMES[*]}"
if [[ -z "$LOCAL_NAME" ]]; then
  echo "(No Bonjour/.local name detected — set one in System Settings > Sharing"
  echo " > Local hostname, then re-run to cover https://<name>.local.)"
fi
echo
echo "Local browsers: no warnings."
echo "Other devices (phone, another laptop): copy the CA root to each and trust it —"
echo "  CA file lives in: $(mkcert -CAROOT)/rootCA.pem"
