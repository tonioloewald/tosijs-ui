export interface PageGlobalsConfig {
    liveExamples?: 'auto' | 'opt-in';
    exampleConsole?: boolean;
}
export declare function pageGlobalsHead(config: PageGlobalsConfig): string;
