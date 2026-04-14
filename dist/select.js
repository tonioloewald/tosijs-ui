/*#
# select

`<tosi-select>` (`tosiSelect` is the `ElementCreator`) is a replacement for the lamentable
built in `<select>` element that addresses its various shortcomings.

- since `<tosi-select>` is powered by `popMenu`, and supports separators and submenus.
- options can have icons.
- `<tosi-select>` will retain and display a value even if the matching option is missing.
- its displayed value can be made `editable`, allowing use as a "combo box".
- options can have `async` callbacks that return a value.
- picking an item triggers an `action` event even if the value hasn't changed.
- available options are set via the `options` attribute or the element's `options` property (not `<option>` elements)

```js
const { tosiSelect } = tosijsui
const { icons } = tosijsui

const simpleSelect = tosiSelect({
  title: 'simple select',
  options: 'this,that,,the other',
  value: 'not an option!'
})

const captionsSelect = tosiSelect({
  showIcon: true,
  title: 'has captions',
  class: 'captions',
  value: 'image'
})

const iconsSelect = tosiSelect({
  showIcon: true,
  title: 'combo select with icons',
  class: 'icons',
  editable: true,
  placeholder: 'pick an icon'
})

const iconsOnly = tosiSelect({
  showIcon: true,
  hideCaption: true,
  title: 'icons only',
  class: 'icons-only',
  placeholder: 'pick an icon'
})

preview.append(
  simpleSelect,
  document.createElement('br'),
  captionsSelect,
  document.createElement('br'),
  iconsSelect,
  document.createElement('br'),
  iconsOnly
)

captionsSelect.options = [
  {
    caption: 'a heading',
    value: 'heading'
  },
  {
    caption: 'a paragraph',
    value: 'paragraph'
  },
  null,
  {
    caption: 'choose some other',
    options: [
      {
        icon: 'image',
        caption: 'an image',
        value: 'image'
      },
      {
        icon: 'fileText',
        caption: 'a text file',
        value: 'text',
      },
      {
        icon: 'video',
        caption: 'a video',
        value: 'video'
      },
      null,
      {
        caption: 'anything goes…',
        value: () => prompt('Enter your other', 'other') || undefined
      },
      {
        caption: 'brother… (after 1s delay)',
        value: async () => new Promise(resolve => {
          setTimeout(() => resolve('brother'), 1000)
        })
      }
    ]
  }
]

iconsSelect.options = iconsOnly.options = Object.keys(icons).sort().map(icon =>({
  icon,
  caption: icon,
  value: icon
}))

preview.addEventListener('action', (event) => {
  console.log(event.target.title, 'user picked', event.target.value)
}, true)

preview.addEventListener('change', (event) => {
  console.log(event.target.title, 'changed to', event.target.value)
}, true)
```
```test
const selects = preview.querySelectorAll('tosi-select')
test('selects render', () => {
  expect(selects.length).toBe(4)
})
test('simple select has value', () => {
  expect(selects[0].value).toBe('not an option!')
})
test('captions select has value', () => {
  expect(selects[1].value).toBe('image')
})
```

## Form Integration

`<tosi-select>` is form-associated, meaning it works directly in native `<form>` elements:

```html
<form>
  <tosi-select name="choice" options="a,b,c" required></tosi-select>
  <button type="submit">Submit</button>
</form>
```

## `options`

    type OptionRequest = () => Promise<string | undefined>

    export interface SelectOption {
      icon?: string | HTMLElement
      caption: string
      value: string | OptionRequest
    }

    export interface SelectOptionSubmenu {
      icon?: string | HTMLElement
      caption: string
      options: SelectOptions
    }

    export type SelectOptions = Array<string | null | SelectOption | SelectOptionSubmenu>

A `<tosi-select>` can be assigned `options` as a string of comma-delimited choices
in the format `value=caption:icon` (where caption and icon are optional),
or be provided a `SelectOptions` array (which allows for submenus, separators, etc.).

Examples:
- `"apple,banana,cherry"` - simple values (value equals caption)
- `"us=United States,uk=United Kingdom"` - value with caption
- `"us=United States:flag,uk=United Kingdom:flag"` - value with caption and icon

## Attributes

`<tosi-select>` supports several attributes:

- `editable` lets the user directly edit the value (like a "combo box").
- `show-icon` displays the icon corresponding to the currently selected value.
- `hide-caption` hides the caption.
- `placeholder` allows you to set a placeholder.
- `options` allows you to assign options as a comma-delimited string attribute.
- `required` marks the field as required for form validation.
- `name` the form field name (for formAssociated support).

## Events

Picking an option triggers an `action` event (whether or not this changes the value).

Changing the value, either by typing in an editable `<tosi-select>` or picking a new
value triggers a `change` event.

You can look at the console to see the events triggered by the second example.

## Localization

`<tosi-select>` supports the `localized` attribute which automatically localizes
options.

```js
const { tosiSelect } = tosijsui

preview.append(
  tosiSelect({
    localized: true,
    placeholder: 'localized placeholder',
    options: 'yes,no,,moderate'
  })
)
```
*/
import { Component, elements, vars, throttle, deprecated, } from 'tosijs';
import { icons } from './icons';
import { popMenu, removeLastMenu, resolveMenuItems, } from './menu';
import { localize, XinLocalized } from './localize';
const { button, span, input } = elements;
const hasValue = (options, value) => {
    return !!options.find((option) => {
        if (option === null || value == null) {
            return false;
        }
        else if (Array.isArray(option)) {
            return hasValue(option, value);
        }
        else if (option.value === value || option === value) {
            return true;
        }
    });
};
export class TosiSelect extends Component {
    static preferredTagName = 'tosi-select';
    static formAssociated = true;
    static lightStyleSpec = {
        ':host': {
            // New --tosi-select-* variables with defaults deriving from base theme
            '--tosi-select-gap': 'var(--tosi-spacing-sm, 8px)',
            '--tosi-select-touch-size': 'var(--tosi-touch-size, 44px)',
            '--tosi-select-padding': '0 var(--tosi-spacing-sm, 8px)',
            '--tosi-select-value-padding': '0 var(--tosi-spacing-sm, 8px)',
            '--tosi-select-icon-width': '24px',
            '--tosi-select-field-width': '140px',
            // Legacy aliases for backward compatibility
            '--gap': 'var(--tosi-select-gap)',
            '--touch-size': 'var(--tosi-select-touch-size)',
            '--padding': 'var(--tosi-select-padding)',
            '--value-padding': 'var(--tosi-select-value-padding)',
            '--icon-width': 'var(--tosi-select-icon-width)',
            '--fieldWidth': 'var(--tosi-select-field-width)',
            display: 'inline-flex',
            position: 'relative',
        },
        ':host button': {
            display: 'flex',
            alignItems: 'center',
            justifyItems: 'center',
            gap: vars.tosiSelectGap,
            textAlign: 'left',
            height: vars.tosiSelectTouchSize,
            padding: vars.tosiSelectPadding,
            position: 'relative',
            width: '100%',
        },
        ':host:not([show-icon]) button > :first-child': {
            display: 'none',
        },
        ':host[hide-caption] button > :nth-child(2)': {
            display: 'none',
        },
        ':host [part="value"]': {
            width: vars.tosiSelectFieldWidth,
            padding: vars.tosiSelectValuePadding,
            height: vars.tosiSelectTouchSize,
            lineHeight: vars.tosiSelectTouchSize,
            boxShadow: 'none',
            whiteSpace: 'nowrap',
            outline: 'none',
            background: 'transparent',
            flex: '1',
        },
        ':host [part="value"]:not(:focus)': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: 'transparent',
        },
    };
    static initAttributes = {
        editable: false,
        placeholder: '',
        showIcon: false,
        hideCaption: false,
        localized: false,
        disabled: false,
        required: false,
        name: '',
    };
    _options = [];
    get options() {
        return this._options;
    }
    set options(v) {
        if (typeof v === 'string') {
            this._options = TosiSelect.parseOptionsString(v);
        }
        else {
            this._options = v;
        }
        this.queueRender();
    }
    // Parse options string format: value=caption:icon (caption and icon are optional)
    static parseOptionsString(optionsStr) {
        return optionsStr.split(',').map((option) => {
            const trimmed = option.trim();
            if (trimmed === '')
                return null;
            const [value, remains] = trimmed.split('=').map((v) => v.trim());
            if (!remains) {
                // Simple format: just "value" means value=caption
                return { value, caption: value };
            }
            const [caption, iconName] = remains.split(':').map((v) => v.trim());
            return {
                value,
                caption: caption || value,
                icon: iconName || undefined,
            };
        });
    }
    value = '';
    filter = '';
    isExpanded = false;
    // Form-associated lifecycle callbacks
    formDisabledCallback(disabled) {
        this.disabled = disabled;
    }
    formResetCallback() {
        this.value = '';
    }
    setValue = (value, triggerAction = false) => {
        if (this.value !== value) {
            this.value = value;
            this.queueRender(true);
        }
        if (triggerAction) {
            this.dispatchEvent(new Event('action'));
        }
    };
    getValue = () => this.value;
    get selectOptions() {
        return this.options;
    }
    buildOptionMenuItem = (option) => {
        if (option === null) {
            return null;
        }
        const { setValue, getValue } = this;
        let icon;
        let caption;
        let value;
        let tooltip;
        if (typeof option === 'string') {
            caption = value = option;
        }
        else {
            ;
            ({ icon, caption, value, tooltip } = option);
        }
        if (this.localized) {
            caption = localize(caption);
        }
        const { options } = option;
        if (options) {
            return {
                icon,
                caption,
                tooltip,
                checked: () => hasValue(options, getValue()),
                menuItems: options.map(this.buildOptionMenuItem),
            };
        }
        return {
            icon,
            caption,
            tooltip,
            checked: () => getValue() === value,
            action: typeof value === 'function'
                ? async () => {
                    const newValue = await value();
                    if (newValue !== undefined) {
                        setValue(newValue, true);
                    }
                }
                : () => {
                    if (typeof value === 'string') {
                        setValue(value, true);
                    }
                },
        };
    };
    poppedOptions = [];
    get optionsMenu() {
        const options = this.selectOptions.map(this.buildOptionMenuItem);
        if (this.filter === '') {
            return options;
        }
        const showOption = (option) => {
            if (option === null) {
                return true;
            }
            else if (option.menuItems) {
                const resolved = resolveMenuItems(option.menuItems);
                option.menuItems = resolved.filter(showOption);
                return resolved.length > 0;
            }
            else {
                return option.caption.toLocaleLowerCase().includes(this.filter);
            }
        };
        return options.filter(showOption);
    }
    handleChange = (event) => {
        const { value } = this.parts;
        const newValue = value.value || '';
        if (this.value !== String(newValue)) {
            this.value = newValue;
            this.dispatchEvent(new Event('change'));
        }
        this.filter = '';
        event.stopPropagation();
        event.preventDefault();
    };
    handleKey = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    };
    filterMenu = throttle(() => {
        this.filter = this.parts.value.value.toLocaleLowerCase();
        removeLastMenu(0);
        this.popOptions();
    });
    popOptions = (event) => {
        if (event && event.type === 'click') {
            this.filter = '';
        }
        this.poppedOptions = this.optionsMenu;
        this.isExpanded = true;
        this.updateAriaExpanded();
        popMenu({
            target: this,
            menuItems: this.poppedOptions,
            showChecked: true,
            role: 'listbox',
            onClose: () => {
                this.isExpanded = false;
                this.updateAriaExpanded();
            },
        });
    };
    updateAriaExpanded() {
        const { value } = this.parts;
        value.setAttribute('aria-expanded', String(this.isExpanded));
    }
    content = () => [
        button({
            type: 'button',
            part: 'button',
            onClick: this.popOptions,
        }, span(), input({
            part: 'value',
            value: this.value,
            tabindex: 0,
            role: 'combobox',
            ariaHaspopup: 'listbox',
            ariaExpanded: 'false',
            ariaAutocomplete: this.editable ? 'list' : 'none',
            onKeydown: this.handleKey,
            onInput: this.filterMenu,
            onChange: this.handleChange,
        }), icons.chevronDown()),
    ];
    get allOptions() {
        const all = [];
        function flatten(some) {
            for (const option of some) {
                if (typeof option === 'string') {
                    all.push({ caption: option, value: option });
                }
                else if (option?.value) {
                    all.push(option);
                }
                else if (option?.options) {
                    flatten(option.options);
                }
            }
        }
        flatten(this.selectOptions);
        return all;
    }
    findOption() {
        const found = this.allOptions.find((option) => option.value === this.value);
        return found || { caption: this.value, value: this.value };
    }
    localeChanged = () => {
        this.queueRender();
    };
    connectedCallback() {
        super.connectedCallback();
        // Parse options from HTML attribute if present and not already set programmatically
        const optionsAttr = this.getAttribute('options');
        if (optionsAttr && this._options.length === 0) {
            this._options = TosiSelect.parseOptionsString(optionsAttr);
        }
        if (this.localized) {
            XinLocalized.allInstances.add(this);
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.localized) {
            XinLocalized.allInstances.delete(this);
        }
    }
    render() {
        super.render();
        const { value, button } = this.parts;
        button.disabled = this.disabled;
        const icon = value.previousElementSibling;
        const option = this.findOption();
        let newIcon = span();
        value.value = this.localized ? localize(option.caption) : option.caption;
        if (option.icon) {
            if (option.icon instanceof HTMLElement) {
                newIcon = option.icon.cloneNode(true);
            }
            else {
                newIcon = icons[option.icon]();
            }
        }
        icon.replaceWith(newIcon);
        value.setAttribute('placeholder', this.localized ? localize(this.placeholder) : this.placeholder);
        value.style.pointerEvents = this.editable ? '' : 'none';
        value.readOnly = !this.editable;
    }
}
/** @deprecated Use TosiSelect instead */
export const XinSelect = TosiSelect;
export const tosiSelect = TosiSelect.elementCreator();
/** @deprecated Use tosiSelect instead (tag is now tosi-select) */
export const xinSelect = deprecated((...args) => tosiSelect(...args), 'xinSelect is deprecated, use tosiSelect instead (tag is now <tosi-select>)');
