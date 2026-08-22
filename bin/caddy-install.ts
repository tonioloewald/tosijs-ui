#!/usr/bin/env bun
/*
Install the Caddy snippets `tosijs-deploy` / `tosijs-tunnel` depend on.

  tosijs-caddy-install                      # DRY RUN — shows the diff, changes nothing
  tosijs-caddy-install --go                 # substitute, validate, install, reload
  tosijs-caddy-install --host=me@1.2.3.4 --go
  tosijs-caddy-install --template=./my-Caddyfile --go

Both deploy bins write a fragment ending in `import preview_site` / `import tunnel_site`,
and those snippets have to exist on the box first — otherwise `caddy validate` fails on
every deploy forever, per project, and nothing routes.

This existed only as an inline `package.json` script in the tosijs-ui repo, so adopters got
the template and the warning but not the tool. That is the wrong half to keep private: the
template is inert text, while the VALUE here is the refusal to install it with placeholders
intact. Installing `{{ACME_EMAIL}}` and `__PREVIEW_TOKEN__` verbatim gives you a preview host
whose invite gate is a literal string published in a public repo, issuing certificates under
someone else's Let's Encrypt account. A hand-rolled `sed` pipeline has no such guard.

Three deliberate properties:

  DRY RUN BY DEFAULT. This replaces `/etc/caddy/Caddyfile` wholesale. If the box serves
  anything else through Caddy, that is destructive — so the dry run prints a diff against
  the live file and you get to look at it before `--go`.

  THE SECRET NEVER LEAVES THE BOX. Substitution happens remotely, reading
  `/etc/caddy/preview.env`. `PREVIEW_TOKEN` is never transmitted, never appears in argv on
  this machine, and is redacted out of the diff before it is printed.

  VALIDATE BEFORE SWAP. `caddy fmt` then `caddy validate` run against a scratch file; the
  live config is replaced by an atomic `mv` only once it is known to parse. A rejected
  config leaves the running site untouched.
*/

import { existsSync, readFileSync } from 'fs'
import { resolvePreviewHost, resolveSiteConfig } from './resolve-site-config'

const siteConfig = await resolveSiteConfig()

const args = process.argv.slice(2)
const flag = (name: string): string | undefined => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
const has = (name: string): boolean => args.includes(`--${name}`)

/*
Reject anything we do not understand, BEFORE reaching the network.

An unrecognised flag used to be ignored, so `--status` — which this bin has never had — read
as "no flags at all" and the bin went straight on to ssh into the configured host. A tool
that contacts someone's server must not treat an unknown instruction as consent to proceed.
*/
const KNOWN = ['--go', '--help']
const unknown = args.filter(
  (a) => !KNOWN.includes(a) && !/^--(host|template)=/.test(a)
)
if (unknown.length || has('help')) {
  const bad = unknown.length
  console.error(
    (bad ? `\nUnknown option(s): ${unknown.join(' ')}\n` : '') +
      `\ntosijs-caddy-install — install the Caddy snippets the deploy/tunnel bins need\n\n` +
      `  tosijs-caddy-install                 DRY RUN — shows the diff, changes nothing\n` +
      `  tosijs-caddy-install --go            substitute, validate, install, reload\n` +
      `  --host=user@box                      override the configured preview host\n` +
      `  --template=./path/to/Caddyfile       use your own template\n`
  )
  process.exit(bad ? 1 : 0)
}

const host = resolvePreviewHost(flag('host'), siteConfig.preview?.host)
const go = has('go')

if (!host) {
  console.error(
    `\nNo preview host.\n\n` +
      `  Put it where machine-local credentials live — a 700 directory beside the\n` +
      `  repos, so it cannot be committed:\n` +
      `      echo 'PREVIEW_HOST=user@example.com' >> ~/local-secrets/tosijs-preview.env\n` +
      `      # and source that file from ~/.zshenv, so scripts and agents see it too\n\n` +
      `  ...or pass it per-run:\n` +
      `      tosijs-caddy-install --host=user@example.com --go\n` +
      `      PREVIEW_HOST=user@example.com tosijs-caddy-install\n`
  )
  process.exit(1)
}

/*
The template ships inside the package, so the default is resolved relative to THIS file
rather than to the cwd — an adopter runs the bin from their own project, where `deploy/` is
their business and not ours.
*/
const templatePath =
  flag('template') ?? new URL('../deploy/Caddyfile', import.meta.url).pathname

if (!existsSync(templatePath)) {
  console.error(
    `\nNo Caddyfile template at ${templatePath}\n\n` +
      `  The package ships one at node_modules/tosijs-ui/deploy/Caddyfile.\n` +
      `  Pass your own with --template=./path/to/Caddyfile\n`
  )
  process.exit(1)
}

const template = readFileSync(templatePath, 'utf8')

// The template is delivered inside a quoted heredoc, so it is copied verbatim with no shell
// expansion. A template containing the delimiter would truncate the file silently — refuse
// rather than install something that is not what was read.
const EOF_MARKER = 'TOSIJS_CADDY_TEMPLATE_EOF'
if (template.split('\n').some((line) => line.trim() === EOF_MARKER)) {
  console.error(
    `\nTemplate contains the line \`${EOF_MARKER}\`, which is used as the transfer\n` +
      `delimiter. Rename that line in ${templatePath}.\n`
  )
  process.exit(1)
}

const remoteScript = `set -euo pipefail
umask 077
cat > /etc/caddy/Caddyfile.tpl <<'${EOF_MARKER}'
${template}
${EOF_MARKER}

if [ ! -f /etc/caddy/preview.env ]; then
  echo "No /etc/caddy/preview.env on this box." >&2
  echo "Create it with PREVIEW_TOKEN=, ACME_EMAIL= and PREVIEW_DOMAIN=." >&2
  exit 1
fi
set -a; . /etc/caddy/preview.env; set +a
: "\${PREVIEW_TOKEN:?set PREVIEW_TOKEN in /etc/caddy/preview.env}"
: "\${ACME_EMAIL:?set ACME_EMAIL in /etc/caddy/preview.env}"
: "\${PREVIEW_DOMAIN:?set PREVIEW_DOMAIN in /etc/caddy/preview.env}"

sed -e "s|__PREVIEW_TOKEN__|\$PREVIEW_TOKEN|g" \\
    -e "s|{{ACME_EMAIL}}|\$ACME_EMAIL|g" \\
    -e "s|{{PREVIEW_DOMAIN}}|\$PREVIEW_DOMAIN|g" \\
    /etc/caddy/Caddyfile.tpl > /etc/caddy/Caddyfile.new

if grep -qE '\\{\\{|__PREVIEW_TOKEN__' /etc/caddy/Caddyfile.new; then
  echo "Unsubstituted placeholders remain — refusing to install:" >&2
  grep -nE '\\{\\{|__PREVIEW_TOKEN__' /etc/caddy/Caddyfile.new >&2
  rm -f /etc/caddy/Caddyfile.new
  exit 1
fi

caddy fmt --overwrite /etc/caddy/Caddyfile.new
caddy validate --config /etc/caddy/Caddyfile.new

if [ "${go ? '1' : '0'}" = "1" ]; then
  # Keep the outgoing config. This replaces a file that may be serving OTHER sites, and
  # "validated" only means it parses — it does not mean it is the config you wanted.
  if [ -f /etc/caddy/Caddyfile ]; then
    cp -p /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
  fi
  mv /etc/caddy/Caddyfile.new /etc/caddy/Caddyfile
  systemctl reload caddy
  echo "Installed /etc/caddy/Caddyfile and reloaded caddy."
  echo "Previous config saved as /etc/caddy/Caddyfile.bak"
else
  echo "--- would change /etc/caddy/Caddyfile (token redacted) ---"
  if [ -f /etc/caddy/Caddyfile ]; then
    diff -u /etc/caddy/Caddyfile /etc/caddy/Caddyfile.new \\
      | sed "s|\$PREVIEW_TOKEN|***REDACTED***|g" || true
  else
    echo "(no existing /etc/caddy/Caddyfile — this would create it)"
  fi
  rm -f /etc/caddy/Caddyfile.new
  echo "--- dry run: nothing changed. Re-run with --go to install. ---"
fi`

console.log(
  `${
    go ? 'Installing' : 'Checking'
  } Caddy config on ${host} from ${templatePath}\n`
)

// The script goes over stdin rather than as an argv string: it contains the template
// verbatim, and quoting an arbitrary file through a shell argument is a bug waiting to
// happen.
const proc = Bun.spawn(['ssh', host, 'bash', '-s'], {
  stdin: new TextEncoder().encode(remoteScript),
  stdout: 'inherit',
  stderr: 'inherit',
})
const exitCode = await proc.exited

if (exitCode !== 0) {
  console.error(`\nFailed (exit ${exitCode}). Nothing was installed.\n`)
  process.exit(exitCode)
}

if (!go) {
  console.log(
    `\nNext: re-run with --go once the diff above looks right.\n` +
      `Then \`tosijs-deploy --go\` and \`tosijs-tunnel\` will validate.\n`
  )
}
