# release-notes

<!--{ "parent": "Appendices" }-->

Assembles a CHANGELOG section from **annotations in commit messages**, so release notes
stop being something you write from memory at the end — and stop being something you can
forget.

    tosijs-release-notes               # notes since the last version tag
    tosijs-release-notes --check       # verify every annotation is accounted for (exit 1 if not)
    tosijs-release-notes --since=v1.8.0
    tosijs-release-notes --write       # prepend the section to CHANGELOG.md

## The annotation

Put one bullet in the commit body per **separately interesting** thing:

    fix(tunnel): one port resolver for server and bin

    [fix] tunnel bin derived localPort as a fixed 8788 while the server used PORT+1 —
          they agreed only when PORT was 8787. closes #39
    [new] `--status` reports the ports it would use
    [note] extracted resolveTunnelLocalPort so the two cannot drift again

`[note]` is internal: recorded, never published.

**One bullet per thing, not one per commit** — this is the whole point, and the reason a
`type:` prefix alone is not enough. The subject line says what kind of commit it is; the
bullets say what a *reader of the release* gets. A commit that fixes three things has
three bullets, and a conventional-commit prefix can only ever represent one of them.

| tag | goes in | means |
| --- | --- | --- |
| `[break]` | Breaking | requires action from an adopter |
| `[new]` | Added | new capability |
| `[fix]` | Fixed | it was broken |
| `[change]` | Changed | behaves differently, nothing to do |
| `[note]` | *(withheld)* | internal; refactors, tests, chores |

`closes #12` / `fixes #12` anywhere in a bullet is collected, so the release step knows
which issues to close.

## Why not generate the prose too

Because the sentence worth reading is *"1.8.0's site entry point does not import at all in
a clean install — upgrade whether or not you want the new feature"*, and nothing derives
that from a diff. So this assembles a **skeleton and a coverage gate**, and a human (or
agent) writes the paragraph that says who should care. `--check` fails when an annotation
since the last tag appears nowhere in the new section, which kills forgetting without
pretending to automate judgement.

## `--check` also flags claims a diff does not support

A commit whose bullets claim `[fix]` or `[new]` while its diff touches only markdown is
reported. This is not a style rule: three entries in tosijs-ui's own 1.9.0 notes described
fixes that were never written, and the worst of them — an auth gate — was asserted by a
commit whose diff never touched the file it named. Cheap to detect, and the failure it
catches is expensive.
