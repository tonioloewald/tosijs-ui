import type { ExampleTab } from '../example-policy.js';
export interface PageGlobalsConfig {
    liveExamples?: 'auto' | 'opt-in' | 'no-code';
    exampleConsole?: boolean;
    exampleTabs?: ExampleTab[];
    dialects?: string[];
}
export declare function pageGlobalsHead(config: PageGlobalsConfig): string;
