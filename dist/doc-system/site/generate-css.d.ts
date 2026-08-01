import './build-dom-shim.js';
import { DocSystemTheme } from '../doc-system-styles.js';
declare global {
    var Bun: any;
}
export declare function generateCss(outputPath?: string, theme?: DocSystemTheme): Promise<void>;
