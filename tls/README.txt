# Dev TLS certificates

The HTTPS dev server (bin/dev.ts) loads ./key.pem and ./certificate.pem.
The dev server generates them automatically on first launch if they are
missing; you can also generate them by hand.

They are produced with mkcert, which installs a locally-trusted CA so browsers
show NO certificate warnings (a bare self-signed cert always warns):

    bun tls          # runs tls/create-dev-certs.sh

The script installs the local CA (mkcert -install) and issues a cert valid
for localhost, 127.0.0.1, ::1, and this machine's <hostname>.local name.

## Installing mkcert

macOS:
    brew install mkcert
    brew install nss        # only needed if you use Firefox

Linux:
    sudo apt install libnss3-tools
    curl -JLO 'https://dl.filippo.io/mkcert/latest?for=linux/amd64'
    chmod +x mkcert-v*-linux-amd64
    sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

## Other devices on the LAN (phone, another laptop)

The cert covers <hostname>.local, but each device must also trust the CA.
Copy the CA root to the device and trust it:

    mkcert -CAROOT          # prints the dir containing rootCA.pem

Copy only rootCA.pem (NOT rootCA-key.pem — that key can mint trusted certs
for any site). The .pem files and CA are per-machine and are gitignored.
