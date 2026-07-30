#!/usr/bin/env bash
#
# Regenerate the preview host's index page.
#
# Scans /srv/preview/*/version.json and writes an index listing every project that is
# actually deployed, with the commit and build time it is serving. The root
# (dev.tosijs.net) serves this, so the host is SELF-DESCRIBING: you can see what is on
# it without remembering, and you can see at a glance which previews have gone stale.
#
# Deliberately NOT "redirect to the most recently deployed project". That would make
# one URL mean different things at different times depending on invisible state —
# exactly the "what am I looking at?" problem /version.json exists to kill, reintroduced
# at the routing layer. A link you send someone should still show what you meant an hour
# later.
#
# Lives in git and is piped over ssh by `bun run deploy:index` rather than installed on
# the box, so there is no server-side script to drift out of date.
#
# Reads nothing but version.json, writes nothing but the index — safe to re-run.

set -euo pipefail

ROOT=/srv/preview
OUT="$ROOT/_index"
mkdir -p "$OUT"

# Collect deployed projects. A directory only counts if it has a version.json — a
# half-finished rsync or a stray folder should not appear as a live preview.
rows=""
unlinked=""
count=0
for dir in "$ROOT"/*/; do
	name="$(basename "$dir")"
	[ "$name" = "_index" ] && continue
	vj="$dir/version.json"
	[ -f "$vj" ] || continue
	commit=$(sed -n 's/.*"commit": *"\([^"]*\)".*/\1/p' "$vj" | head -1)
	ctime=$(sed -n 's/.*"commitTime": *"\([^"]*\)".*/\1/p' "$vj" | head -1)
	gen=$(sed -n 's/.*"generator": *"\([^"]*\)".*/\1/p' "$vj" | head -1)
	site=$(sed -n 's/.*"site": *"\([^"]*\)".*/\1/p' "$vj" | head -1)
	[ -n "$site" ] || site="$name"

	# The hostname comes from the project's OWN Caddy fragment — the same file the
	# router reads — so this listing cannot disagree with what actually serves. An
	# earlier version derived it from the directory name and confidently linked
	# tosijs-ui.dev.tosijs.net at a site served from ui.dev.tosijs.net.
	frag="$ROOT/_sites/$name.caddy"
	host=""
	[ -f "$frag" ] && host=$(sed -n 's/^\([A-Za-z0-9.-]*\) *{.*/\1/p' "$frag" | head -1)
	# Not registered (no fragment, or one we cannot parse) means nothing is routing to
	# it — list it, but do not invent a link that would 404.
	[ -n "$host" ] || { unlinked="$unlinked $site"; continue; }

	count=$((count + 1))
	rows="$rows
	<li>
		<a href=\"//$host\">
			<span class=\"name\">$site</span>
			<span class=\"meta\">
				<code>${commit:-unknown}</code>
				<time datetime=\"${ctime:-}\">${ctime:-unknown}</time>
			</span>
		</a>
		<span class=\"gen\">built by tosijs-ui ${gen:-?}</span>
	</li>"
done

ICON='<svg viewBox="0 0 48 48" class="logo" aria-hidden="true"><g><path style="fill:#3ea9f5" d="M23.97,47 C23.97,47,39,47,39,47 C43.42,47,47,43.42,47,39 C47,39,47,9,47,9 C47,4.58,43.42,1,39,1 C39,1,9,1,9,1 C4.58,1,1,4.58,1,9 C1,9,1,39,1,39 C1,43.42,4.58,47,9,47 C9,47,23.97,47,23.97,47 z"/><path style="fill:#fff" d="M14,14 C14,14,34,14,34,14 M24,14 C24,14,24,34,24,34" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/></g></svg>'

cat > "$OUT/index.html" <<HTML
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>tosijs previews</title>
<style>
	:root { color-scheme: light dark; --fg:#111; --bg:#fff; --dim:#667; --line:#0002; --card:#0000000a; }
	@media (prefers-color-scheme: dark) {
		:root { --fg:#e8e8ea; --bg:#16171a; --dim:#98a; --line:#fff2; --card:#ffffff0d; }
	}
	* { box-sizing: border-box; }
	body {
		margin:0; padding:2rem 1.25rem; background:var(--bg); color:var(--fg);
		font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;
		display:flex; flex-direction:column; align-items:center;
	}
	main { width:100%; max-width:44rem; }
	header { display:flex; align-items:center; gap:.75rem; margin-bottom:.25rem; }
	.logo { width:44px; height:44px; flex:0 0 auto; }
	h1 { font-size:1.5rem; margin:0; font-weight:600; letter-spacing:-.01em; }
	.sub { color:var(--dim); margin:0 0 2rem 3.75rem; font-size:.9rem; }
	ul { list-style:none; padding:0; margin:0; display:grid; gap:.75rem; }
	li { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:.85rem 1rem; }
	li a { display:flex; flex-wrap:wrap; align-items:baseline; gap:.5rem 1rem; color:inherit; text-decoration:none; }
	li a:hover .name { text-decoration:underline; }
	.name { font-weight:600; font-size:1.05rem; }
	.meta { color:var(--dim); font-size:.85rem; display:flex; gap:.75rem; align-items:baseline; flex-wrap:wrap; }
	code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
	.gen { display:block; color:var(--dim); font-size:.75rem; margin-top:.3rem; }
	.empty { color:var(--dim); }
	footer { color:var(--dim); font-size:.8rem; margin-top:2.5rem; }
</style>
<main>
	<header>$ICON<h1>tosijs previews</h1></header>
	<p class="sub">Deployed builds. Each shows the commit it was built from.</p>
	$(if [ "$count" -eq 0 ]; then echo '<p class="empty">Nothing deployed yet.</p>'; else echo "<ul>$rows
	</ul>"; fi)
	$(if [ -n "$unlinked" ]; then echo "<p class=\"empty\">Deployed but not routed:$unlinked</p>"; fi)
	<footer>Previews only — not production. Regenerated on every deploy.</footer>
</main>
<script>
	// Absolute time is always correct; relative time is what you actually want to
	// read. Rendered client-side so it can never itself go stale.
	for (const t of document.querySelectorAll('time[datetime]')) {
		const d = new Date(t.getAttribute('datetime'))
		if (isNaN(+d)) continue
		const mins = Math.round((Date.now() - d) / 60000)
		const rel =
			mins < 1 ? 'just now'
			: mins < 60 ? mins + 'm ago'
			: mins < 1440 ? Math.round(mins / 60) + 'h ago'
			: Math.round(mins / 1440) + 'd ago'
		t.textContent = rel
		t.title = d.toLocaleString()
	}
</script>
HTML

echo "index: $count project(s) → $OUT/index.html"
