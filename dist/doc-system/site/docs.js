/*#
# docs

Utility for extracting documentation from markdown files and inline comments in source code.

> `docs.ts` is intended to be run directly using `bun`. You can transpile it to javascript if you
want to run it using node.

This is used by the `doc-browser` component to build searchable, navigable documentation
from your project's source files.

## Usage

    import { extractDocs } from 'docs'

    extractDocs({
      paths: ['src', 'README.md'],
      ignore: ['node_modules', 'dist', 'build']
      path: 'public/docs.json'
    })

## API

### `extractDocs(options)`

Scans directories for markdown files and source code comments.

**Options:**
- `paths`: Array of directory paths or file paths to scan
- `ignore`: Array of directory names to ignore (default: ['node_modules', 'dist'])
- `output`: if provided, path to write json result.

**Returns:** Array of `Doc` objects

### `Doc` object structure

    {
      text: string,        // Markdown content
      title: string,       // First heading or filename
      filename: string,    // Just the filename
      path: string,        // Full file path
      pin?: 'top' | 'bottom'  // Optional pinning for sort order
    }

## Documentation Format

### Markdown files

Any `.md` file will be included in its entirety.

### Source code comments

Multi-line comments that start with `/*#` will be extracted as markdown:

    /*#
    # My Component

    This is documentation for my component.

    ```html
    <my-component></my-component>
    ```
    ```js
    console.log('hello world')
    ```
    ```css
    my-componet {
      color: blue
    }
    ```
    *‎/

    export class MyComponent extends Component {
      // implementation
    }
    ...

The [doc-browser](/?doc-browser.ts) will render the output as a test-bed project with documentation and live examples.

### Metadata

You can include JSON metadata in comments to control sorting:

html:
    <!--{ "pin": "bottom" }-->

ts, js, css:
    /*{ "pin": "bottom" }*‎/

This will pin the document to the top or bottom of the navigation list.
*/
/*{ "pin": "bottom" }*/
// TODO CLI options
import * as fs from 'fs';
import * as path from 'path';
import { pinnedSort } from '../nav-tree';
const TRIM_REGEX = /^#+ |`/g;
function metadata(content, filePath) {
    const source = content.match(/<!--(\{.*\})-->|\/\*(\{.*\})\*\//);
    let data = {};
    if (source) {
        try {
            data = JSON.parse(source[1] || source[2]);
        }
        catch {
            console.error('bad metadata in doc', filePath);
        }
    }
    return data;
}
function findMarkdownFiles(paths, ignore) {
    const markdownFiles = [];
    function traverseDirectory(dir, ignore) {
        console.log(dir);
        const files = fs.readdirSync(dir);
        const baseName = path.basename(dir);
        // Each ignore entry matches either by basename (node_modules, dist, build —
        // skipped wherever they appear) or by resolved path (e.g. the build's
        // output dir — skipped only at that exact location, so a source dir that
        // happens to share the name, like src/docs, is still scanned).
        const resolved = path.resolve(dir);
        if (ignore.some((ig) => ig === baseName || path.resolve(ig) === resolved)) {
            return;
        }
        files.forEach((file) => {
            const filePath = path.join(dir, file);
            let stats;
            try {
                stats = fs.statSync(filePath);
            }
            catch {
                return;
            }
            if (stats.isDirectory()) {
                traverseDirectory(filePath, ignore);
            }
            else if (path.extname(file) === '.md') {
                const content = fs.readFileSync(filePath, 'utf8');
                markdownFiles.push({
                    text: content,
                    title: content.split('\n')[0].replace(TRIM_REGEX, ''),
                    filename: file,
                    path: filePath,
                    ...metadata(content, filePath),
                });
            }
            else if (['.ts', '.js', '.css'].includes(path.extname(file))) {
                const content = fs.readFileSync(filePath, 'utf8');
                const docs = content.match(/\/\*#[\s\S]+?\*\//g) || [];
                if (docs.length) {
                    const markdown = docs.map((s) => s.substring(3, s.length - 2).trim());
                    const text = markdown.join('\n\n');
                    markdownFiles.push({
                        text,
                        title: text.split('\n')[0].replace(TRIM_REGEX, ''),
                        filename: file,
                        path: filePath,
                        ...metadata(content, filePath),
                    });
                }
            }
        });
    }
    paths.forEach((dir) => {
        try {
            const stats = fs.statSync(dir);
            if (stats.isDirectory()) {
                traverseDirectory(dir, ignore);
            }
            else if (stats.isFile()) {
                const file = path.basename(dir);
                if (path.extname(file) === '.md') {
                    const content = fs.readFileSync(dir, 'utf8');
                    markdownFiles.push({
                        text: content,
                        title: content.split('\n')[0].replace(TRIM_REGEX, ''),
                        filename: file,
                        path: dir,
                        ...metadata(content, dir),
                    });
                }
            }
        }
        catch (err) {
            console.error(`Could not read ${dir}:`, err);
        }
    });
    return markdownFiles.sort(pinnedSort);
}
export function extractDocs(options) {
    const { paths, ignore = ['node_modules', 'dist', 'build'], output, } = options;
    const docs = findMarkdownFiles(paths, ignore);
    if (output) {
        saveDocsJSON(docs, output);
    }
    return docs;
}
export function saveDocsJSON(docs, outputPath) {
    const jsonData = JSON.stringify(docs, null, 2);
    fs.writeFileSync(outputPath, jsonData, 'utf8');
    console.log(`Documentation saved to ${outputPath}`);
}
