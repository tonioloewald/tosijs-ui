import { ElementCreator } from 'tosijs';
import { ExampleContext } from './types';
import type { LiveExample } from './component';
/**
 * Find and replace sequences of code blocks with live examples
 */
export declare function insertExamples(element: HTMLElement, context: ExampleContext, liveExampleCreator: ElementCreator<LiveExample>, liveExampleTagName: string): void;
