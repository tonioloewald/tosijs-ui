/*!
# password strength

Just wrap it a `<xin-password-strength>` element around an `<input>`
and it will gauge its content strength as a password. It will also
let you **securely verify** that the password hasn't been breached.

```js
const { xinLocalized, localize } = xinjsui

const toggle = preview.querySelector('.toggle')
const icon = preview.querySelector('xin-icon')
const input = preview.querySelector('input')
const breach = preview.querySelector('.breach')
const output = preview.querySelector('.output')
const passwordStrength = preview.querySelector('xin-password-strength')

// Localization Example
passwordStrength.append(xinLocalized({
  refString: 'Yes',
  localeChanged () {
    this.parentElement.strengthDescriptions = [
      'unacceptable',
      'very weak',
      'weak',
      'moderate',
      'strong',
      'very strong',
    ].map(localize)
    this.parentElement.queueRender()
  }
}))

toggle.addEventListener('click', () => {
  if (icon.icon === 'eye') {
    input.type = 'text'
    icon.icon = 'eyeOff'
  } else {
    input.type = 'password'
    icon.icon = 'eye'
  }
})

breach.addEventListener('click', async () => {
  preview.querySelector('xin-password-strength').isBreached().then(isBreached => {
    output.textContent =
      isBreached
      ? 'This password has been breached, look at console for details'
      : 'Seems OK'
    output.classList.toggle('breached', isBreached)
  })
})
```
```html
<xin-password-strength>
  <input class="password" type="password">
  <button class="toggle">
    <xin-icon icon="eye"></xin-icon>
  </button>
</xin-password-strength>

<br><br>
<button class="breach">
  <xin-localized>Check if breached</xin-localized>
</button>
<div class="output"></div>
```
```css
input.password {
  box-shadow: inset 0 0 0 2px var(--indicator-color);
}

.breached {
  color: white;
  background: red;
}
```

## Algorithm

The password is assessed to have a strength based on:

- **length** one point for at least `goodLength` characters long.
- **[a-z]** one point for containing a lowercase letter
- **[A-Z]** one point for containing an uppercase letter
- **[0-9]** one point for containing a numeric character
- **^[a-zA-Z0-9]]** one point for containing some other kind of character

A password smaller than `minLength` is an automatic `0`.

## Attributes

- `minLength` defaults to `8`
- `goodLength` defaults to `12`
- `indicatorColors` six HTML colors, separated by commas, defaults to `'#f00,#f40,#f80,#ef0,#8f0,#0d4'`
- `descriptionColors` six HTML colors, sepeated by commans, defaults to `'#000,#000,#000,#000,#000,#fff'`

## Properties

- `value`, `strength` is a number from 0 to 5
- `issues` is a structure which you can use to generate feedback

```
<xin-password-strength>.issues = {
  tooShort: boolean,
  short: boolean,
  noUpper: boolean,
  noLower: boolean,
  noNumber: boolean,
  noSpecial: boolean,
}
```

## Customizing / Localizing Strings

The following properties control the feedback generated.

```
issueDescriptions = {
  tooShort: 'too short',
  short: 'short',
  noUpper: 'no upper case',
  noLower: 'no lower case',
  noNumber: 'no digits',
  noSpecial: 'no unusual characters',
}
```

```
strengthDescriptions = [
  'unacceptable',
  'very weak',
  'weak',
  'moderate',
  'strong',
  'very strong',
]
```

## `isBreached()`

`<xin-password-meter>` also provides an `isBreached(): Promise<boolean>` method
which uses [weakpass.com's API](https://weakpass.com/) to tell you if the password has been
breached.

> Note that `isBreached` does not send the plain-text password anywhere. It uses **SHA-1**
to hash the password and then sends that for lookup.

## Utility Functions

Two functions used internally for querying [Weakpass,com](https://weakpass.com/) are
provided in case they're useful on their own.

`isBreached(password: striing): Promise<boolean>` will return `true` if the password is
found in Weakpass's database (and spit out extra info to the console).

`digest(s: string, method="sha-1"): Promise<string>` is just a nice wrapper for `crypto.digest`.
*/
import { Component } from 'xinjs';
export declare const digest: (s: string, method?: string) => Promise<string>;
export declare const isBreached: (password: string) => Promise<boolean>;
export declare class XinPasswordStrength extends Component {
    minLength: number;
    goodLength: number;
    indicatorColors: string;
    descriptionColors: string;
    issues: {
        tooShort: boolean;
        short: boolean;
        noUpper: boolean;
        noLower: boolean;
        noNumber: boolean;
        noSpecial: boolean;
    };
    issueDescriptions: {
        tooShort: string;
        short: string;
        noUpper: string;
        noLower: string;
        noNumber: string;
        noSpecial: string;
    };
    value: number;
    strengthDescriptions: string[];
    constructor();
    strength(password: string): number;
    isBreached(): Promise<boolean>;
    updateIndicator: (password: string) => void;
    update: (event: Event) => void;
    content: () => any[];
    render(): void;
}
export declare const xinPasswordStrength: any;
