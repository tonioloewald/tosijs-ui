export declare const liveExampleStyleSpec: {
    ':host': {
        '--tosi-example-height': string;
        '--code-editors-bar-bg': string;
        '--code-editors-bar-color': string;
        '--widget-bg': string;
        '--widget-color': string;
        position: string;
        display: string;
        height: string;
        background: string;
        boxSizing: string;
        borderRadius: string;
        boxShadow: string;
        overflow: string;
    };
    ':host.-locally-edited > [part="example"] > [part="exampleWidgets"]': {
        outline: string;
        outlineOffset: string;
        borderRadius: string;
    };
    ':host.-maximize': {
        position: string;
        left: string;
        top: string;
        height: string;
        right: string;
        margin: string;
    };
    '.-maximize': {
        zIndex: number;
    };
    ':host.-vertical': {
        flexDirection: string;
    };
    ':host.-inline-code.-vertical:not(.-maximize)': {
        height: string;
    };
    ':host.-inline-code:not(.-maximize):not(.-vertical) > .code-editors': {
        flex: string;
    };
    ':host.-inline-code:not(.-maximize):not(.-vertical) > [part="example"]': {
        flex: string;
    };
    ':host.-inline-code:not(.-maximize) [part="undo"], :host.-inline-code:not(.-maximize) [part="redo"]': {
        display: string;
    };
    ':host.-console-docked > [part="example"] > .example-console': {
        position: string;
        inset: string;
        zIndex: string;
    };
    ':host [part="testStatus"]': {
        display: string;
    };
    ':host.-inline-code.-has-test-status:not(.-maximize) [part="testStatus"]': {
        display: string;
        position: string;
        left: string;
        right: string;
        bottom: string;
        zIndex: string;
        boxSizing: string;
        height: string;
        lineHeight: string;
        padding: string;
        overflow: string;
        whiteSpace: string;
        textOverflow: string;
        cursor: string;
        fontFamily: string;
        fontSize: string;
        background: string;
        boxShadow: string;
    };
    ':host.-inline-code.-has-test-status:not(.-maximize):not(.-console-docked) [part="testStatus"].test-fail': {
        height: string;
        minHeight: string;
        maxHeight: string;
        overflow: string;
        whiteSpace: string;
        overflowWrap: string;
        lineHeight: string;
        padding: string;
    };
    ':host.-inline-code.-has-test-status:not(.-maximize) .preview': {
        paddingBottom: string;
    };
    ':host.-inline-code.-has-test-status.-console-docked:not(.-maximize) > [part="example"] > .example-console': {
        bottom: string;
        height: string;
    };
    ':host.-inline-code.-has-test-status:not(.-maximize):not(.-test-only) [part="testResults"]': {
        display: string;
    };
    ':host .layout-indicator': {
        transition: string;
        transform: string;
    };
    ':host.-vertical .layout-indicator': {
        transform: string;
    };
    ':host.-maximize > [part="example"] > [part="exampleWidgets"] .hide-if-maximized, :host:not(.-maximize) > [part="example"] > [part="exampleWidgets"] .show-if-maximized': {
        display: string;
    };
    ':host [part="example"]': {
        flex: string;
        height: string;
        position: string;
        overflowX: string;
    };
    ':host .preview': {
        height: string;
        position: string;
        overflow: string;
        boxSizing: string;
        padding: string;
    };
    ':host .preview > :first-child': {
        marginTop: string;
    };
    ':host .preview-error': {
        padding: string;
        margin: string;
        background: string;
        color: string;
        borderRadius: string;
        fontSize: string;
        fontFamily: string;
        whiteSpace: string;
    };
    ':host [part="running"]': {
        position: string;
        top: string;
        left: string;
        width: string;
        height: string;
        margin: string;
        borderRadius: string;
        border: string;
        borderTopColor: string;
        boxSizing: string;
        animation: string;
        pointerEvents: string;
        zIndex: string;
    };
    ':host [part="running"].still': {
        animation: string;
    };
    ':host [part="running"][hidden]': {
        display: string;
    };
    '@keyframes tosi-example-spin': {
        from: {
            transform: string;
        };
        to: {
            transform: string;
        };
    };
    ':host .example-console': {
        display: string;
        flexDirection: string;
        height: string;
        background: string;
        fontFamily: string;
        fontSize: string;
        lineHeight: string;
    };
    ':host .example-console .console-lines': {
        flex: string;
        minHeight: string;
        overflow: string;
        padding: string;
    };
    ':host .example-console .console-line': {
        whiteSpace: string;
        overflowWrap: string;
        padding: string;
    };
    ':host .example-console .console-warn': {
        color: string;
        background: string;
    };
    ':host .example-console .console-error': {
        color: string;
        background: string;
    };
    ':host .example-console .console-debug, :host .example-console .console-dropped': {
        opacity: string;
    };
    ':host .example-console .console-input': {
        opacity: string;
    };
    ':host .example-console .console-input::before': {
        content: string;
    };
    ':host .example-console .console-result::before': {
        content: string;
        opacity: string;
    };
    ':host .example-console .console-prompt': {
        flex: string;
        display: string;
        alignItems: string;
        gap: string;
        padding: string;
        boxShadow: string;
    };
    ':host .example-console .console-field': {
        flex: string;
        resize: string;
        border: string;
        boxShadow: string;
        outline: string;
        padding: string;
        margin: string;
        background: string;
        color: string;
        font: string;
    };
    ':host [part="editors"]': {
        flex: string;
        height: string;
        position: string;
    };
    ':host [part="exampleWidgets"]': {
        position: string;
        top: string;
        right: string;
        zIndex: string;
        color: string;
        '--widget-color': string;
        '--tosi-pocket-handle-color': string;
        '--tosi-pocket-handle-bg': string;
        '--tosi-pocket-handle-radius': string;
        '--tosi-pocket-handle-size': string;
    };
    ':host [part="exampleWidgets"] button': {
        '--text-color': string;
    };
    ':host [part="exampleWidgets"] .tests-toggle input': {
        display: string;
    };
    ':host [part="exampleWidgets"] .tests-toggle': {
        opacity: string;
        filter: string;
        transition: string;
    };
    ':host .code-editors': {
        overflow: string;
        background: string;
        position: string;
        top: string;
        right: string;
        flex: string;
        height: string;
        flexDirection: string;
        zIndex: string;
    };
    ':host .code-editors:not([hidden])': {
        display: string;
    };
    ':host .code-editors > h4': {
        padding: string;
        margin: string;
        textAlign: string;
        background: string;
        color: string;
        cursor: string;
    };
    ':host button.transparent, :host .sizer': {
        width: string;
        height: string;
        lineHeight: string;
        textAlign: string;
        padding: string;
        margin: string;
    };
    ':host .sizer': {
        cursor: string;
    };
    '@keyframes test-pulse': {
        '0%, 100%': {
            opacity: string;
        };
        '50%': {
            opacity: string;
        };
    };
    ':host.-test-running > [part="example"] > [part="exampleWidgets"]': {
        '--widget-color': string;
        animation: string;
    };
    ':host.-test-passed > [part="example"] > [part="exampleWidgets"]': {
        '--widget-color': string;
    };
    ':host.-test-failed > [part="example"] > [part="exampleWidgets"]': {
        '--widget-color': string;
    };
    ':host [part="testResults"]': {
        position: string;
        bottom: string;
        left: string;
        background: string;
        borderRadius: string;
        padding: string;
        fontSize: string;
        margin: string;
        maxWidth: string;
        maxHeight: string;
        overflow: string;
        zIndex: string;
    };
    ':host [part="testResults"][hidden]': {
        display: string;
    };
    ':host(.-test-only) [part="testResults"]': {
        position: string;
        maxWidth: string;
        maxHeight: string;
        background: string;
        padding: string;
        fontSize: string;
    };
    ':host(.-test-only) .preview': {
        display: string;
    };
    ':host [part="output"]': {
        boxSizing: string;
        padding: string;
        maxHeight: string;
        overflow: string;
        fontFamily: string;
        fontSize: string;
        lineHeight: string;
    };
    ':host [part="output"] .console-line': {
        whiteSpace: string;
        overflowWrap: string;
        padding: string;
    };
    ':host [part="output"] .console-warn': {
        color: string;
        background: string;
    };
    ':host [part="output"] .console-error': {
        color: string;
        background: string;
    };
    ':host [part="output"] .console-debug, :host [part="output"] .console-dropped': {
        opacity: string;
    };
    ':host(.-output-only) .preview': {
        height: string;
        padding: string;
    };
    ':host .test-pass': {
        color: string;
    };
    ':host .test-fail': {
        color: string;
    };
    ':host .example-docs': {
        padding: string;
        overflow: string;
    };
    ':host .tjs-test-results': {
        padding: string;
        fontSize: string;
        fontFamily: string;
        overflow: string;
        lineHeight: string;
    };
    ':host .tjs-test-summary': {
        fontWeight: string;
        marginBottom: string;
    };
    ':host .tjs-test-empty': {
        opacity: string;
    };
    ':host .tjs-test-error': {
        opacity: string;
    };
};
