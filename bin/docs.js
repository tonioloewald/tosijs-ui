/*#
# docs.js

The `xinjs-ui` package includes `docs.js` which is used to build the documentation
for the [ui.xinjs.net](https://ui.xinjs.net).

This is a simple utility for finding all the markdown files in a directory and also all
multi-line comments in .ts, .js, and .css source files that being with a "!".

These comments are assumed to be in markdown.

It then emits JSON containing all the content.

Comments comprising JSON objects are treated as metadata and added to the
file objects in the JSON data. This includes: `<!--{ ... }-- >` and `/*{...}* /`
comments (omit the spaces inserted to prevent this text from blowing up docs.js!)

As of now, the only metadata supported by docs.js is `pin` which if set to "top"
will force the item to the top of the list, while "bottom" will force it to the
bottom.

This doc is pinned to the bottom. README is pinned to the top.

> **Aside**: the original version of this code was written by ChatGPT.
*/
/*{"pin": "bottom"}*/

const fs = require('fs')
const path = require('path')

const TRIM_REGEX = /^#+ |`/g

function metadata(content, filePath) {
  let source = content.match(/<\!\-\-(\{.*\})\-\->|\/*(\{.*\})\*\//)
  let data = {}
  if (source) {
    try {
      data = JSON.parse(source[1] || source[2])
    } catch (e) {
      console.error('bad metadata in doc', filePath)
    }
  }
  return data
}

function pinnedSort(a, b) {
  a =
    (a.pin === 'top' ? 'A' : a.pin === 'bottom' ? 'Z' : 'M') +
    a.title.toLocaleLowerCase()
  b =
    (b.pin === 'top' ? 'A' : b.pin === 'bottom' ? 'Z' : 'M') +
    b.title.toLocaleLowerCase()
  return a > b ? 1 : b > a ? -1 : 0
}

function findMarkdownFiles(dirs, ignore) {
  let markdownFiles = []

  function traverseDirectory(dir, ignore) {
    const files = fs.readdirSync(dir)
    if (ignore.includes(dir)) {
      return
    }

    files.forEach((file) => {
      const filePath = path.join(dir, file)
      const stats = fs.statSync(filePath, ignore)

      if (stats.isDirectory()) {
        traverseDirectory(filePath, ignore)
      } else if (path.extname(file) === '.md') {
        const content = fs.readFileSync(filePath, 'utf8')
        markdownFiles.push({
          text: content,
          title: content.split('\n')[0].replace(TRIM_REGEX, ''),
          filename: file,
          path: filePath,
          ...metadata(content, filePath),
        })
      } else if (['.ts', '.js', '.css'].includes(path.extname(file))) {
        const content = fs.readFileSync(filePath, 'utf8')
        let title = path.basename(file)
        const docs = content.match(/\/\*#[\s\S]+?\*\//g) || []
        if (docs.length) {
          const markdown = docs.map((s) => s.substring(3, s.length - 2).trim())
          const text = markdown.join('\n\n')
          markdownFiles.push({
            text,
            title: text.split('\n')[0].replace(TRIM_REGEX, ''),
            filename: file,
            path: filePath,
            ...metadata(content, filePath),
          })
        }
      }
    })
  }

  dirs.forEach((dir) => {
    traverseDirectory(dir, ignore)
  })

  return markdownFiles.sort(pinnedSort)
}

function saveAsJSON(data, outputFilePath) {
  const jsonData = JSON.stringify(data, null, 2)
  fs.writeFileSync(outputFilePath, jsonData, 'utf8')
}

const ignore = ['node_modules', 'third-party', 'dist', 'www', 'docs']

// Specify the directories to search for markdown files
const directoriesToSearch = ['.']

// Find all markdown files in the specified directories
const markdownFiles = findMarkdownFiles(directoriesToSearch, ignore)

// Save the markdown files as JSON
saveAsJSON(markdownFiles, './demo/docs.json')
