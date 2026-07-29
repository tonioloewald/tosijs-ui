# Remote Access Plan

The idea here is to make it easy to access dev servers on any tosijs-ui build system project remotely.

Here is the updated implementation plan, with the infrastructure layer strictly mapped to UpCloud's architecture.

1. **UpCloud Infrastructure and DNS:** Remote routing layer.
First, establish the independent routing layer on UpCloud's Helsinki infrastructure to minimize latency and bypass the hyperscalers.
2. Deploy a €3/month Developer instance on UpCloud (Helsinki zone). This plan provides a dedicated IPv4 address, 1 GB RAM, and zero-cost egress, which is critical for Hot Module Replacement / fast reloads over the tunnel. Select a minimal OS like Debian or Ubuntu.
3. In your domain registrar, create a wildcard A-record (e.g., `*.dev.yourdomain.com`) pointing to the static IPv4 address of your UpCloud server.
4. Ensure your UpCloud firewall configuration allows inbound connections on ports `80`, `443` (web traffic), and `2222` (the SSH tunnel multiplexer).
5. **Deploy the Multiplexer (sish):** VPS configuration.
You will run `sish` on the UpCloud server to handle the routing and automatic Let's Encrypt TLS certificates. SSH into your UpCloud instance and deploy it using Docker.

You need to mount a directory for your public keys so `sish` can authenticate your Mac's SSH tunnel connection without requiring a password, and a directory for private keys so the server's SSH identity persists across reboots.

```bash
# Create the necessary directories on the UpCloud VPS
mkdir -p ~/sish/pubkeys ~/sish/keys

# Add your Mac's public key (e.g., from ~/.ssh/id_ed25519.pub) into a file in this directory
echo "ssh-ed25519 AAAAC3... your-mac-key" > ~/sish/pubkeys/mac.pub

# Deploy sish via Docker
docker run -itd --name sish \
  -v ~/sish/pubkeys:/pubkeys \
  -v ~/sish/keys:/keys \
  --net=host antoniomika/sish:latest \
  --ssh-address=:2222 \
  --http-address=:80 \
  --https-address=:443 \
  --https=true \
  --https-ondemand-certificate \
  --https-ondemand-certificate-accept-terms \
  --domain=dev.yourdomain.com \
  --authentication=true \
  --authentication-keys-directory=/pubkeys \
  --private-keys-directory=/keys


```

This single container will now listen for incoming SSH tunnels on port 2222, and route incoming HTTP/HTTPS traffic on ports 80/443 to the appropriate tunnel securely.

3. **Implement Ephemeral Auth:** tosijs-ui Dev Server.
Next, modify the local Node dev server in `tosijs-ui` on your Mac. It needs to generate a secure, single-use password at startup when the remote flag is passed, and mount HTTP Basic Auth middleware in front of your routes to protect your unauthenticated dev environment.

```javascript
import crypto from 'crypto';

let sessionPassword = null;

if (flags.remote) {
  // Generate a high-entropy 8-character hex string
  sessionPassword = crypto.randomBytes(4).toString('hex');
  console.log(`\n🌐 Remote Access Enabled`);
  console.log(`URL:  https://${flags.remote}.dev.yourdomain.com`);
  console.log(`User: dev`);
  console.log(`Pass: ${sessionPassword}\n`);
}

// Standard dev server middleware (Express/Connect pattern)
app.use((req, res, next) => {
  if (!flags.remote) return next();
  
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [user, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (user === 'dev' && password === sessionPassword) {
    return next();
  }
  
  res.setHeader('WWW-Authenticate', 'Basic realm="tosijs-ui dev environment"');
  res.statusCode = 401;
  res.end('Authentication required.');
});


```

4. **Automate the SSH Tunnel:** tosijs-ui CLI.
Finally, wire the SSH tunnel directly into the `tosijs-ui` build process so it spawns automatically and dies exactly when the local dev server stops. Ensure you target your base domain rather than the raw IP address to prevent SSH host key errors.

```javascript
import { spawn } from 'child_process';

// Start your local server first...
// app.listen(localPort, ...)

if (flags.remote) {
  // The -R argument dictates: reverse tunnel from <subdomain>:80 to localhost:<localPort>
  const tunnel = spawn('ssh', [
    '-p', '2222',
    '-R', `${flags.remote}:80:localhost:${localPort}`,
    'dev.yourdomain.com' // Target the domain, not the raw UpCloud IP
  ], { 
    stdio: 'inherit' 
  });

  // Ensure the tunnel dies if the local dev server crashes or is manually killed via Ctrl+C
  process.on('exit', () => tunnel.kill());
  process.on('SIGINT', () => {
    tunnel.kill();
    process.exit();
  });
}


```

# Will this work with Haltija?

> I asked Gemini this as a followup, and the response follows.

Yes, it will work cleanly with Haltija, but there is one specific friction point regarding **Basic Auth** to keep in mind depending on where Haltija is executing.

### 1. Basic Auth Handling in Agent Navigation

If Haltija is targeting the public URL (`[https://app.dev.yourdomain.com](https://app.dev.yourdomain.com)`), it will encounter the 401 challenge from your `tosijs-ui` dev server.

* **URL Credentials:** Modern browser engines (Chromium/WebKit) frequently block top-level navigations using embedded credentials in the URL structure (`[https://dev:pass@app.dev.yourdomain.com](https://dev:pass@app.dev.yourdomain.com)`) for security reasons.
* **Header / Context Auth:** To navigate seamlessly over the tunnel, Haltija's underlying browser context/network stack should be configured to handle the Basic Auth challenge via HTTP headers (`Authorization: Basic ...`) or through context-level network credentials rather than relying on inline URL formatting.

### 2. Local Execution Bypass

If Haltija is running locally on your Mac alongside `tosijs-ui`, you don't need to route it through the tunnel at all. Having Haltija target `http://localhost:<port>` directly bypasses the ephemeral password challenge, avoids network round-trips to the UpCloud VPS, and isolates tunnel traffic strictly for human/external review.

### 3. Protocol Compatibility (TLS & WebSockets)

* **Trusted Certificates:** Because `sish` provisions genuine Let's Encrypt certificates on-demand, Haltija's underlying engine won't throw TLS errors or require disabling SSL verification flags.
* **WebSocket Upgrades:** If Haltija uses WebSockets for real-time DOM monitoring, event streaming, or remote inspection, `sish` passes `Upgrade` headers through the SSH tunnel without dropping connection state.