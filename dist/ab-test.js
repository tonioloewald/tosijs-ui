/*#
# ab-test

`<tosi-ab>` provides a simple method for implementing A|B-testing.

```js
import { AbTest } from 'tosijs-ui'

function randomize() {
  const conditions = {
    testA: Math.random() < 0.5,
    testB: Math.random() < 0.5,
    testC: Math.random() < 0.5
  }

  AbTest.conditions = conditions

  preview.querySelector('pre').innerText = JSON.stringify(conditions, null, 2)
}

preview.querySelector('.randomize-conditions').addEventListener('click', randomize)

randomize()
```
```html
<div style="display: flex; gap: 10px; align-items: center;">
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <tosi-ab class="a" condition="testA">
      <p>testA</p>
    </tosi-ab>
    <tosi-ab class="not-a" not condition="testA">
      <p>not testA</p>
    </tosi-ab>
    <tosi-ab class="b" condition="testB">
      <p>testB</p>
    </tosi-ab>
    <tosi-ab class="not-b" not condition="testB">
      <p>not testB</p>
    </tosi-ab>
    <tosi-ab class="c" condition="testC">
      <p>testC</p>
    </tosi-ab>
    <tosi-ab class="not-c" not condition="testC">
      <p>not testC</p>
    </tosi-ab>
  </div>
  <pre>
  </pre>
</div>
<button class="randomize-conditions">Randomize</button>
```
```css
.preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.preview p {
  background: #44c;
  color: white;
  display: block;
  border-radius: 99px;
  padding: 4px 10px;
  margin: 0;
}

.preview tosi-ab[not] p {
  background: red;
}
```

- Set `AbTest.conditions` to anything you like.
- Use `<tosi-ab>` elements to display conditional content.
- `condition` attribute determines which value in `AbTest.conditions` controls the element
- `not` reverses the condition (so `<tosi-ab not condition="foo">` will be visible if `conditions.foo` is `false`)
*/
import { Component } from 'tosijs';
const abTestConditions = {};
export class AbTest extends Component {
    static preferredTagName = 'tosi-ab';
    static set conditions(context) {
        Object.assign(abTestConditions, context);
        for (const abTest of [...AbTest.instances]) {
            abTest.queueRender();
        }
    }
    static initAttributes = {
        condition: '',
        not: false,
    };
    static instances = new Set();
    connectedCallback() {
        super.connectedCallback();
        AbTest.instances.add(this);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        AbTest.instances.delete(this);
    }
    render() {
        if (this.condition !== '' &&
            (this.not
                ? abTestConditions[this.condition] !== true
                : abTestConditions[this.condition] === true)) {
            this.toggleAttribute('hidden', false);
        }
        else {
            this.toggleAttribute('hidden', true);
        }
    }
}
export const abTest = AbTest.elementCreator();
