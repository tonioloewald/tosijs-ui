import { Component, ElementCreator, PartsMap } from 'tosijs';
export type AffixPosition = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'en' | 'wn' | 'es' | 'ws';
export interface AffixPlacement {
    position: AffixPosition;
    inside: boolean;
}
/** `position` as written, or the default when it is not one. */
export declare function affixPosition(value: unknown): AffixPosition;
/** `"s inside"` → `{position: 's', inside: true}`; '' → null (no fallback). */
export declare function parsePlacement(value: unknown): AffixPlacement | null;
/** `{position: 's', inside: true}` → `"s inside"`. */
export declare const describePlacement: ({ position, inside }: AffixPlacement) => string;
type Track = 1 | 2 | 3;
type Align = 'start' | 'center' | 'end';
/**
 * The grid cell and alignment for a placement. Outside, the fixture takes the cell on its
 * edge, hugging the content; inside, it shares the content's cell, against that edge.
 */
export declare function affixCell({ position, inside }: AffixPlacement): {
    row: Track;
    column: Track;
    alignSelf: Align;
    justifySelf: Align;
    direction: string;
    edge: "n" | "s" | "e" | "w";
};
interface AffixParts extends PartsMap {
    content: HTMLSlotElement;
    fixture: HTMLSlotElement;
}
export declare class TosiAffix extends Component<AffixParts> {
    static initAttributes: Record<string, unknown>;
    /** Where the fixture goes when the wanted place does not fit: `"s inside"`, or '' for nowhere. */
    fallback: string;
    static preferredTagName: string;
    static shadowStyleSpec: {
        ':host': {
            display: string;
            gridTemplateColumns: string;
            gridTemplateRows: string;
            '--tosi-affix-direction': string;
        };
        ':host([hidden])': {
            display: string;
        };
        ':host > [part="content"]': {
            display: string;
            gridArea: string;
            minWidth: string;
            minHeight: string;
            position: string;
        };
        ':host > [part="fixture"]': {
            display: string;
            flexDirection: string;
            alignItems: string;
            zIndex: string;
            gap: string;
            padding: string;
            background: string;
            color: string;
        };
        ':host > [part="fixture"][hidden]': {
            display: string;
        };
    };
    content: () => HTMLSlotElement[];
    private _wanted;
    private _placed;
    private _wantedLength;
    private _observer;
    /** Where the fixture is (set: where it should be). */
    get position(): AffixPosition;
    set position(value: string);
    /** Whether the fixture is inside the content (set: whether it should be). */
    get inside(): boolean;
    set inside(value: boolean | string);
    /** Where the fixture should be, whatever fits. */
    get wanted(): AffixPlacement;
    /** An empty fixture slot is hidden, so it takes no room and draws no background. */
    private syncEmpty;
    handleSlotChange: () => void;
    connectedCallback(): void;
    private _observed;
    observeContent: () => void;
    disconnectedCallback(): void;
    /** The fixture's and the content's lengths along `edge`, as laid out now. */
    private lengths;
    /** Choose where the fixture goes, lay it out there, and announce a change. */
    place: () => void;
    /** Lay the fixture out at `placement`, and announce it if that is a change. */
    private layout;
    private apply;
    render(): void;
}
export declare const tosiAffix: ElementCreator<TosiAffix>;
export {};
