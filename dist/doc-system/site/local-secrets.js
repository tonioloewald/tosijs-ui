import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
/*
Where machine secrets come from — ONE implementation, and a fallback that works for
things that are not a human at an interactive prompt.

`PREVIEW_HOST`, and the global tunnel keys `PREVIEW_TOKEN` and `PREVIEW_EDIT_TOKEN`, live in
`~/local-secrets/tosijs-preview.env`: mode 700, a sibling of the repos rather than inside one,
so it is structurally impossible to commit. That is a stronger
guarantee than a rule saying "don't commit the host", which this project wrote, believed, and
then violated in its own `tosijs-site.config.ts` for months.

The fallback exists because the previous advice — "export it from your shell profile" — is
present for a human and ABSENT for every tool: non-interactive shells inherit no interactive
profile, so an agent or a CI step sees nothing and reports a missing credential rather than a
missing `export`. Reading the file directly makes the resolution order true for both.

Parses only `KEY=value` / `export KEY=value`, strips one layer of quotes, ignores the rest.
Not a shell — a credentials file that needs evaluating is a credentials file that can run
code.
*/
export function readLocalSecret(name, file = path.join(process.env.HOME ?? '', 'local-secrets', 'tosijs-preview.env')) {
    if (!process.env.HOME || !existsSync(file))
        return undefined;
    let text;
    try {
        text = readFileSync(file, 'utf8');
    }
    catch {
        return undefined;
    }
    for (const line of text.split('\n')) {
        const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
        if (!m || m[1] !== name)
            continue;
        return m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
    return undefined;
}
