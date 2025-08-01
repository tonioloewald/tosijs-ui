/*#
# month

```html
<tosi-month></tosi-month>
```

*/

import { Component, PartsMap, elements } from 'tosijs'

const { div, label, input, span } = elements

const DAY_MS = 24 * 3600 * 1000
const WEEK = [0, 1, 2, 3, 4, 5, 6]

export class TosiMonth extends Component {
  month = new Date().getMonth() + 1
  year = new Date().getFullYear()
  startDay = 1 // Monday
  get endDay(): number {
    return 1 - this.startDay
  }
  
  content = () => [
    div({part: 'month'}),
    div({part: 'week'}),
    div({part: 'days'}),
  ]
  
  constructor() {
    super()
    this.initAttributes('month', 'year', 'startDay')  
  }
  
  days = [] as Array<{date: Date, selected: boolean, inMonth: boolean}>
  render() {
    const { week, days } = this.parts
    const firstOfMonth = new Date(`${this.year}-${this.month}-1`)
    const startDay = new Date(firstOfMonth.valueOf() - (7 + firstOfMonth.getDay() - this.startDay) % 7 * DAY_MS)
    const nextMonth = this.month === 12 ? 1 : this.month + 1
    const lastOfMonth = new Date(new Date(`${this.year}-${nextMonth}-1`).valueOf() - DAY_MS)
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
    ':host [part=week], :host [part=days]': {
      display: 'grid',
      gridTemplateColumns: 'auto auto auto auto auto auto auto',
      justifyItems: 'stretch'
    },
    ':host .day, :host .date': {
      padding: 5,
      display: 'flex',
      justifyContent: 'center'
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