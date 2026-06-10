#!/usr/bin/env bash
#
# Generate a locally-trusted dev certificate using mkcert.
#
# Unlike a bare self-signed cert, mkcert installs a local CA into the system
# (and Firefox/Chrome) trust stores, so browsers show NO warnings. Run once;
# re-run to regenerate or to add hostnames.
#
# Outputs ./key.pem and ./certificate.pem next to this script — the names the
# dev server (bin/dev.ts) loads.

set -euo pipefail

# Work in this script's own directory regardless of where it was invoked from.
cd "$(dirname "$0")"

# Never run mkcert as root. mkcert installs its CA into the *current user's*
# browser trust stores (Firefox/Chrome NSS); under sudo it installs root's CA
# instead, so the cert it issues is signed by a CA your browser doesn't trust —
# and you still get warnings. Run as your normal user; mkcert prompts for sudo
# itself when (and only when) it needs the system trust store.
if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  echo "Don't run this with sudo — run it as your normal user (e.g. 'bun tls')."
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
  echo "Then re-run: bun tls"
  exit 1
fi

# Trust the local CA (idempotent — safe to run every time).
mkcert -install

# Bonjour/mDNS name of this machine, so the same cert works when another
# device on the LAN hits https://<name>.local:8787.
if [[ "$(uname)" == "Darwin" ]]; then
  LOCAL_NAME="$(scutil --get LocalHostName 2>/dev/null || hostname -s).local"
else
  LOCAL_NAME="$(hostname -s).local"
fi

mkcert \
  -key-file key.pem \
  -cert-file certificate.pem \
  localhost 127.0.0.1 ::1 "$LOCAL_NAME"

echo
echo "Wrote tls/key.pem and tls/certificate.pem"
echo "Valid for: localhost, 127.0.0.1, ::1, $LOCAL_NAME"
echo
echo "Local browsers: no warnings."
echo "Other devices (phone, another laptop): copy the CA root to each and trust it —"
echo "  CA file lives in: $(mkcert -CAROOT)/rootCA.pem"
