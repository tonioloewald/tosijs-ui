/*#
# month

This is a simple widget for displaying a month and selecting days within that month.

```html
<tosi-month></tosi-month>
```
```css
.preview tosi-month {
  margin: 10px;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 0 2px hotpink;
}
```

## `range` allows you to select date ranges
```html
<tosi-month range></tosi-month>
```

## `selectable` allows you to pick individual dates
```html
<tosi-month selectable></tosi-month>
```

## `multiple` allows you to pick multiple individual dates
```html
<tosi-month multiple></tosi-month>
```

*/

import { Component, PartsMap, elements, varDefault } from 'tosijs'
import { xinSelect, XinSelect } from './select'
import { icons } from './icons'

const { div, label, input, span, button } = elements

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
  month = new Date().getMonth() + 1
  year = new Date().getFullYear()
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
  value = {
    from: '',
    to: '',
    days: new Set<string>(),
  }

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

  setMonth = () => {
    this.month = Number(this.parts.month.value)
  }

  setYear = () => {
    this.year = Number(this.parts.year.value)
  }

  selectDate = (event: Event) => {
    const dateString = (event.target as HTMLElement)
      .closest('label')!
      .getAttribute('title') as string
    if (this.range) {
      event.stopPropagation()
      event.preventDefault()
      if (!this.value.from) {
        this.value.from = dateString
        this.value.to = dateString
      } else if (
        this.value.from === dateString &&
        this.value.to === dateString
      ) {
        this.value.from = this.value.to = ''
      } else if (this.value.from === dateString) {
        this.value.from = this.value.to
      } else if (this.value.to === dateString) {
        this.value.to = this.value.from
      } else if (dateString < this.value.from) {
        this.value.from = dateString
      } else if (dateString > this.value.to) {
        this.value.to = dateString
      } else if (dateString < this.value.from) {
        this.value.from = dateString
      } else {
        this.value.to = dateString
      }
      this.queueRender()
    } else if (this.multiple) {
      if (this.value.days.has(dateString)) {
        this.value.days.delete(dateString)
      } else {
        this.value.days.add(dateString)
      }
      this.queueRender()
    } else if (this.selectable) {
      if (this.value.days.has(dateString)) {
        this.value.days = new Set<string>()
      } else {
        this.value.days = new Set([dateString])
      }
      this.queueRender()
    }
  }

  nextMonth = () => {
    if (this.month < 12) {
      this.month += 1
    } else {
      this.year += 1
      this.month = 1
    }
  }

  previousMonth = () => {
    if (this.month > 1) {
      this.month -= 1
    } else {
      this.year -= 1
      this.month = 12
    }
  }

  checkDay = (dateString: string) => {
    if (this.selectable || this.multiple) {
      return this.value.days.has(dateString)
    } else if (this.range) {
      return (
        this.value.from &&
        dateString >= this.value.from &&
        dateString <= this.value.to
      )
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
        onChange: this.setYear,
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

  days = [] as Array<{
    date: Date
    selected: boolean
    inRange: boolean
    inMonth: boolean
    isToday: boolean
  }>
  render() {
    const { week, days, month, year, previous, next } = this.parts
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
          this.value.from &&
          dateString >= this.value.from &&
          dateString <= this.value.to
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
        return label(
          {
            class: classes.join(' '),
            title: dateString,
          },
          input({
            type: 'checkbox',
            checked: this.checkDay(dateString),
            disabled: dateSelectDisabled,
            onChange: this.selectDate,
          }),
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
      _fieldWidth: '5em',
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
    ':host .date:not(.in-month)': {
      opacity: 0.5,
    },
    ':host .date input': {
      display: 'none',
    },
    ':host .date:has(input:checked)': {
      color: 'white',
      background: 'hotpink',
    },
  },
})
