import { ElementCreator, XinStyleSheet } from 'tosijs';
import { type ChecklistItemAnswer, type ChecklistSpec } from './doc-system/checklist-client.js';
export { checklistSections } from './doc-system/checklist-client.js';
export type { ChecklistItem, ChecklistItemAnswer, ChecklistItemSpec, ChecklistChange, ChecklistSpec, ChecklistVerdict, } from './doc-system/checklist-client.js';
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
