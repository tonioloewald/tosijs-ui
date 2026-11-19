export interface ChecklistHandlerOptions {
    /** The folder `tosijs-checklist` posts to: `checklistDirFor(projectRoot)`. */
    dir: string;
    /**
     * Who may read the list and answer it. `true` admits, `false` refuses with a 403, and a
     * `Response` is sent as it is (a redirect to a login page, say).
     */
    admit: (request: Request) => boolean | Response | Promise<boolean | Response>;
    /** Where the endpoints live. Default `/__checklist`, which is where the panel looks. */
    endpoint?: string;
}
export declare function checklistHandler(options: ChecklistHandlerOptions): (request: Request) => Promise<Response | null>;
