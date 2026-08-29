/** Bodies larger than this are refused. A diagnostic line is small; a payload is not. */
export declare const MAX_BODY_BYTES: number;
/** The file stops growing here, so a looping page cannot fill a disk while nobody is looking. */
export declare const MAX_FILE_BYTES: number;
/**
 * Where the sink lives.
 *
 * Outside the repo by default, and that is deliberate rather than tidy-mindedness: a file under
 * the project root gets swept into a build, a `git add -A`, or a published tarball by whichever
 * broad glob notices it first. Keyed by project path so two checkouts do not interleave their
 * telemetry into one file.
 *
 * An explicit string is taken as given — you asked for it, and confining it further would just
 * be second-guessing a path you typed.
 */
export declare function sinkPathFor(setting: boolean | string | undefined, root: string, dir?: string): string | null;
export type SinkResult = {
    ok: true;
} | {
    ok: false;
    status: 413 | 507;
    reason: string;
};
/**
 * Append one line, or explain why not.
 *
 * The body is written as ONE line with newlines escaped, because the format's whole value is
 * that `tail -f` shows one event per line — a payload containing a newline would otherwise split
 * into two events, and the reader would never know which.
 *
 * Nothing here parses or validates the JSON. The sink is a log: a page mid-crash may well send
 * something malformed, and that is exactly the moment you least want the server to drop it.
 */
export declare function appendToSink(file: string, body: string, opts?: {
    maxBody?: number;
    maxFile?: number;
    sizeOf?: (p: string) => number;
    append?: (p: string, line: string) => void;
}): SinkResult;
