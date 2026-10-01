export interface PageGlobalsConfig {
    liveExamples?: 'auto' | 'opt-in';
    exampleConsole?: boolean;
    dialects?: string[];
}
export declare function pageGlobalsHead(config: PageGlobalsConfig): string;
