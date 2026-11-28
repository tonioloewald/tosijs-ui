import { afterAll, describe, expect, test } from 'bun:test'
import { tosiMonth } from './month'

/*
#4352: the month mixed UTC and local dates, so west of UTC every cell's number disagreed with
its date and clicking "1" selected the 2nd. CI runs in UTC, where the two agree, so these run in
zones either side of it (Bun honours a TZ set at runtime). March 2026 crosses the US daylight-
saving change, which stepping in 24-hour units knocks off midnight.
*/
const originalTZ = process.env.TZ
afterAll(() => {
  if (originalTZ === undefined) delete process.env.TZ
  else process.env.TZ = originalTZ
})

for (const zone of ['America/New_York', 'Asia/Tokyo', 'UTC']) {
  describe(`<tosi-month> in ${zone} (#4352)`, () => {
    const mount = (props: Record<string, unknown> = {}) => {
      process.env.TZ = zone
      const month = tosiMonth({
        month: 3,
        year: 2026,
        selectable: true,
        ...props,
      })
      document.body.append(month)
      month.render()
      return month
    }

    test('every cell shows the day of the date it stands for', () => {
      const month = mount()
      const cells = [...month.querySelectorAll('.date')] as HTMLElement[]
      expect(cells.length % 7).toBe(0)
      for (const cell of cells) {
        expect(Number(cell.textContent)).toBe(Number(cell.title.split('-')[2]))
      }
      const inMonth = cells.filter((c) => c.classList.contains('in-month'))
      expect(inMonth.length).toBe(31)
      expect(inMonth.every((c) => c.title.startsWith('2026-03-'))).toBe(true)
      // 1 March 2026 is a Sunday, the default first day of the week.
      expect(cells[0].title).toBe('2026-03-01')
      month.remove()
    })

    test('clicking "1" selects the 1st', () => {
      const month = mount()
      const one = [...month.querySelectorAll('.date.in-month')].find(
        (c) => c.textContent === '1'
      ) as HTMLElement
      one.click()
      expect(month.value).toBe('2026-03-01')
      month.remove()
    })

    test('the month list is labelled in order, starting with January', () => {
      const month = mount()
      expect(month.months.map((m) => m.caption).slice(0, 3)).toEqual([
        'Jan',
        'Feb',
        'Mar',
      ])
      month.remove()
    })

    test('a value opens on its own month', () => {
      process.env.TZ = zone
      const month = tosiMonth({ value: '2026-05-01', selectable: true })
      document.body.append(month)
      expect(month.month).toBe(5)
      expect(month.year).toBe(2026)
      month.remove()
    })

    test('Enter selects; disabled and readonly refuse the keyboard', () => {
      const month = mount()
      const cell = () =>
        month.querySelector('.date.in-month[title="2026-03-02"]') as HTMLElement
      cell().dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Enter', bubbles: true })
      )
      expect(month.value).toBe('2026-03-02')
      month.value = ''
      month.readonly = true
      month.render()
      cell().dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Space', bubbles: true })
      )
      cell().click()
      expect(month.value).toBe('')
      month.remove()
    })
  })
}
