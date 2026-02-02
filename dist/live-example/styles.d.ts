export declare const liveExampleStyleSpec: {
    ':host': {
        '--xin-example-height': string;
        '--code-editors-bar-bg': string;
        '--code-editors-bar-color': string;
        '--widget-bg': string;
        '--widget-color': string;
        position: string;
        display: string;
        height: string;
        background: string;
        boxSizing: string;
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
    ':host.-maximize .hide-if-maximized, :host:not(.-maximize) .show-if-maximized': {
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
        boxShadow: string;
    };
    ':host [part="editors"]': {
        flex: string;
        height: string;
        position: string;
    };
    ':host [part="exampleWidgets"]': {
        position: string;
        left: string;
        bottom: string;
        '--widget-color': string;
        borderRadius: string;
        width: string;
        height: string;
        lineHeight: string;
        zIndex: string;
    };
    ':host [part="exampleWidgets"] svg': {
        stroke: string;
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
    ':host.-test-failed [part="example"]': {
        boxShadow: string;
    };
    ':host.-test-passed [part="exampleWidgets"]': {
        '--widget-color': string;
    };
    ':host.-test-failed [part="exampleWidgets"]': {
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
};
