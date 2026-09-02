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
        width: string;
        margin: string;
    };
    '.-maximize': {
        zIndex: number;
    };
    ':host.-vertical': {
        flexDirection: string;
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
    ':host .test-pass': {
        color: string;
    };
    ':host .test-fail': {
        color: string;
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
