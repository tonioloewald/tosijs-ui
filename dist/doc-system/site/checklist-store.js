import path from 'path';
import { tmpdir } from 'os';
import { chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, rmSync, writeFileSync, } from 'fs';
/*
The test checklist's store (#4147): one list at a time, its answers, and each answer's page
schematic.

Outside the repo, for the debug sink's reason: a file under the project root gets swept into a
build, a `git add -A` or a tarball. Keyed by project path so two checkouts never share a list.

The agent's bin writes the list straight to these files and the dev server writes the answers,
so neither needs the other running to do its half. Every write is a temp file plus a rename, so
a reader never sees half a file.
*/
/** Item and list ids: they become file names, so nothing else gets through. */
export const CHECKLIST_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** A request body over this (gzipped, as sent) is refused. */
export const MAX_ANSWER_BYTES = 1024 * 1024;
/** A body that inflates past this is refused: the cap on what gzip may claim. */
export const MAX_INFLATED_BYTES = 8 * 1024 * 1024;
const MAX_ITEMS = 200;
const MAX_TEXT = 2000;
const MAX_STEPS = 20;
const MAX_COMMENT = 10_000;
/** The store's folder: `setting` if given, else a per-project folder in the temp dir. */
export function checklistDirFor(root, setting, dir = tmpdir()) {
    if (setting)
        return path.resolve(root, setting);
    const resolved = path.resolve(root);
    // FNV-1a, as the debug sink's file name.
    let hash = 0x811c9dc5;
    for (let i = 0; i < resolved.length; i++) {
        hash ^= resolved.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return path.join(dir, `tosijs-checklist-${hash.toString(16)}`);
}
const LIST_FILE = 'list.json';
const ANSWERS_FILE = 'answers.json';
const SCHEMATICS = 'schematics';
/*
The store folder is private to this user. The default is a predictable name in the temp dir,
which on a multi-user Linux host another user could create first, or link elsewhere, to read
or plant answers. So: made 0700, and refused unless it is a real folder this user owns.
*/
function ensureStore(dir) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    if (process.platform === 'win32')
        return;
    const stat = lstatSync(dir);
    if (!stat.isDirectory() || stat.uid !== process.getuid?.()) {
        throw new Error(`${dir} is not a folder you own: refusing to use it as the checklist store`);
    }
    if ((stat.mode & 0o077) !== 0)
        chmodSync(dir, 0o700);
}
function writeAtomic(dir, name, text) {
    ensureStore(dir);
    const file = path.join(dir, name);
    mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    writeFileSync(temp, text, 'utf8');
    renameSync(temp, file);
}
function readJson(file) {
    try {
        return existsSync(file)
            ? JSON.parse(readFileSync(file, 'utf8'))
            : null;
    }
    catch {
        return null;
    }
}
// C0 and C1 controls other than newline and tab: what a terminal or a log reader acts on.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;
function isPageUrl(value) {
    if (typeof value !== 'string' || value.length > 2000)
        return false;
    // eslint-disable-next-line no-control-regex -- matching control characters is the point
    if (/[\u0000-\u001f\u007f-\u009f]/.test(value))
        return false;
    try {
        return /^https?:$/.test(new URL(value).protocol);
    }
    catch {
        return false;
    }
}
/*
What a reader typed, made safe to print for an agent or a terminal: control characters (escape
sequences, carriage returns) shown as \u{…}, never sent raw. Newlines are the caller's to
handle, since each line of a comment is quoted with `>`.
*/
const printable = (text) => text.replace(CONTROL, (c) => `\\u{${c.charCodeAt(0).toString(16).padStart(2, '0')}}`);
const isText = (value, max) => typeof value === 'string' && value.trim() !== '' && value.length <= max;
/** A site path or an http(s) URL; anything else (a `javascript:` URL) is refused. */
export function safeItemUrl(url) {
    if (url.startsWith('/') && !url.startsWith('//'))
        return true;
    return /^https?:\/\//i.test(url);
}
/**
 * Check a posted list and fill in what may be left out: ids, the posting time, a section for
 * a bare `items` array. Returns the list, or what is wrong with it.
 */
export function normalizeChecklist(input, now = new Date()) {
    if (!input || typeof input !== 'object') {
        return { problem: 'a checklist is an object with a title and items' };
    }
    const raw = input;
    if (!isText(raw.title, MAX_TEXT))
        return { problem: 'the list needs a title' };
    const rawSections = Array.isArray(raw.sections)
        ? raw.sections
        : Array.isArray(raw.items)
            ? [{ items: raw.items }]
            : null;
    if (!rawSections)
        return { problem: 'the list needs items or sections' };
    const seen = new Set();
    const sections = [];
    let count = 0;
    for (const [s, rawSection] of rawSections.entries()) {
        const section = (rawSection ?? {});
        if (section.title !== undefined && !isText(section.title, MAX_TEXT)) {
            return { problem: `section ${s + 1}: title must be text` };
        }
        if (!Array.isArray(section.items) || section.items.length === 0) {
            return { problem: `section ${s + 1} has no items` };
        }
        const items = [];
        for (const [i, rawItem] of section.items.entries()) {
            const where = `section ${s + 1}, item ${i + 1}`;
            const item = (typeof rawItem === 'string' ? { text: rawItem } : (rawItem ?? {}));
            if (!isText(item.text, MAX_TEXT)) {
                return { problem: `${where}: text is required (≤${MAX_TEXT} chars)` };
            }
            const id = item.id === undefined ? `s${s + 1}-${i + 1}` : item.id;
            if (typeof id !== 'string' || !CHECKLIST_ID.test(id)) {
                return { problem: `${where}: id must match ${CHECKLIST_ID}` };
            }
            if (seen.has(id))
                return { problem: `${where}: duplicate id ${id}` };
            seen.add(id);
            const out = { id, text: item.text.trim() };
            if (item.url !== undefined) {
                if (typeof item.url !== 'string' || !safeItemUrl(item.url)) {
                    return { problem: `${where}: url must be a site path or http(s) URL` };
                }
                out.url = item.url;
            }
            if (item.steps !== undefined) {
                if (!Array.isArray(item.steps) ||
                    item.steps.length > MAX_STEPS ||
                    !item.steps.every((step) => isText(step, MAX_TEXT))) {
                    return { problem: `${where}: steps must be up to ${MAX_STEPS} texts` };
                }
                out.steps = item.steps;
            }
            items.push(out);
            if (++count > MAX_ITEMS) {
                return { problem: `more than ${MAX_ITEMS} items` };
            }
        }
        sections.push(section.title === undefined
            ? { items }
            : { title: section.title.trim(), items });
    }
    const id = raw.id === undefined ? now.getTime().toString(36) : raw.id;
    if (typeof id !== 'string' || !CHECKLIST_ID.test(id)) {
        return { problem: `the list id must match ${CHECKLIST_ID}` };
    }
    return {
        id,
        title: raw.title.trim(),
        postedAt: now.toISOString(),
        sections,
    };
}
/** Post a list. It replaces the current one, and the old answers and schematics go with it. */
export function postChecklist(dir, list) {
    rmSync(path.join(dir, SCHEMATICS), { recursive: true, force: true });
    rmSync(path.join(dir, ANSWERS_FILE), { force: true });
    writeAtomic(dir, LIST_FILE, JSON.stringify(list, null, 2) + '\n');
}
/**
 * Remove the list and everything answered against it: only the files the store writes, so a
 * `--dir` that names a folder with anything else in it loses nothing else. The folder itself
 * goes only if that leaves it empty.
 */
export function clearChecklist(dir) {
    if (!existsSync(dir))
        return;
    rmSync(path.join(dir, SCHEMATICS), { recursive: true, force: true });
    for (const name of readdirSync(dir)) {
        if (name === LIST_FILE ||
            name === ANSWERS_FILE ||
            /^(list|answers)\.json\.\d+\.tmp$/.test(name)) {
            rmSync(path.join(dir, name), { force: true });
        }
    }
    try {
        rmdirSync(dir);
    }
    catch {
        // Not empty: it holds something the store did not write, which stays.
    }
}
export const readChecklist = (dir) => readJson(path.join(dir, LIST_FILE));
function readAnswers(dir, list) {
    const stored = readJson(path.join(dir, ANSWERS_FILE));
    // Answers to a list that has since been replaced are not this list's answers.
    return stored && stored.listId === list.id
        ? stored
        : { listId: list.id, answers: {} };
}
const itemIds = (list) => list.sections.flatMap((section) => section.items.map((item) => item.id));
/** The list, its answers, and the count of each verdict. */
export function checklistResults(dir) {
    const list = readChecklist(dir);
    if (!list) {
        return { list: null, answers: {}, total: 0, pass: 0, fail: 0, open: 0 };
    }
    const { answers } = readAnswers(dir, list);
    const ids = itemIds(list);
    const verdicts = ids.map((id) => answers[id]?.verdict ?? null);
    const pass = verdicts.filter((v) => v === 'pass').length;
    const fail = verdicts.filter((v) => v === 'fail').length;
    return {
        list,
        answers,
        total: ids.length,
        pass,
        fail,
        open: ids.length - pass - fail,
    };
}
/**
 * Record one item's answer. `schematic` replaces the stored one when given; a comment-only
 * update keeps it.
 */
export function saveChecklistAnswer(dir, body, now = new Date()) {
    const list = readChecklist(dir);
    if (!list)
        return { ok: false, status: 404, reason: 'no checklist is posted' };
    const raw = (body ?? {});
    if (raw.listId !== list.id) {
        return {
            ok: false,
            status: 409,
            reason: 'this checklist has been replaced: reload to see the new one',
        };
    }
    const itemId = raw.itemId;
    if (typeof itemId !== 'string' || !itemIds(list).includes(itemId)) {
        return { ok: false, status: 400, reason: 'no such item' };
    }
    const verdict = raw.verdict ?? null;
    if (verdict !== null && verdict !== 'pass' && verdict !== 'fail') {
        return { ok: false, status: 400, reason: 'verdict is pass, fail or null' };
    }
    const comment = raw.comment ?? '';
    if (typeof comment !== 'string' || comment.length > MAX_COMMENT) {
        return {
            ok: false,
            status: 400,
            reason: `comment must be text (≤${MAX_COMMENT} chars)`,
        };
    }
    const page = raw.page;
    if (page !== undefined && !isPageUrl(page)) {
        return { ok: false, status: 400, reason: 'page must be an http(s) URL' };
    }
    const schematic = raw.schematic;
    if (schematic !== undefined &&
        (typeof schematic !== 'string' || !schematic.startsWith('<svg'))) {
        return { ok: false, status: 400, reason: 'schematic must be an SVG' };
    }
    const stored = readAnswers(dir, list);
    const previous = stored.answers[itemId];
    const answer = {
        verdict,
        comment,
        at: now.toISOString(),
    };
    if (page)
        answer.page = page;
    if (schematic !== undefined) {
        const file = path.join(SCHEMATICS, `${itemId}.svg`);
        writeAtomic(dir, file, schematic);
        answer.schematic = file;
    }
    else if (previous?.schematic) {
        answer.schematic = previous.schematic;
    }
    stored.answers[itemId] = answer;
    writeAtomic(dir, ANSWERS_FILE, JSON.stringify(stored, null, 2) + '\n');
    return { ok: true, answer };
}
/** Inflate gzip, stopping at `limit`: returns null past it, so a small bomb stays small. */
async function inflateCapped(bytes, limit) {
    const reader = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream('gzip'))
        .getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.byteLength;
        if (size > limit) {
            await reader.cancel();
            return null;
        }
        chunks.push(value);
    }
    const out = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return out;
}
/**
 * Read an answer request's body: gzipped JSON when `Content-Encoding: gzip`, plain otherwise.
 * Both caps are checked before parsing, and inflation stops at its cap rather than after it.
 */
export async function parseAnswerBody(bytes, gzipped) {
    if (bytes.byteLength > MAX_ANSWER_BYTES) {
        return {
            status: 413,
            reason: `answer over ${MAX_ANSWER_BYTES} bytes as sent`,
        };
    }
    let inflated = bytes;
    if (gzipped) {
        try {
            inflated = await inflateCapped(bytes, MAX_INFLATED_BYTES);
        }
        catch {
            return { status: 400, reason: 'answer is not valid gzip' };
        }
        if (!inflated) {
            return {
                status: 413,
                reason: `answer over ${MAX_INFLATED_BYTES} bytes inflated`,
            };
        }
    }
    try {
        return { body: JSON.parse(new TextDecoder().decode(inflated)) };
    }
    catch {
        return { status: 400, reason: 'answer is not JSON' };
    }
}
/** `pass` when every item passed, `fail` when any failed, `open` while any is unanswered. */
export function checklistVerdict(results, failFast = false) {
    if (failFast && results.fail > 0)
        return 'fail';
    if (results.open > 0)
        return 'open';
    return results.fail > 0 ? 'fail' : 'pass';
}
/** The results as an agent reads them: one line per item, then its comment and schematic. */
export function formatChecklistResults(results, dir) {
    const { list, answers } = results;
    if (!list)
        return 'No checklist is posted.';
    const lines = [
        `${printable(list.title)} (${list.id}): ${results.pass} passed, ${results.fail} failed, ${results.open} to check`,
    ];
    for (const section of list.sections) {
        if (section.title)
            lines.push('', section.title);
        for (const item of section.items) {
            const answer = answers[item.id];
            const mark = answer?.verdict === 'pass'
                ? 'PASS'
                : answer?.verdict === 'fail'
                    ? 'FAIL'
                    : '----';
            lines.push(`  ${mark}  ${item.id}  ${printable(item.text)}`);
            /*
            A comment is the reader's words, quoted line by line, so a line of it can never pass
            for a verdict line. An agent reading this treats it as data, not instructions.
            */
            if (answer?.comment) {
                for (const line of answer.comment.split(/\r?\n/))
                    lines.push(`        > ${printable(line)}`);
            }
            if (answer?.page)
                lines.push(`        page: ${printable(answer.page)}`);
            if (answer?.schematic) {
                lines.push(`        schematic: ${path.join(dir, answer.schematic)}`);
            }
        }
    }
    return lines.join('\n');
}
