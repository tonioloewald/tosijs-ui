/*#
# month

This is a simple widget for displaying a month and selecting days within that month.

```html
<tosi-month></tosi-month>
```

*/

import { Component, PartsMap, elements } from 'tosijs'
import { xinSelect, XinSelect } from './select'
import { icons } from './icons'

const { div, label, input, span, button } = elements

const DAY_MS = 24 * 3600 * 1000
const WEEK = [0, 1, 2, 3, 4, 5, 6]
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

interface MonthParts extends PartsMap {
  month: XinSelect
  year: XinSelect
}

export class TosiMonth extends Component<MonthParts> {
  month = new Date().getMonth() + 1
  year = new Date().getFullYear()
  minYear = new Date().getFullYear() - 100
  maxYear = new Date().getFullYear() + 10
  startDay = 1 // Monday
  get endDay(): number {
    return 1 - this.startDay
  }
  get months(): {caption: string, value: string}[] {
    return MONTHS.map(value => ({
      caption: new Date(`2025-${value}-1`).toString().split(' ')[1],
      value: String(value)
    }))
  }
  get years(): string[] {
    const years = [] as number[]
    for(let year = this.minYear; year <= this.maxYear; year++) {
      years.push(String(year))
    }
    return years
  }
  
  setMonth = () => {
    this.month = this.parts.month.value
  }
  
  setYear = () => {
    this.year = this.parts.year.value
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
  
  content = () => [
    div(
      {part: 'header'},
      button(
        {
          part: 'previous',
          onClick: this.previousMonth,
        },
        icons.chevronLeft()
      ),
      span({ style: {flex: '1'}}),
      xinSelect({
        part: 'month',
        options: this.months,
        onChange: this.setMonth,
      }),
      xinSelect({
        part: 'year',
        options: this.years,
        onChange: this.setYear,
      }),
      span({ style: {flex: '1'}}),
      button(
        {
          part: 'previous',
          onClick: this.nextMonth,
        },
        icons.chevronRight()
      ),
    ),
    div({part: 'week'}),
    div({part: 'days'}),
  ]
  
  constructor() {
    super()
    this.initAttributes('month', 'year', 'startDay', 'minYear', 'maxYear')  
  }
  
  days = [] as Array<{date: Date, selected: boolean, inMonth: boolean}>
  render() {
    const { week, days, month, year } = this.parts
    const firstOfMonth = new Date(`${this.year}-${this.month}-1`)
    const startDay = new Date(firstOfMonth.valueOf() - (7 + firstOfMonth.getDay() - this.startDay) % 7 * DAY_MS)
    const nextMonth = this.month === 12 ? 1 : this.month + 1
    const lastOfMonth = new Date(new Date(`${this.year + (this.month === 12 ? 1 : 0)}-${nextMonth}-1`).valueOf() - DAY_MS)
    const endDay = new Date(lastOfMonth.valueOf() + (7 + this.endDay - lastOfMonth.getDay()) % 7 * DAY_MS)

    const weekDays = WEEK.map((day: number) => new Date(startDay.valueOf() + day * DAY_MS).toString().split(' ')[0])
    this.days = []
    for(let day = startDay.valueOf(); day <= endDay.valueOf(); day += DAY_MS) {
      const date = new Date(day)
      this.days.push({
        date,
        selected: false,
        inMonth: date.getMonth() + 1 === this.month
      })
    }
    
    month.value = String(this.month)
    year.value = String(this.year)
    year.options = this.years
    week.textContent = ''
    week.append(
      ...weekDays.map(day => span({class: 'day'}, day)),
    )
    days.textContent = ''
    days.append(
      ...this.days.map(day => label(
          {
            class: `date ${day.inMonth ? 'in-month' : ''}`.trim(),
            title: day.date.toISOString().split('T')[0]
          },
          input({type: 'checkbox', checked: day.selected}),
          day.date.getDate()
        )
      ),
    )
  }
}

export const tosiMonth = TosiMonth.elementCreator({
  tag: 'tosi-month',
  styleSpec: {
    ':host [part=header]': {
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'stretch'
    },
    ':host [part="month"], :host [part="year"]': {
      flex: '1',
    },
    ':host [part=week], :host [part=days]': {
      display: 'grid',
      gridTemplateColumns: 'auto auto auto auto auto auto auto',
      justifyItems: 'stretch'
    },
    ':host .day, :host .date': {
      padding: 5,
      display: 'flex',
      justifyContent: 'center',
      userSelect: 'none',
    },
    ':host .day': {
      color: 'hotpink'
    },
    ':host .date:not(.in-month)': {
      opacity: 0.5
    },
    ':host .date input': {
      display: 'none',
    },
    ':host .date:has(input:checked)': {
      color: 'white',
      background: 'hotpink'
    },
  }
})