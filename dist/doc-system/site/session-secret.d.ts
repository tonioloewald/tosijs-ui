export declare const SESSION_SECRET_DIR = ".tosijs-dev";
export declare const SESSION_SECRET_FILE = "session-secret";
export declare function sessionSecretPath(projectRoot: string): string;
/**
 * Refuse a configuration whose output folder holds the secret: the dev server would serve it,
 * and anyone who read it could sign a pass of their own.
 */
export declare function assertSecretNotServed(file: string, outputDir: string): void;
/**
 * The secret, or null when there is none yet (nothing has been signed with it, so no pass can
 * be valid). Throws when it exists but is unusable, saying how to fix it: a secret others can
 * read, or one that is not what this module writes.
 */
export declare function readSessionSecret(file: string): string | null;
/** The secret, created (0600, in a self-ignoring 0700 folder) if there is none yet. */
export declare function ensureSessionSecret(file: string): string;
