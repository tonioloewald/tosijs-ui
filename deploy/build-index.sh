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

# The REAL tosiPlatform icon, lifted verbatim from src/icons/data/tosiPlatform.ts.
# (The first version of this file hand-drew a rough approximation — a blue box with a
# stroke in it — which is exactly the sort of thing nobody notices in review and
# everybody notices on the page.)
ICON='<svg class="logo" aria-hidden="true" viewBox="0 0 48 48"><g><g><g><path style="fill:#3ea9f5;fill-rule:evenodd;stroke:none;" d="M23.97,47 C23.97,47,39,47,39,47 C43.42,47,47,43.42,47,39 C47,39,47,9,47,9 C47,4.58,43.42,1,39,1 C39,1,9,1,9,1 C4.58,1,1,4.58,1,9 C1,9,1,39,1,39 C1,41.64,2.28,43.98,4.25,45.44 C4.09,44.82,4,44.17,4,43.5 C4,39.36,7.36,36,11.5,36 C15.14,36,18.18,38.60,18.86,42.05 C19.07,42.02,19.28,42,19.5,42 C21.99,42,24,44.01,24,46.5 C24,46.67,23.99,46.84,23.97,47 z"/><path style="fill:#ffffff;fill-rule:evenodd;stroke:none;" d="M4.25,45.44 C4.09,44.82,4,44.17,4,43.5 C4,39.36,7.36,36,11.5,36 C15.14,36,18.18,38.60,18.86,42.05 C19.07,42.02,19.28,42,19.5,42 C21.99,42,24,44.01,24,46.5 C24,46.67,23.99,46.84,23.97,47 C23.97,47,9,47,9,47 C7.22,47,5.58,46.42,4.25,45.44 z"/></g><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M35,35 C35,35,32.17,35,32.17,35 C32.17,35,32.17,37.83,32.17,37.83"/><path style="fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M31,39 C31,39,28.17,39,28.17,39 C28.17,39,28.17,41.83,28.17,41.83"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M7.48,16 C4.45,16,2,18.45,2,21.48 C2,21.48,2,21.48,2,21.48 C2,23.98,4.02,26,6.52,26 C6.52,26,6.62,26,6.62,26 C7.38,26,8,26.62,8,27.38 C8,27.38,8,27.38,8,27.38 C8,29.93,10.07,32,12.62,32 C12.62,32,16,32,16,32 C18.58,32,20.68,29.91,20.68,27.32 C20.68,27.32,20.68,21.42,20.68,21.42 C20.68,18.43,18.25,16,15.26,16 C15.26,16,7.48,16,7.48,16 z"/><path style="fill:#e4e4e4;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M17,29 C17,29,33,29,33,29 C33,29,33,29,33,29 C33,34.52,28.52,39,23,39 C23,39,23,39,23,39 C19.69,39,17,36.31,17,33 C17,33,17,29,17,29 z"/><path style="fill:#9e9e9e;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M40.52,16 C43.55,16,46,18.45,46,21.48 C46,21.48,46,21.48,46,21.48 C46,23.98,43.98,26,41.48,26 C41.48,26,41.38,26,41.38,26 C40.62,26,40,26.62,40,27.38 C40,27.38,40,27.38,40,27.38 C40,29.93,37.93,32,35.38,32 C35.38,32,32,32,32,32 C29.42,32,27.32,29.91,27.32,27.32 C27.32,27.32,27.32,21.42,27.32,21.42 C27.32,18.43,29.75,16,32.74,16 C32.74,16,40.52,16,40.52,16 z"/><g><path style="fill:#ffffff;fill-rule:evenodd;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M6,10.18 C6,7.87,7.79,6,10,6 C10,6,32,6,32,6 C34.21,6,36,7.87,36,10.18 C36,10.18,36,24.82,36,24.82 C36,27.13,34.21,29,32,29 C32,29,10,29,10,29 C7.79,29,6,27.13,6,24.82 C6,24.82,6,10.18,6,10.18 z"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M21,11 C21,11,21,23,21,23"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M25,15 C25,15,25,17,25,17"/><path style="fill:#ffffff;fill-rule:nonzero;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-width:2;" d="M17,15 C17,15,17,17,17,17"/></g></g></g></svg> '

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
	<footer>Previews only — not production. Each entry updates when that project deploys (<code>bun run deploy --go</code>), not when it builds.</footer>
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
