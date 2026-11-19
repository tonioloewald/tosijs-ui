import { ElementCreator, XinStyleSheet } from 'tosijs';
export interface ChecklistItemSpec {
    id?: string;
    text: string;
    url?: string;
    steps?: string[];
}
export interface ChecklistSpec {
    id?: string;
    title: string;
    items?: (ChecklistItemSpec | string)[];
    sections?: {
        title?: string;
        items: (ChecklistItemSpec | string)[];
    }[];
}
export type ChecklistVerdict = 'pass' | 'fail' | null;
export interface ChecklistItemAnswer {
    verdict: ChecklistVerdict;
    comment: string;
}
export interface ChecklistChange extends ChecklistItemAnswer {
    itemId: string;
    changed: 'verdict' | 'comment';
}
interface Item {
    id: string;
    text: string;
    url?: string;
    steps?: string[];
}
/** The list's sections, with every item given an id the way the dev server's store does. */
export declare function checklistSections(spec: ChecklistSpec | null): {
    title?: string;
    items: Item[];
}[];
/** A site path or an http(s) URL: what an item may link to. */
export declare const linkableUrl: (url: string) => boolean;
declare const TosiChecklist_base: import("tosijs").WithAttributes<{
    /** answers can be seen but not changed */
    disabled: boolean;
}>;
export declare class TosiChecklist extends TosiChecklist_base {
    static preferredTagName: string;
    private _value;
    private _answers;
    private builtFor;
    private listening;
    /** the list */
    get value(): ChecklistSpec | null;
    set value(spec: ChecklistSpec | null);
    /** each item's answer, by id */
    get answers(): Record<string, ChecklistItemAnswer>;
    set answers(answers: Record<string, ChecklistItemAnswer> | null);
    static shadowStyleSpec: XinStyleSheet;
    private answerFor;
    private emit;
    handleClick: (event: Event) => void;
    handleComment: (event: Event) => void;
    handleInput: (event: Event) => void;
    content: () => HTMLDivElement[];
    connectedCallback(): void;
    private build;
    render(): void;
}
export declare const tosiChecklist: ElementCreator<TosiChecklist>;
export { pageSchematic } from './page-schematic.js';
export type { SchematicOptions } from './page-schematic.js';
