/*#
# month

This is a component for displaying a month and selecting days within that month.

If the user changes the `month` or `year` the component's `monthChanged(year, month)`
method will be called.

The current date is `[part="today"]` and can easily be targeted for styling.

```js
const { tosiMonth, postNotification } = tosijsui

preview.append(tosiMonth({
  monthChanged(year, month) {
    postNotification({
      icon: 'calendar',
      message: `Month changed to ${year}-${month}`,
      color: 'hotpink',
      duration: 2,
    })
  }
}))
```
```css
.preview tosi-month {
  margin: 10px;
  border-radius: 5px;
  box-shadow: 0 0 0 2px hotpink;
}
```

## `selectable`

Setting `selectable` allows the user to pick individual dates. It's just a friendlier date picker.

The value of the component is an ISO date string, as per `<input type="date">`.

```html
<tosi-month selectable></tosi-month>
```
```js
const month = preview.querySelector('tosi-month')
month.addEventListener('change', event => console.log('date picked', event.target.value))
```

## `range`

Setting `range` allows the user to select date ranges.

```html
<tosi-month range></tosi-month>
```
```js
const month = preview.querySelector('tosi-month')
month.addEventListener('change', event => console.log('date range', event.target.value))
```

## `multiple`

This allows the user to pick multiple individual dates

```html
<tosi-month multiple></tosi-month>
```
```js
const month = preview.querySelector('tosi-month')
month.addEventListener('change', event => console.log('multple dates', event.target.value))
```

## `readonly` and `disabled`

These prevent the user from changing the displayed month. This example is `readonly`.

```html
<tosi-month readonly value="1976-04-01"></tosi-month>
```

*/

import { Component, PartsMap, elements, varDefault } from 'tosijs'
import { xinSelect, XinSelect } from './select'
import { icons } from './icons'

const { div, span, button } = elements

const DAY_MS = 24 * 3600 * 1000
const WEEK = [0, 1, 2, 3, 4, 5, 6]
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

// Note this is because Safari is super strict about leading zeros
const padLeft = (value: string | number, length = 2, padding = '0'): string =>
  String(value).padStart(length, padding)
const dateFromYMD = (year: number, month: number, date: number): Date =>
  new Date(`${year}-${padLeft(month)}-${padLeft(date)}`)

interface MonthParts extends PartsMap {
  month: XinSelect
  year: XinSelect
  previous: HTMLButtonElement
  next: HTMLButtonElement
}

export class TosiMonth extends Component<MonthParts> {
  month = NaN
  year = NaN
  minDate = dateFromYMD(new Date().getFullYear() - 100, 1, 1)
    .toISOString()
    .split('T')[0]
  maxDate = dateFromYMD(new Date().getFullYear() + 10, 12, 31)
    .toISOString()
    .split('T')[0]
  startDay = 1 // Monday
  selectable = false
  multiple = false
  range = false
  disabled = false
  readonly = false
  selectedDays = [] as string[]
  value = ''

  get endDay(): number {
    return 1 - this.startDay
  }
  get months(): { caption: string; value: string }[] {
    return MONTHS.map((value) => ({
      caption: dateFromYMD(2025, value, 1).toString().split(' ')[1],
      value: String(value),
    }))
  }
  get years(): string[] {
    const startYear = Number(this.minDate.split('-')[0])
    const endYear = Number(this.maxDate.split('-')[0])
    const years = [] as string[]
    for (let year = startYear; year <= endYear; year++) {
      years.push(String(year))
    }
    return years
  }

  monthChanged = (year: number, month: number) => {}

  gotoMonth(year: number, month: number) {
    if (this.month !== month || this.year !== year) {
      this.month = month
      this.year = year
      this.monthChanged(year, month)
    }
  }

  setMonth = () => {
    this.gotoMonth(
      Number(this.parts.year.value),
      Number(this.parts.month.value)
    )
  }

  get to(): string {
    return this.selectedDays[1] || ''
  }

  set to(dateString: string) {
    this.selectedDays[1] = dateString
    this.selectedDays.splice(2)
  }

  get from(): string {
    return this.selectedDays[0] || ''
  }

  set from(dateString: string) {
    this.selectedDays[0] = dateString
    this.selectedDays.splice(2)
  }

  clickDate = (event: Event) => {
    const dateString = (event.target as HTMLElement).getAttribute(
      'title'
    ) as string
    this.selectDate(dateString)
  }

  keyDate = (event: KeyboardEvent) => {
    let stopEvent = false
    switch (event.code) {
      case 'Space':
        const dateString = (event.target as HTMLElement).getAttribute(
          'title'
        ) as string
        this.selectDate(dateString)
        stopEvent = true
        break
      case 'Tab':
        break
      default:
        console.log(event)
    }
    if (stopEvent) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  selectDate = (dateString: string) => {
    if (this.range) {
      if (!this.to) {
        this.selectedDays = [dateString, dateString]
      } else if (this.from === dateString && this.to === dateString) {
        this.selectedDays = []
      } else if (this.from === dateString) {
        this.from = this.to
      } else if (this.to === dateString) {
        this.to = this.from
      } else if (dateString < this.from) {
        this.from = dateString
      } else if (dateString > this.to) {
        this.to = dateString
      } else if (dateString < this.from) {
        this.from = dateString
      } else {
        this.to = dateString
      }
      this.value = `${this.from},${this.to}`
    } else if (this.multiple) {
      if (this.selectedDays.includes(dateString)) {
        this.selectedDays.splice(this.selectedDays.indexOf(dateString), 1)
      } else {
        this.selectedDays.push(dateString)
        this.selectedDays.sort()
      }
      this.value = this.selectedDays.join(',')
    } else if (this.selectable) {
      if (this.selectedDays.includes(dateString)) {
        this.value = ''
        this.selectedDays = []
      } else {
        this.value = dateString
        this.selectedDays = [dateString]
      }
    }
  }

  nextMonth = () => {
    if (this.month < 12) {
      this.gotoMonth(this.year, this.month + 1)
    } else {
      this.gotoMonth(this.year + 1, 1)
    }
  }

  previousMonth = () => {
    if (this.month > 1) {
      this.gotoMonth(this.year, this.month - 1)
    } else {
      this.gotoMonth(this.year - 1, 12)
    }
  }

  checkDay = (dateString: string) => {
    if (!this.range) {
      return this.selectedDays.includes(dateString)
    } else if (this.range) {
      return this.from && dateString >= this.from && dateString <= this.to
    }
    return false
  }

  content = () => [
    div(
      { part: 'header' },
      button(
        {
          part: 'previous',
          onClick: this.previousMonth,
        },
        icons.chevronLeft()
      ),
      span({ style: { flex: '1' } }),
      xinSelect({
        part: 'month',
        options: this.months,
        onChange: this.setMonth,
      }),
      xinSelect({
        part: 'year',
        options: [this.year],
        onChange: this.setMonth,
      }),
      span({ style: { flex: '1' } }),
      button(
        {
          part: 'next',
          onClick: this.nextMonth,
        },
        icons.chevronRight()
      )
    ),
    div({ part: 'week' }),
    div({ part: 'days' }),
  ]

  gotoDate(dateString: string) {
    const date = new Date(dateString)
    this.gotoMonth(date.getFullYear(), date.getMonth() + 1)
  }

  constructor() {
    super()
    this.initAttributes(
      'month',
      'year',
      'startDay',
      'minDate',
      'maxDate',
      'selectable',
      'multiple',
      'range',
      'disabled',
      'readonly'
    )
  }

  connectedCallback() {
    super.connectedCallback()
    const date = new Date(this.value.split(',').pop() || Date.now())
    if (isNaN(this.month)) {
      this.month = date.getMonth() + 1
    }
    if (isNaN(this.year)) {
      this.year = date.getFullYear()
    }
  }
  days = [] as Array<{
    date: Date
    selected: boolean
    inRange: boolean
    inMonth: boolean
    isToday: boolean
  }>
  render() {
    const { week, days, month, year, previous, next } = this.parts
    this.selectedDays = this.value ? this.value.split(',') : []
    const firstOfMonth = dateFromYMD(this.year, this.month, 1)
    const startDay = new Date(
      firstOfMonth.valueOf() -
        ((7 + firstOfMonth.getDay() - this.startDay) % 7) * DAY_MS
    )
    const nextMonth = this.month === 12 ? 1 : this.month + 1
    const lastOfMonth = new Date(
      dateFromYMD(
        this.year + (this.month === 12 ? 1 : 0),
        nextMonth,
        1
      ).valueOf() - DAY_MS
    )
    const endDay = new Date(
      lastOfMonth.valueOf() +
        ((7 + this.endDay - lastOfMonth.getDay()) % 7) * DAY_MS
    )

    const weekDays = WEEK.map(
      (day: number) =>
        new Date(startDay.valueOf() + day * DAY_MS).toString().split(' ')[0]
    )
    this.days = []
    const today = new Date().toISOString().split('T')[0]
    for (let day = startDay.valueOf(); day <= endDay.valueOf(); day += DAY_MS) {
      const date = new Date(day)
      const dateString = date.toISOString().split('T')[0]
      this.days.push({
        date,
        selected: false,
        inMonth: date.getMonth() + 1 === this.month,
        isToday: dateString === today,
        inRange: !!(
          this.from &&
          dateString >= this.from &&
          dateString <= this.to
        ),
      })
    }

    month.value = String(this.month)
    year.value = String(this.year)
    const isDisabled =
      (month.disabled =
      year.disabled =
      previous.disabled =
      next.disabled =
        this.disabled || this.readonly)
    const dateSelectDisabled =
      isDisabled || (!this.selectable && !this.range && !this.multiple)
    year.options = this.years
    week.textContent = ''
    week.append(...weekDays.map((day) => span({ class: 'day' }, day)))
    days.textContent = ''
    days.append(
      ...this.days.map((day) => {
        const classes = ['date']
        if (day.inMonth) {
          classes.push('in-month')
        }
        if (day.isToday) {
          classes.push('today')
        }
        const dateString = day.date.toISOString().split('T')[0]
        if (this.checkDay(dateString)) {
          classes.push('checked')
        }
        return span(
          {
            class: classes.join(' '),
            title: dateString,
            onClick: this.clickDate,
            onKeydown: this.keyDate,
            tabindex: '0',
          },
          day.date.getDate()
        )
      })
    )
  }
}

export const tosiMonth = TosiMonth.elementCreator({
  tag: 'tosi-month',
  styleSpec: {
    ':host': {
      display: 'block',
    },
    ':host [part=header]': {
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'stretch',
    },
    ':host[disabled]': {
      pointerEvents: 'none',
      opacity: varDefault.disabledOpacity(0.6),
    },
    ':host [part="month"], :host [part="year"]': {
      _fieldWidth: '4em',
      flex: '1',
    },
    ':host [part=week], :host [part=days]': {
      display: 'grid',
      gridTemplateColumns: 'auto auto auto auto auto auto auto',
      justifyItems: 'stretch',
    },
    ':host .today': {
      background: varDefault.todayBackground('transparent'),
      boxShadow: varDefault.todayShadow(`inset 0 0 2px 1px currentcolor`),
    },
    ':host .day, :host .date': {
      padding: 5,
      display: 'flex',
      justifyContent: 'center',
      userSelect: 'none',
    },
    ':host .day': {
      color: 'hotpink',
    },
    ':host .date': {
      cursor: 'default',
    },
    ':host .date:not(.in-month)': {
      opacity: 0.5,
    },
    ':host .date.checked': {
      color: 'white',
      background: 'hotpink',
    },
  },
})
