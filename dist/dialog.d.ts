import { Component, PartsMap } from 'tosijs';
interface DialogParts extends PartsMap {
    dialog: HTMLDialogElement;
    ok: HTMLButtonElement;
}
export declare class TosiDialog extends Component<DialogParts> {
    #private;
    static preferredTagName: string;
    static lightStyleSpec: {
        ':host > dialog::backdrop': {
            backdropFilter: string;
        };
        ':host > dialog:not([open])': {
            display: string;
        };
        ':host > dialog[open]': {
            minWidth: number;
            border: number;
            borderRadius: number;
            overflow: string;
            maxHeight: string;
            padding: number;
            display: string;
            flexDirection: string;
            gap: number;
            _dialogShadow: string;
            _dialogBackground: string;
            _dialogColor: string;
            boxShadow: string;
            background: string;
            color: string;
        };
        ':host > dialog > *': {
            padding: string;
        };
        ':host > dialog > header': {
            display: string;
            justifyContent: string;
            gap: number;
        };
        ':host > dialog > footer': {
            display: string;
            justifyContent: string;
            gap: number;
            paddingBottom: number;
        };
    };
    static alert(message: string, title?: string): Promise<void>;
    static confirm(message: string, title?: string): Promise<boolean>;
    static prompt(message: string, title?: string, currentValue?: string): Promise<string | null>;
    removeOnClose: boolean;
    closeOnBackgroundClick: boolean;
    constructor();
    /**
    Called before the dialog closes, with the reason (`'confirm'`, `'cancel'`, or whatever was
    passed to `close()`). Return `false` — or a Promise resolving to `false` — to refuse the
    close, e.g. while an async save is in flight: a dialog that cannot be cancelled must not
    look as though it was.
    */
    dialogWillClose: (_reason?: string) => void | boolean | Promise<void | boolean>;
    initialFocus(): void;
    showModal: () => Promise<string | null>;
    /**
    Close the dialog unless `dialogWillClose` vetoes it. Returns whether it closed — a Promise
    of that when `dialogWillClose` is async.
    */
    close: (reason?: string) => boolean | Promise<boolean>;
    onCancel: (event: Event) => void;
    onNativeClose: () => void;
    ok: () => void;
    content: () => HTMLDialogElement;
}
export declare const tosiDialog: import("tosijs").ElementCreator<TosiDialog>;
export {};
