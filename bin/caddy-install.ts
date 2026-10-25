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

  THIS COMMAND NEVER CARRIES THE SECRETS. Substitution happens remotely, reading
  `/etc/caddy/preview.env`. `PREVIEW_TOKEN` and `PREVIEW_EDIT_TOKEN` are never transmitted by
  it, never appear in argv on this machine, and are redacted out of the diff before it is
  printed. (Global keys are a separate choice: to use them, you copy the same values into
  ~/local-secrets on the machines that run dev servers.)

  VALIDATE BEFORE SWAP. `caddy fmt` then `caddy validate` run against a scratch file; the
  live config is replaced by an atomic `mv` only once it is known to parse. A rejected
  config leaves the running site untouched.
*/

import { existsSync, readFileSync } from 'fs'
import {
  embedGatePage,
  parseArgv,
  resolvePreviewHost,
  resolveSiteConfig,
} from './resolve-site-config.ts'

const { has, flag } = parseArgv(process.argv.slice(2), {
  bin: 'tosijs-caddy-install',
  summary: 'install the Caddy snippets the deploy/tunnel bins need',
  flags: ['go'],
  values: ['host', 'template'],
  usage:
    `  tosijs-caddy-install                 DRY RUN — shows the diff, changes nothing\n` +
    `  tosijs-caddy-install --go            substitute, validate, install, reload\n` +
    `  --host=user@box                      override the configured preview host\n` +
    `  --template=./path/to/Caddyfile       use your own template`,
})

const siteConfig = await resolveSiteConfig()

const host = resolvePreviewHost(flag('host'), siteConfig.preview?.host)
const go = has('go')

if (!host) {
  console.error(
    `\nNo preview host.\n\n` +
      `  Put it where machine-local credentials live — a 700 directory beside the\n` +
      `  repos, so it cannot be committed:\n` +
      `      mkdir -p ~/local-secrets && chmod 700 ~/local-secrets\n` +
      `      echo 'PREVIEW_HOST=user@example.com' >> ~/local-secrets/tosijs-preview.env\n` +
      `      chmod 600 ~/local-secrets/tosijs-preview.env\n` +
      `      echo '[ -f ~/local-secrets/tosijs-preview.env ] && . ~/local-secrets/tosijs-preview.env' >> ~/.zshenv\n` +
      `      # ~/.zshenv, not ~/.zshrc — scripts and agents get no interactive profile\n\n` +
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

/*
`__GATE_PAGE__` is the page a browser without the preview cookie sees (deploy/gate-page.html,
with its box for a link or a code). It is not a secret, so it is embedded here rather than on the
box. A template of your own that names it gets the shipped page.
*/
const template = embedGatePage(
  readFileSync(templatePath, 'utf8'),
  readFileSync(
    new URL('../deploy/gate-page.html', import.meta.url).pathname,
    'utf8'
  )
)

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
# It goes into a sed replacement and into the gate's cookie regex, where \`.\` would loosen the
# match and \`|\` would break the substitution.
if ! printf '%s' "$PREVIEW_TOKEN" | grep -qE '^[A-Za-z0-9_-]+$'; then
  echo "PREVIEW_TOKEN may contain only letters, digits, - and _ — refusing to install." >&2
  exit 1
fi
: "\${ACME_EMAIL:?set ACME_EMAIL in /etc/caddy/preview.env}"
: "\${PREVIEW_DOMAIN:?set PREVIEW_DOMAIN in /etc/caddy/preview.env}"

# The global EDIT key is optional. Unset, the template still needs a value, so it gets one
# nobody knows and the edit cookie opens nothing. Set, it is compared by Caddy with no rate
# limit in front, so it must be long, and the cookie match needs a plain alphabet.
if [ -z "\${PREVIEW_EDIT_TOKEN:-}" ]; then
  PREVIEW_EDIT_TOKEN="unset-$(od -An -tx1 -N24 /dev/urandom | tr -d ' \\n')"
elif ! printf '%s' "$PREVIEW_EDIT_TOKEN" | grep -qE '^[A-Za-z0-9_-]{24,}$'; then
  echo "PREVIEW_EDIT_TOKEN must be at least 24 letters, digits, - or _ — refusing to install." >&2
  exit 1
elif [ "$PREVIEW_EDIT_TOKEN" = "$PREVIEW_TOKEN" ]; then
  echo "PREVIEW_EDIT_TOKEN equals PREVIEW_TOKEN, so every preview link could edit — refusing to install." >&2
  exit 1
fi

sed -e "s|__PREVIEW_TOKEN__|$PREVIEW_TOKEN|g" \\
    -e "s|__PREVIEW_EDIT_TOKEN__|$PREVIEW_EDIT_TOKEN|g" \\
    -e "s|{{ACME_EMAIL}}|$ACME_EMAIL|g" \\
    -e "s|{{PREVIEW_DOMAIN}}|$PREVIEW_DOMAIN|g" \\
    /etc/caddy/Caddyfile.tpl > /etc/caddy/Caddyfile.new

if grep -qE '\\{\\{|__PREVIEW_(EDIT_)?TOKEN__' /etc/caddy/Caddyfile.new; then
  echo "Unsubstituted placeholders remain — refusing to install:" >&2
  grep -nE '\\{\\{|__PREVIEW_(EDIT_)?TOKEN__' /etc/caddy/Caddyfile.new >&2
  rm -f /etc/caddy/Caddyfile.new
  exit 1
fi

caddy fmt --overwrite /etc/caddy/Caddyfile.new
caddy validate --config /etc/caddy/Caddyfile.new

if [ "${go ? '1' : '0'}" = "1" ]; then
  # Keep the outgoing config. This replaces a file that may be serving OTHER sites, and
  # "validated" only means it parses — it does not mean it is the config you wanted.
  had_config=0
  if [ -f /etc/caddy/Caddyfile ]; then
    cp -p /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
    had_config=1
  fi
  # Readable by the group Caddy runs as, and by nobody else: the file holds both keys.
  # umask 077 left it root-only, and Debian's Caddy runs as its own user, so the reload failed
  # reading it with the new file already in place (the maintainer's box, 1.16.26). Ask systemd
  # who that is rather than guess; a Caddy run as root needs no group.
  caddy_group=$(systemctl show -p Group --value caddy)
  if [ -z "$caddy_group" ]; then
    caddy_user=$(systemctl show -p User --value caddy)
    if [ -n "$caddy_user" ] && [ "$caddy_user" != root ]; then
      caddy_group=$(id -gn "$caddy_user")
    fi
  fi
  if [ -n "$caddy_group" ]; then
    chgrp "$caddy_group" /etc/caddy/Caddyfile.new
    chmod 640 /etc/caddy/Caddyfile.new
  else
    chmod 600 /etc/caddy/Caddyfile.new
  fi
  mv /etc/caddy/Caddyfile.new /etc/caddy/Caddyfile
  # A stopped Caddy cannot reload. Start it instead, or a box left down by the bug above could
  # never be repaired by re-running this.
  if systemctl is-active --quiet caddy; then
    verb=reload
  else
    verb=start
  fi
  if ! systemctl "$verb" caddy; then
    # A refused reload leaves Caddy serving what it had, but its next restart reads this file.
    if [ "$had_config" = 1 ]; then
      # Not \`cp -p\`: copying ONTO the installed file keeps its mode and group, and the
      # previous file may be one an affected version left root-only.
      cp /etc/caddy/Caddyfile.bak /etc/caddy/Caddyfile
      echo "caddy refused to $verb with the new config; restored the previous /etc/caddy/Caddyfile." >&2
    else
      rm -f /etc/caddy/Caddyfile
      echo "caddy refused to $verb with the new config; removed it." >&2
    fi
    if [ "$verb" = start ]; then
      echo "caddy is not running. \`systemctl status caddy\` says why." >&2
    fi
    exit 1
  fi
  echo "Installed /etc/caddy/Caddyfile (caddy: $verb)."
  echo "Previous config saved as /etc/caddy/Caddyfile.bak"
else
  echo "--- would change /etc/caddy/Caddyfile (token redacted) ---"
  if [ -f /etc/caddy/Caddyfile ]; then
    diff -u /etc/caddy/Caddyfile /etc/caddy/Caddyfile.new \\
      | sed -e "s|$PREVIEW_TOKEN|***REDACTED***|g" \\
            -e "s|$PREVIEW_EDIT_TOKEN|***REDACTED***|g" || true
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
