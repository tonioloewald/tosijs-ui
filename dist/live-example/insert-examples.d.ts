import { ElementCreator } from 'tosijs';
import { ExampleContext } from './types.js';
import type { LiveExample } from './component.js';
/**
 * Find and replace sequences of code blocks with live examples
 */
export declare function insertExamples(element: HTMLElement, context: ExampleContext, liveExampleCreator: ElementCreator<LiveExample>, liveExampleTagName: string, sourceFile?: string): void;
