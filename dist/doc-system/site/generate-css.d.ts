import './build-dom-shim.js';
import { DocSystemTheme } from '../doc-system-styles.js';
import { ThemeData } from '../../theme-data.js';
declare global {
    var Bun: any;
}
/**
 * The CSS for a theme saved by the theme editor (`themeFile`), after the stock stylesheet so
 * it wins. Its base colours start from the site's `theme`.
 */
export declare function themeFileCss(data: ThemeData, theme: DocSystemTheme): string;
export declare function generateCss(outputPath?: string, theme?: DocSystemTheme, themeFile?: string): Promise<void>;
