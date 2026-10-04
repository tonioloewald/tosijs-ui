import { test, expect } from 'bun:test'
import { defineRoutes, navigate } from './router'

// #174's sibling: navigating to the route you are already on must not cost the reader a
// second Back.
test('navigate() to the current path replaces; to another path pushes (#174)', () => {
  ;(window as any).happyDOM.setURL('https://example.test/')
  defineRoutes([
    { pattern: '/a', targets: [] },
    { pattern: '/b', targets: [] },
  ])
  navigate('/a')
  const start = window.history.length
  navigate('/a')
  expect(window.history.length).toBe(start)
  navigate('/b')
  expect(window.history.length).toBe(start + 1)
  expect(window.location.pathname).toBe('/b')
})
