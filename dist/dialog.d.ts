import { Component, PartsMap } from 'tosijs';
interface DialogParts extends PartsMap {
    dialog: HTMLDialogElement;
    ok: HTMLButtonElement;
}
export declare class TosiDialog extends Component<DialogParts> {
    #private;
    static alert(message: string, title?: string): Promise<void>;
    static confirm(message: string, title?: string): Promise<boolean>;
    static prompt(message: string, title?: string, currentValue?: string): Promise<string | null>;
    static initAttributes: {
        removeOnClose: boolean;
        closeOnBackgroundClick: boolean;
    };
    constructor();
    dialogWillClose: (reason?: string) => void;
    initialFocus(): void;
    showModal: () => Promise<string | null>;
    close: (reason?: string) => void;
    ok: () => void;
    content: () => HTMLDialogElement;
}
export declare const tosiDialog: import("tosijs").ElementCreator<TosiDialog>;
export {};
