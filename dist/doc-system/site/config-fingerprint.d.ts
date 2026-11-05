export declare function configFingerprint(config: unknown): string;
export interface BuildServerIdentity {
    root: string;
    pid: number;
    config: string;
}
/**
 * Why a dev server refuses a `/__build` request, as the 409 reply's body, or null to build.
 *
 * A request for another project's tree, or with a config fingerprint other than the one the
 * server was launched with, is refused BEFORE anything is built (#3772, #3863).
 */
export declare function buildRequestRefusal(params: URLSearchParams, server: BuildServerIdentity): Record<string, unknown> | null;
/**
 * What a delegated build says when the server's reply does not prove it built THIS config, or
 * null when it does. A server too old to send a fingerprint has already built with whatever
 * config it was started with, so it cannot be trusted either.
 */
export declare function staleConfigMessage(replyConfig: string | undefined, fingerprint: string, where: {
    port: number;
    pid: number;
}): string | null;
