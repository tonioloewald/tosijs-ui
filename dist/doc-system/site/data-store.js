/*
WHICH files `editableData` may touch, and how a save becomes a version (#3365).

`/__docstore/source` writes only scraped doc sources (#128), so an editor running on the dev
page (a level editor, say) could not save the JSON it edits. This is the sibling for data: a
list of folders the project names, behind the same gate (`sourceRequestAdmission`).

An allow-list at every level, as #128 argues for source:

- Folders: inside the project, never the project itself, never inside or containing `.git` or
  `node_modules`. Resolved through symlinks, at launch.
- Extensions: data formats only, from DATA_EXTENSIONS. Nothing a browser or a tool executes or
  renders (`.js`, `.html`, `.svg`, `.md`, whose fences run as live examples). A config naming
  anything else stops the server rather than being trimmed quietly.
- Names: no dot-files and no names tools read as configuration (`package.json`,
  `tsconfig.json`, `*.config.*`), so a folder that happens to hold one cannot be used to write it.
- Paths: plain characters only, no `..`, and the real path (symlinks resolved) must still be
  inside a named folder. An existing symlink is never written through.

FAILS CLOSED: anything unexpected is a refusal with a reason, never a best effort.
*/
import * as fs from 'fs';
import * as path from 'path';
/** Formats a data folder may hold. Text only: the endpoint takes and returns strings. */
export const DATA_EXTENSIONS = [
    '.json',
    '.jsonc',
    '.json5',
    '.ndjson',
    '.txt',
    '.csv',
    '.tsv',
    '.yaml',
    '.yml',
    '.toml',
];
/** The largest save accepted, in bytes. A level is kilobytes; this stops a runaway client. */
export const MAX_DATA_BYTES = 16 * 1024 * 1024;
/*
Names tools read as configuration, some of which run commands. A backstop, not the boundary:
no list of every tool's file can be complete, so the folders a project names are what keep
writes away from configuration, and the docs say so.
*/
const CONFIG_NAMES = [
    /^package(-lock)?\.json$/,
    /^[tj]sconfig(\..*)?\.json$/,
    /^bunfig\.toml$/,
    /^deno\.jsonc?$/,
    /\.config\.[^.]+$/,
    /^(project|turbo|nx|lerna|composer|firebase|vercel|now)\.json$/,
    /^(Cargo|pyproject|netlify|wrangler|fly|Pipfile)\.toml$/i,
];
/** The folder setting, checked and resolved, or null when the project has none. Throws. */
export function resolveDataStore(setting, root, 
/** The site's build output, which every build deletes and rewrites. */
outputDir) {
    if (setting == null)
        return null;
    const options = Array.isArray(setting)
        ? { dirs: setting }
        : setting;
    const fail = (why) => {
        throw new Error(`editableData: ${why}`);
    };
    if (!Array.isArray(options.dirs) || options.dirs.length === 0)
        fail('name at least one folder, e.g. editableData: ["static/levels"]');
    const extensions = (options.extensions ?? ['.json']).map((e) => (e.startsWith('.') ? e : '.' + e).toLowerCase());
    for (const ext of extensions) {
        if (!DATA_EXTENSIONS.includes(ext))
            fail(`${JSON.stringify(ext)} is not a data format this endpoint will write. ` +
                `Allowed: ${DATA_EXTENSIONS.join(' ')}`);
    }
    const realRoot = fs.realpathSync(root);
    const output = outputDir ? path.resolve(realRoot, outputDir) : null;
    const dirs = options.dirs.map((name) => {
        if (typeof name !== 'string' || path.isAbsolute(name))
            fail(`${JSON.stringify(name)} must be a folder relative to the project`);
        let real;
        try {
            real = fs.realpathSync(path.resolve(realRoot, name));
        }
        catch {
            return fail(`${JSON.stringify(name)} does not exist`);
        }
        if (!fs.statSync(real).isDirectory())
            fail(`${JSON.stringify(name)} is not a folder`);
        if (!real.startsWith(realRoot + path.sep))
            fail(`${JSON.stringify(name)} must be inside the project, and not the project itself`);
        const parts = path.relative(realRoot, real).split(path.sep);
        if (parts.some((p) => p === '.git' || p === 'node_modules'))
            fail(`${JSON.stringify(name)} is inside .git or node_modules`);
        for (const inner of ['.git', 'node_modules'])
            if (fs.existsSync(path.join(real, inner)))
                fail(`${JSON.stringify(name)} contains ${inner}`);
        if (output &&
            (real === output ||
                real.startsWith(output + path.sep) ||
                output.startsWith(real + path.sep)))
            fail(`${JSON.stringify(name)} overlaps the build output (${path.relative(realRoot, output)}), which every build deletes`);
        return { real, name: name.replace(/\/+$/, '') };
    });
    return {
        root: realRoot,
        dirs,
        extensions,
        commit: options.commit === true,
    };
}
/**
 * The absolute path a client's file name may be read or written at, or the reason it may not.
 * `file` is project-relative (`static/levels/ocean.json`).
 */
export function resolveDataFile(store, file) {
    if (typeof file !== 'string' || file === '')
        return { refused: 'name a file' };
    const rel = file.replace(/^\.?\/+/, '');
    if (!/^[\w\- ./]+$/.test(rel))
        return { refused: 'file names may use letters, digits, - _ . / and spaces' };
    const parts = rel.split('/');
    if (parts.some((p) => p === '' || p === '.' || p === '..'))
        return { refused: 'no empty, . or .. path segments' };
    if (parts.some((p) => p.startsWith('.')))
        return { refused: 'no dot-files or dot-folders' };
    const base = parts[parts.length - 1];
    if (CONFIG_NAMES.some((re) => re.test(base)))
        return { refused: `${base} is a name tools read as configuration` };
    if (!store.extensions.includes(path.extname(base).toLowerCase()))
        return {
            refused: `only ${store.extensions.join(' ')} files are editable here`,
        };
    const target = path.resolve(store.root, rel);
    let realParent;
    try {
        realParent = fs.realpathSync(path.dirname(target));
    }
    catch {
        return { refused: 'that folder does not exist' };
    }
    const dir = store.dirs.find((d) => realParent === d.real || realParent.startsWith(d.real + path.sep));
    if (!dir)
        return { refused: 'not inside an editableData folder' };
    const real = path.join(realParent, base);
    try {
        if (fs.lstatSync(real).isSymbolicLink())
            return { refused: 'a symlink is never written through' };
    }
    catch {
        // Does not exist yet: a new file in a named folder.
    }
    return { path: real, rel: path.relative(store.root, real) };
}
/** Why `content` may not be saved as `rel`, or null. JSON must parse: a half-edit is not a level. */
export function dataContentProblem(rel, content) {
    if (typeof content !== 'string')
        return 'content must be a string';
    if (Buffer.byteLength(content) > MAX_DATA_BYTES)
        return `content is over ${MAX_DATA_BYTES / 1024 / 1024} MB`;
    if (path.extname(rel).toLowerCase() === '.json') {
        try {
            JSON.parse(content);
        }
        catch (e) {
            return `not valid JSON: ${e.message}`;
        }
    }
    return null;
}
/** Write through a temporary file and a rename, so a reader never sees half a file. */
export function writeDataFile(target, content) {
    const temp = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
    fs.writeFileSync(temp, content);
    try {
        fs.renameSync(temp, target);
    }
    catch (e) {
        fs.rmSync(temp, { force: true });
        throw e;
    }
}
/** Every editable file in the named folders, project-relative, newest first. */
export function listDataFiles(store) {
    const found = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name.startsWith('.') || entry.isSymbolicLink())
                continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory())
                walk(full);
            else if (entry.isFile()) {
                const rel = path.relative(store.root, full).split(path.sep).join('/');
                if ('path' in resolveDataFile(store, rel)) {
                    const stat = fs.statSync(full);
                    found.push({
                        file: rel,
                        size: stat.size,
                        modified: stat.mtime.toISOString(),
                        ms: stat.mtimeMs,
                    });
                }
            }
        }
    };
    for (const dir of store.dirs)
        walk(dir.real);
    return found.sort((a, b) => b.ms - a.ms).map(({ ms: _ms, ...f }) => f);
}
/** Run git in the project and return stdout, or throw with its stderr. Bounded in time. */
async function git(root, args, timeoutMs = 20_000) {
    const proc = Bun.spawn(['git', ...args], {
        cwd: root,
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'ignore',
        // A signing prompt or an editor must fail, not wait for a terminal nobody is watching.
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_EDITOR: 'false' },
    });
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        proc.kill();
    }, timeoutMs);
    const [out, err, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
    ]);
    clearTimeout(timer);
    if (timedOut)
        throw new Error(`git ${args[0]} took over ${timeoutMs / 1000}s (a slow hook, or a prompt) and was stopped`);
    if (code !== 0)
        throw new Error((err.trim() || out.trim() || `git ${args[0]} exited ${code}`).slice(0, 500));
    return out;
}
/** Whether `root` is in a git work tree, for `commit: true` to be checked at launch. */
export function isGitWorkTree(root) {
    const result = Bun.spawnSync(['git', 'rev-parse', '--is-inside-work-tree'], {
        cwd: root,
        stdout: 'pipe',
        stderr: 'pipe',
    });
    return result.exitCode === 0 && result.stdout.toString().trim() === 'true';
}
/** Why the repository is in no state to take a commit, or null. */
async function repositoryBusy(root) {
    const states = [
        ['rebase-merge', 'in the middle of a rebase'],
        ['rebase-apply', 'in the middle of a rebase'],
        ['MERGE_HEAD', 'in the middle of a merge'],
        ['CHERRY_PICK_HEAD', 'in the middle of a cherry-pick'],
        ['REVERT_HEAD', 'in the middle of a revert'],
        ['BISECT_LOG', 'in the middle of a bisect'],
    ];
    for (const [name, state] of states) {
        const where = (await git(root, ['rev-parse', '--git-path', name])).trim();
        if (fs.existsSync(path.resolve(root, where)))
            return state;
    }
    try {
        await git(root, ['symbolic-ref', '-q', 'HEAD']);
    }
    catch {
        return 'on a detached HEAD';
    }
    return null;
}
async function commitFile(store, rel, savedBy) {
    await git(store.root, ['add', '--', rel]);
    const changed = await git(store.root, [
        'diff',
        '--cached',
        '--name-only',
        '--',
        rel,
    ]);
    if (!changed.trim())
        return null;
    await git(store.root, [
        'commit',
        '-m',
        `data: save ${rel}`,
        '-m',
        `Saved through the dev server by ${savedBy}.`,
        '--',
        rel,
    ]);
    return (await git(store.root, ['rev-parse', 'HEAD'])).trim();
}
// With `commit` on, saves run one at a time, each writing and then committing: two commits
// fight over .git/index.lock, and a write that lands between another save's write and its
// `git add` would put one save's content under the other's name (1.16.25 review).
let saveQueue = Promise.resolve();
/**
 * Save a file. With `commit` on, also commit it, alone, leaving other staged work as it was:
 * `commit` is the hash, or null when the save changed nothing. A save that wrote the file but
 * could not commit it resolves with `commitError`, because the file WAS saved. The repository's
 * hooks run, as for any commit; a repository mid-rebase, mid-merge, bisecting or on a detached
 * HEAD is not committed to, since that commit would land somewhere the developer did not choose.
 */
export function saveDataFile(store, target, content, savedBy) {
    if (!store.commit) {
        writeDataFile(target.path, content);
        return Promise.resolve({});
    }
    const run = async () => {
        writeDataFile(target.path, content);
        try {
            const busy = await repositoryBusy(store.root);
            if (busy)
                return {
                    commit: null,
                    commitError: `not committed: the repository is ${busy}`,
                };
            return { commit: await commitFile(store, target.rel, savedBy) };
        }
        catch (e) {
            return { commit: null, commitError: e.message };
        }
    };
    const result = saveQueue.then(run, run);
    saveQueue = result.catch(() => undefined);
    return result;
}
/** One file's committed versions, newest first. */
export async function dataHistory(store, rel, limit = 100) {
    const out = await git(store.root, [
        'log',
        `-n${limit}`,
        '--format=%H%x1f%aI%x1f%an%x1f%s',
        '--',
        rel,
    ]);
    return out
        .split('\n')
        .filter(Boolean)
        .map((line) => {
        const [commit, date, author, subject] = line.split('\x1f');
        return { commit, date, author, subject };
    });
}
/** A file as it was at `commit`, or null if the commit is not a hash or lacks the file. */
export async function readDataAt(store, rel, commit) {
    if (!/^[0-9a-f]{4,40}$/i.test(commit))
        return null;
    try {
        // `./` makes the path relative to the project, which need not be the repository's root.
        return await git(store.root, ['show', `${commit}:./${rel}`]);
    }
    catch {
        return null;
    }
}
