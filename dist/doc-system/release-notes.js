/*
Release notes assembled from commit annotations.

The pure half of `tosijs-release-notes`: parsing, grouping, and the two gates. It lives
in src/ rather than bin/ for two reasons — the bare `bun test` lane has `root = "./src"`,
so a test beside the bin would never run in CI (this repo's own docs call an ungated lane
one that always rots), and putting it here means it compiles into dist/ where adopters
can import the pieces directly rather than shelling out to the CLI.

See the bin for the annotation format and rationale.
*/
import { $ } from 'bun';
const TAGS = ['break', 'new', 'fix', 'change', 'note'];
const HEADINGS = {
    break: 'Breaking',
    new: 'Added',
    fix: 'Fixed',
    change: 'Changed',
};
/*
Parse the bullets out of one commit message.

A bullet runs until the next bullet or a blank line, so it can wrap — release-note text
that has to fit on one line stops being written properly. Leading `-`/`*` is optional
because people type both.
*/
export function parseBullets(message, sha = '') {
    const lines = message.split('\n');
    const out = [];
    let current = null;
    const push = () => {
        if (current && current.text.trim()) {
            current.text = current.text.trim().replace(/\s+/g, ' ');
            current.issues = [
                ...new Set([
                    ...current.text.matchAll(/(?:closes|fixes|resolves)\s+#(\d+)/gi),
                ].map((m) => Number(m[1]))),
            ];
            out.push(current);
        }
        current = null;
    };
    for (const line of lines) {
        const m = line.match(new RegExp(`^\\s*[-*]?\\s*\\[(${TAGS.join('|')})\\]\\s*(.*)$`, 'i'));
        if (m) {
            push();
            current = {
                tag: m[1].toLowerCase(),
                text: m[2],
                sha,
                issues: [],
            };
        }
        else if (current) {
            // A blank line ends the bullet; anything else continues it.
            if (!line.trim())
                push();
            else
                current.text += ' ' + line.trim();
        }
    }
    push();
    return out;
}
/** Does this diff plausibly support a code claim, or is it markdown only? */
export function isDocsOnly(files) {
    if (files.length === 0)
        return false;
    return files.every((f) => /\.(md|mdx|txt)$/i.test(f) ||
        f === 'CHANGELOG.md' ||
        f.startsWith('docs/') ||
        f.endsWith('.json'));
}
/** A tag like v1.2.3-rc.1 / 1.2.3-beta.2 — notes accumulate ACROSS these. */
export function isPrereleaseTag(tag) {
    return /\d+\.\d+\.\d+-/.test(tag);
}
/**
 * The last STABLE release tag.
 *
 * A bare `git describe --tags` returns the nearest tag including prereleases, so on a
 * prerelease line the baseline became the previous rc — and `release-check` reported
 * "0 annotations, all accounted for" over an empty range at exactly the boundary it
 * exists to guard. Release notes accumulate from the last thing users actually got.
 */
export async function lastVersionTag() {
    /*
    `--exclude='*-*'` skips prereleases while `describe` keeps ANCESTRY — it answers "the
    last stable release this commit descends from".
  
    A repo-wide `git tag --sort=-creatordate` scan gets both wrong: a `v1.7.6` hotfix tagged
    after `v1.8.0` becomes the baseline and re-emits already-published notes, and a
    maintenance branch baselines on a tag it does not descend from at all.
    */
    const described = await $ `git describe --tags --abbrev=0 --exclude=*-*`
        .nothrow()
        .quiet();
    if (described.exitCode === 0)
        return described.stdout.toString().trim();
    // No reachable stable tag (a fresh repo, or a branch before the first release).
    const all = await $ `git tag --sort=-creatordate`.nothrow().quiet();
    if (all.exitCode !== 0)
        return '';
    const tags = all.stdout
        .toString()
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);
    return tags.find((t) => !isPrereleaseTag(t)) ?? '';
}
export async function collect(since) {
    const range = since ? `${since}..HEAD` : 'HEAD';
    const raw = (await $ `git log ${range} --format=%H%x1f%s%x1f%b%x1e`.quiet().text())
        .split('\x1e')
        .filter((c) => c.trim());
    const records = [];
    for (const chunk of raw) {
        const [sha, subject, body] = chunk.split('\x1f');
        /*
        Blank line between subject and body, deliberately.
    
        A bullet continues across wrapped lines, so joining these with a single newline made
        a bullet in the SUBJECT swallow the entire commit body as continuation text — which
        is what happens on the historical commits that used the annotation as the subject
        line. The blank line terminates it, exactly as git's own format implies.
        */
        const bullets = parseBullets(`${subject}\n\n${body ?? ''}`, sha.trim());
        if (!bullets.length)
            continue;
        const files = (await $ `git show --name-only --format= ${sha.trim()}`.quiet().text())
            .split('\n')
            .filter(Boolean);
        records.push({ sha: sha.trim(), subject, bullets, files });
    }
    return records;
}
export function renderSection(version, records) {
    const all = records.flatMap((r) => r.bullets);
    const lines = [`## ${version}`, ''];
    for (const tag of ['break', 'new', 'fix', 'change']) {
        const hits = all.filter((b) => b.tag === tag);
        if (!hits.length)
            continue;
        lines.push(`### ${HEADINGS[tag]}`, '');
        for (const b of hits)
            lines.push(`- ${b.text} (${b.sha.slice(0, 8)})`);
        lines.push('');
    }
    const issues = [...new Set(all.flatMap((b) => b.issues))].sort((a, b) => a - b);
    if (issues.length) {
        lines.push(`Closes ${issues.map((n) => `#${n}`).join(', ')}.`, '');
    }
    return lines.join('\n');
}
/*
The coverage gate.

An annotation exists but does not appear in the written section => the release would ship
without mentioning it. Matching is deliberately loose (a distinctive run of words from the
bullet, normalized) because the whole point is that a human REWRITES these into prose —
demanding a literal match would just train people to paste.
*/
export function uncovered(records, changelog) {
    /*
    Normalize the haystack the SAME way as the needle.
  
    Filtering short words out of the bullet but not the changelog meant a run like
    "exactly release boundary" could never match "exactly the release boundary" — so the
    gate reported entries that were plainly written up, which is how a gate teaches people
    to ignore it. Found by using it: 2 of the 9 it flagged were false.
    */
    const norm = (t) => t
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .filter((w) => w.length > 3)
        .join(' ');
    const hay = norm(changelog);
    return records
        .flatMap((r) => r.bullets)
        .filter((b) => b.tag !== 'note')
        .filter((b) => {
        const words = norm(b.text).split(' ').filter(Boolean);
        if (!words.length)
            return false;
        // Covered if a distinctive 3-word run from the bullet survives into the prose,
        // or if it names an issue the section names.
        for (let i = 0; i + 2 < words.length; i++) {
            if (hay.includes(words.slice(i, i + 3).join(' ')))
                return false;
        }
        return !b.issues.some((n) => changelog.includes(`#${n}`));
    });
}
/** Commits asserting a code change whose diff is markdown only. */
export function unsupportedClaims(records) {
    return records.filter((r) => r.bullets.some((b) => b.tag === 'fix' || b.tag === 'new') &&
        isDocsOnly(r.files));
}
/** Which component moved, comparing the version being cut to the last released one. */
export function classifyBump(from, to) {
    const parse = (v) => v.replace(/^v/, '').split('-')[0].split('.').map(Number);
    const [fM, fm, fp] = parse(from);
    const [tM, tm, tp] = parse(to);
    if ([fM, fm, fp, tM, tm, tp].some((n) => Number.isNaN(n)))
        return 'unknown';
    if (to.includes('-'))
        return 'prerelease';
    if (tM !== fM)
        return 'major';
    if (tm !== fm)
        return 'minor';
    if (tp !== fp)
        return 'patch';
    return 'unknown';
}
/*
Paths where a change is a SECURITY-POSTURE change until proven otherwise.

Deliberately a small, named list rather than a clever heuristic: it has to be obvious why a
release was flagged, and obvious how to add to it. Matched as substrings of repo-relative
paths.
*/
/*
Paths where a change is worth a second look before it ships as a patch.

These are all DEVELOPMENT tooling — a dev server, a tunnel, a deploy script. None of it runs in
an end user's browser as part of an adopter's app, which is why touching them WARNS rather than
blocks. The distinction is the point: a security-relevant change to code an adopter ships to
their users deserves a gate that stops the release, and a change to a tool a developer chooses
to run on their own machine deserves a sentence in the notes.

It blocked, briefly, and that was wrong in a way worth recording. A gate that halts a release
over dev-only tooling spends the maintainer's attention on the release with the least at stake,
and the reliable outcome of a guard that cries wolf is that it gets overridden or deleted —
taking the case it was RIGHT about (#79, a loosened dev-server default shipped as a patch) with
it. Warning keeps that signal and stops charging for it.
*/
export const SENSITIVE_PATHS = [
    'dev-auth',
    'build-lock',
    'tunnel',
    'caddy-install',
    'deploy-preview',
];
/**
 * Is the version being cut big enough for what changed?
 *
 * The project's rule is that minors are for breaking changes and feature rollouts, and
 * additive non-breaking work ships as a patch. That rule is written down and was still
 * mis-applied two releases after it was written — by the person who wrote it — because
 * nothing checked it (#79). And the nine-lens review triggers on the version LETTER, so it
 * only fires when the letter is already right, which is exactly the judgement most in need
 * of review (#78).
 *
 * So this keys on what the diff and the annotations SAY, not on what the release was called.
 * Two mechanical signals, both chosen because a false positive is cheap (read a message) and
 * a false negative is what shipped last time:
 *
 * - a `[break]` bullet in a patch — the contract is "a patch never breaks you"
 * - a touched security path in a patch — a loosened default reaches people who never read
 *   the notes, and the ones who tightened their config deliberately are the ones harmed
 *
 * `[change]` only warns: widening a peer range is a `[change]` and is a perfectly good patch.
 */
export function bumpConcerns(opts) {
    const { bump, bullets, changedPaths } = opts;
    if (bump !== 'patch')
        return [];
    const out = [];
    const breaks = bullets.filter((b) => b.tag === 'break');
    if (breaks.length) {
        out.push({
            level: 'block',
            reason: 'a [break] annotation in a PATCH — the contract adopters rely on is that a patch never breaks them',
            evidence: breaks.map((b) => `${b.sha} ${b.text.slice(0, 90)}`),
        });
    }
    const sensitive = changedPaths.filter((p) => SENSITIVE_PATHS.some((s) => p.includes(s)));
    if (sensitive.length) {
        out.push({
            level: 'warn',
            reason: 'a dev-tooling path with a security surface changed in a PATCH — say what moved, under its own heading, in a release people will read',
            evidence: sensitive.slice(0, 8),
        });
    }
    const changes = bullets.filter((b) => b.tag === 'change');
    if (changes.length) {
        out.push({
            level: 'warn',
            reason: 'a [change] annotation in a patch — fine when it is additive (a widened peer range), wrong when behaviour moved',
            evidence: changes.map((b) => `${b.sha} ${b.text.slice(0, 90)}`),
        });
    }
    return out;
}
