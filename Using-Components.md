# 0. Using tosijs-ui Components

<!--{}-->

> This guide explains how to use tosijs-ui components effectively.
> It's not an API reference — it's a mental model. If you've read
> [Building Apps with tosijs](https://tosijs.net/?Building-Apps),
> you know the core ideas: proxied state, path-based bindings,
> build-once DOM. This guide shows how the component library
> extends that model.

## The Element Creator Pattern

Every tosijs-ui component exports two things: a class and a function.
The function is what you use.

```typescript
import { tosiSelect } from 'tosijs-ui'

const picker = tosiSelect({
  options: 'apple,banana,cherry',
  onChange(event) {
    console.log(event.target.value)
  }
})
document.body.append(picker)
```

That's it. `tosiSelect(...)` returns a real DOM element — a
`<tosi-select>` — configured and ready to insert. You don't
instantiate the class. You don't call `new`. The element creator
is a factory that handles tag registration, attribute setup, and
returns a live custom element.

Element creators accept the same property bag as `elements.div(...)` or
any other tosijs element helper. Attributes, properties, event handlers,
children — all in one object. Bindings work too:

```typescript
tosiSelect({
  options: 'sm,md,lg',
  bindValue: app.settings.size,
})
```

Now the select is two-way bound to `app.settings.size`. When the
user picks an option, the proxy updates. When the proxy changes
from code, the select updates. No glue.

### The Anti-Pattern: Manually Querying and Testing Tags

Don't do this:

```typescript
// WRONG — fighting the framework
const el = document.querySelector('[data-role="size-picker"]')
if (el && el.tagName === 'TOSI-SELECT') {
  (el as any).value = 'md'
}
```

Do this:

```typescript
// RIGHT — bind state, let the framework handle it
app.settings.size.value = 'md'
```

If you're checking tag names or casting to `any`, you've left the
binding model. The whole point is that your code manipulates state,
and bindings propagate changes to the DOM. You should rarely need
a reference to the element at all.

## Value, Change, and Action

tosijs-ui components follow the HTML contract: they have a `value`
property and fire `change` when it changes. This is deliberate —
they're drop-in replacements for native controls, not a parallel
universe.

```typescript
const rating = tosiRating({
  max: 5,
  onChange() { console.log(rating.value) }
})
```

`tosiSelect` also fires `action` — this means the user picked
something, even if the value didn't change (e.g. re-selecting
the current option). `change` is for state; `action` is for
intent. Note that menus use `action` callbacks in their config
objects — that's a different mechanism, not a DOM event.

Most of the time you won't use either event directly. Bind the
value to a proxy path and let tosijs handle synchronization:

```typescript
tosiRating({ bindValue: app.review.stars })
```

## Form-Associated Components

Several components — `tosiSelect`, `tosiRating`, `tosiSegmented`,
`tosiTagList` — are form-associated. They work inside a native
`<form>` with a `name` attribute, just like `<input>`:

```typescript
const { form, label } = elements

form(
  { onSubmit(e) { e.preventDefault(); /* read FormData */ } },
  label('Size'),
  tosiSelect({ name: 'size', options: 'sm,md,lg', required: true }),
  label('Rating'),
  tosiRating({ name: 'rating', required: true }),
)
```

They participate in form validation (`required`, `checkValidity`)
and appear in `FormData` automatically. No wrappers needed.

For structured forms with auto-layout, use `tosiForm` and `tosiField`:

```typescript
tosiForm(
  {
    value: { name: '', size: 'md', rating: 3 },
    submitCallback(value, isValid) {
      if (isValid) saveReview(value)
    }
  },
  tosiField({ caption: 'Name', key: 'name' }),
  tosiField(
    { caption: 'Size', key: 'size' },
    tosiSelect({ slot: 'input', options: 'sm,md,lg' })
  ),
  tosiField(
    { caption: 'Rating', key: 'rating' },
    tosiRating({ slot: 'input', max: 5 })
  ),
)
```

`tosiField` wraps each control with a label and validation state.
Use the `input` slot to replace the default `<input>` with any
component.

## The Components

### Select

```typescript
import { tosiSelect } from 'tosijs-ui'

// Simple — comma-delimited string
tosiSelect({ options: 'red,green,blue' })

// With captions — value=caption
tosiSelect({ options: 'us=United States,uk=United Kingdom' })

// With icons — value=caption:icon
tosiSelect({ options: 'us=United States:flag,uk=United Kingdom:flag' })

// Programmatic — array with separators and submenus
tosiSelect({
  options: [
    { caption: 'Small', value: 'sm', icon: 'minimize' },
    { caption: 'Large', value: 'lg', icon: 'maximize' },
    null,  // separator
    { caption: 'Custom...', value: async () => {
      const size = await TosiDialog.prompt('Enter size:')
      return size ?? undefined  // undefined = cancel
    }}
  ]
})

// Editable — user can type
tosiSelect({ editable: true, options: 'red,green,blue' })
```

### Dialog

```typescript
import { TosiDialog, tosiDialog } from 'tosijs-ui'

// One-liners — static methods return promises
await TosiDialog.alert('Saved successfully')
const ok = await TosiDialog.confirm('Delete this item?')
const name = await TosiDialog.prompt('Enter name:', 'New Item', 'Untitled')

// Custom dialog — build your own content
const dialog = tosiDialog(
  { removeOnClose: true },
  div({ slot: 'header' }, 'Pick a Color'),
  div(
    tosiSelect({ options: 'red,green,blue' }),
  ),
  div({ slot: 'footer' },
    button({ onClick() { dialog.close('cancel') } }, 'Cancel'),
    button({ onClick() { dialog.ok() } }, 'OK'),
  )
)
document.body.append(dialog)
const result = await dialog.showModal()  // 'confirm' or 'cancel'
```

### Notifications

```typescript
import { postNotification } from 'tosijs-ui'

// Simple
postNotification('File saved')

// With options
postNotification({
  message: 'Upload complete',
  type: 'success',
  duration: 3,  // seconds; omit for persistent
})

// Progress
const close = postNotification({
  message: 'Uploading...',
  type: 'progress',
  progress: () => uploadPercent,  // return 0-100; 100+ auto-closes
})

// Close programmatically
close()
```

### Data Table

```typescript
import { tosiTable } from 'tosijs-ui'

// Minimal — columns auto-generated from data
tosiTable({
  value: {
    array: [
      { id: 1, name: 'Alice', score: 95 },
      { id: 2, name: 'Bob', score: 87 },
    ]
  }
})

// With column config
tosiTable({
  select: true,
  multiple: true,
  rowHeight: 36,
  selectionChanged(rows) {
    console.log('selected:', rows)
  },
  value: {
    array: data,
    columns: [
      { prop: 'name', name: 'Name', width: 200 },
      { prop: 'score', name: 'Score', width: 100, align: 'right' },
    ],
    filter: (rows) => rows.filter(r => r.score > 50),
  }
})
```

Virtual scrolling is on by default. Set `rowHeight: 0` to render
all rows (for small datasets where you want natural height).

### Tabs

```typescript
import { tosiTabs } from 'tosijs-ui'

tosiTabs(
  div({ name: 'Code' }, codeEditor({ mode: 'javascript' })),
  div({ name: 'Preview' }, previewContainer),
  div({ name: 'Tests', 'data-close': '' }, testResults),  // closeable tab
)
```

Children become tabs. The `name` attribute becomes the tab label.
Add `data-close` for a close button. Use `value` (0-based index)
to control the active tab programmatically.

### Segmented Control

```typescript
import { tosiSegmented } from 'tosijs-ui'

// Single selection (radio-like)
tosiSegmented({ options: 'sm,md,lg', bindValue: app.size })

// Multiple selection (checkbox-like)
tosiSegmented({
  multiple: true,
  options: 'bold,italic,underline',
  bindValue: app.formatting,  // comma-delimited: "bold,italic"
})
```

### Rating

```typescript
import { tosiRating } from 'tosijs-ui'

tosiRating({ max: 5, bindValue: app.review.stars })
tosiRating({ max: 10, icon: 'heart', step: 0.5, readonly: true })
```

### Tag List

```typescript
import { tosiTagList } from 'tosijs-ui'

tosiTagList({
  textEntry: true,
  availableTags: 'javascript,typescript,python,rust,go',
  bindValue: app.post.tags,  // comma-delimited: "javascript,rust"
})
```

### Icons

```typescript
import { icons } from 'tosijs-ui'

// icons is a proxy — any property returns an SVG element factory
icons.star()           // <svg class="tosi-icon">...</svg>
icons.chevronDown()
icons.heart()

// Use in element trees
button(icons.save(), 'Save')
div({ style: { height: '64px' } }, icons.tosiUi())
```

300+ icons sourced from Feather Icons plus custom additions. The
proxy pattern means you get autocomplete in your editor and a clear
error at runtime if an icon doesn't exist.

### Menus

```typescript
import { popMenu } from 'tosijs-ui'

button({
  onClick(event) {
    popMenu({
      target: event.target,
      menuItems: [
        { caption: 'Cut', shortcut: '⌘X', action: cut },
        { caption: 'Copy', shortcut: '⌘C', action: copy },
        null,  // separator
        { caption: 'Format',
          menuItems: [  // submenu
            { caption: 'Bold', action: bold },
            { caption: 'Italic', action: italic },
          ]
        },
      ]
    })
  }
}, 'Options')
```

`popMenu` creates a floating menu anchored to the target element.
Menu items can have icons, keyboard shortcuts, computed
`enabled`/`checked` states, submenus, and async actions.

## Theming

tosijs-ui uses CSS custom properties for all styling. No classes
to toggle, no theme objects to thread through components.

```typescript
import { Color } from 'tosijs'
import { createTheme, createDarkTheme, applyTheme } from 'tosijs-ui'

const colors = {
  accent: Color.fromCss('#007AFF'),
  background: Color.fromCss('#ffffff'),
  text: Color.fromCss('#1a1a1a'),
}

const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
applyTheme(prefersDark ? createDarkTheme(colors) : createTheme(colors))
```

This writes CSS variables to `:root`. Every component reads them.
Dark mode is a recomputation from the same brand colors, not a
separate palette.

The base variables use `--tosi-*` prefixes:

- `--tosi-accent`, `--tosi-bg`, `--tosi-text` — core colors
- `--tosi-spacing`, `--tosi-font-size`, `--tosi-touch-size` — metrics
- `--tosi-border-radius`, `--tosi-shadow`, `--tosi-transition` — decoration

Components derive their own variables with fallbacks:
`--tosi-select-gap` defaults to `var(--tosi-spacing-sm)`.
Override at any level in the CSS cascade.

## Localization

```typescript
import { initLocalization, setLocale, localize } from 'tosijs-ui'

// TSV format — 5 header rows, then translatable strings:
//   Row 1: locale codes
//   Row 2: (skipped)
//   Row 3: language names in reference language
//   Row 4: language names in native language
//   Row 5: flag emoji
//   Row 6+: translatable strings (first column is the key)
initLocalization(`en-US\tfr\tfi
\t\t
English\tFrench\tFinnish
English (US)\tFrançais\tsuomi
🇺🇸\t🇫🇷\t🇫🇮
Ok\tD'accord\tOk
Cancel\tAnnuler\tPeruuttaa`)

setLocale('fr')
console.log(localize('Cancel'))  // "Annuler"
```

Components with `localized: true` (select, tabs, segmented, etc.)
automatically re-render when the locale changes. Use `tosiLocalized`
for localizing arbitrary text:

```typescript
import { tosiLocalized } from 'tosijs-ui'

h1(tosiLocalized({ refString: 'Welcome' }))
```

## The Checklist

When using a tosijs-ui component, ask yourself:

1. **Am I binding to proxy state?** If not, why not? Direct
   manipulation means you're maintaining synchronization manually.

2. **Am I using the element creator?** `tosiSelect({...})` not
   `new TosiSelect()` or `document.createElement('tosi-select')`.

3. **Am I fighting the DOM?** If you're querying for elements by
   tag name, casting to `any`, or manually setting properties in
   event handlers, step back. Bind to state. Let the framework
   propagate.

4. **Am I overriding styles correctly?** CSS custom properties,
   not `!important`. Override `--tosi-accent` to change the brand
   color everywhere, or `--tosi-select-gap` for one component.

5. **Am I using form association?** If the component is in a form,
   give it a `name` attribute. It participates in `FormData` and
   validation automatically — no wrapper needed.
