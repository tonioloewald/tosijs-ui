import './build-dom-shim';
import { DocSystemTheme } from '../doc-system-styles';
declare global {
    var Bun: any;
}
export declare function generateCss(outputPath?: string, theme?: DocSystemTheme): Promise<void>;
