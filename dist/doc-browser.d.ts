import { TestResults } from './live-example/test-harness';
export interface PageTestResults {
    passed: boolean;
    tests: TestResults['tests'];
    totalPassed: number;
    totalFailed: number;
}
export interface DocTestResults {
    passed: number;
    failed: number;
    pages: Record<string, PageTestResults>;
}
declare global {
    interface Window {
        __docTestResults?: Promise<DocTestResults>;
    }
}
export interface Doc {
    text: string;
    title: string;
    filename: string;
    path: string;
    pin?: string;
    hidden?: boolean;
    testStatus?: 'passed' | 'failed' | 'pending';
}
export interface ProjectLinks {
    github?: string;
    npm?: string;
    discord?: string;
    blog?: string;
    tosijs?: string;
    bundle?: string;
    cdn?: string;
    [key: string]: string | undefined;
}
export interface DocBrowserOptions {
    docs: Doc[];
    context?: Record<string, any>;
    projectName?: string;
    projectLinks?: ProjectLinks;
    navSize?: number;
    minSize?: number;
}
export declare function createDocBrowser(options: DocBrowserOptions): HTMLElement;
