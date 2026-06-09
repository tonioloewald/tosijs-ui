import { test, expect } from 'bun:test'
import { makeSorter } from './make-sorter'

test('sorts simple values', () => {
  const simpleSort = makeSorter((a: number | string) => [a])
  const array = [5, -1, 3]
  expect([...array].sort(simpleSort)[0]).toBe(-1)
  expect([...array].sort(simpleSort)[1]).toBe(3)

  const strings = ['oh', 'be', 'a', 'fine']
  expect([...strings].sort(simpleSort)[0]).toBe('a')
  expect([...strings].sort(simpleSort)[1]).toBe('be')
})

test('sorts simple values descending', () => {
  const simpleSort = makeSorter((a: number | string) => [a], false)
  const array = [5, -1, 3]
  expect([...array].sort(simpleSort)[0]).toBe(5)
  expect([...array].sort(simpleSort)[1]).toBe(3)

  const strings = ['oh', 'be', 'a', 'fine']
  expect([...strings].sort(simpleSort)[0]).toBe('oh')
  expect([...strings].sort(simpleSort)[1]).toBe('fine')
})

test('sorts compound objects', () => {
  const sortNameThenId = makeSorter((a: { name: string; id: number }) => [
    a.name,
    a.id,
  ])
  const sortLowercaseNameThenId = makeSorter(
    (a: { name: string; id: number }) => [a.name.toLocaleLowerCase(), a.id]
  )
  const idThenName = makeSorter((a: { name: string; id: number }) => [
    a.id,
    a.name,
  ])
  const array = [
    { name: 'alice', id: 100 },
    { name: 'bob', id: 1 },
    { name: 'alice', id: 10 },
    { name: 'Zed', id: 5 },
    { name: 'smaug', id: -7 },
  ]
  expect([...array].sort(sortNameThenId)[0].id).toBe(5)
  expect([...array].sort(sortNameThenId)[2].id).toBe(100)
  expect([...array].sort(sortNameThenId)[4].id).toBe(-7)

  expect([...array].sort(sortLowercaseNameThenId)[0].id).toBe(10)
  expect([...array].sort(sortLowercaseNameThenId)[2].id).toBe(1)
  expect([...array].sort(sortLowercaseNameThenId)[4].id).toBe(5)

  expect([...array].sort(idThenName)[0].id).toBe(-7)
  expect([...array].sort(idThenName)[2].id).toBe(5)
  expect([...array].sort(idThenName)[4].id).toBe(100)
})
