import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import {
  XinMenu,
  xinMenu,
  menu,
  createMenuAction,
  createSubMenu,
  createMenuItem,
  createDropMenuItem,
  filterForDrop,
  filterForClick,
  MenuItem,
  MenuAction,
  SubMenu,
  PopMenuOptions,
} from './menu'

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

describe('menu', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
    // Clean up any popped menus
    document.querySelectorAll('.xin-menu').forEach((el) => el.remove())
  })

  describe('createMenuAction', () => {
    const baseOptions: PopMenuOptions = {
      target: document.createElement('button'),
      menuItems: [],
    }

    test('creates button for function action', () => {
      const item: MenuAction = {
        caption: 'Test Action',
        action: () => {
          /* noop */
        },
      }
      const element = createMenuAction(item, baseOptions)
      expect(element.tagName.toLowerCase()).toBe('button')
      expect(element.classList.contains('xin-menu-item')).toBe(true)
    })

    test('creates anchor for string action (URL)', () => {
      const item: MenuAction = {
        caption: 'Test Link',
        action: 'https://example.com',
      }
      const element = createMenuAction(item, baseOptions)
      expect(element.tagName.toLowerCase()).toBe('a')
      expect(element.getAttribute('href')).toBe('https://example.com')
    })

    test('displays caption', () => {
      const item: MenuAction = {
        caption: 'My Caption',
        action: () => {
          /* noop */
        },
      }
      const element = createMenuAction(item, baseOptions)
      expect(element.textContent).toContain('My Caption')
    })

    test('displays shortcut', () => {
      const item: MenuAction = {
        caption: 'Copy',
        shortcut: '⌘C',
        action: () => {
          /* noop */
        },
      }
      const element = createMenuAction(item, baseOptions)
      expect(element.textContent).toContain('⌘C')
    })

    test('adds checked class when checked', () => {
      const item: MenuAction = {
        caption: 'Toggle',
        checked: () => true,
        action: () => {
          /* noop */
        },
      }
      const element = createMenuAction(item, baseOptions)
      expect(element.classList.contains('xin-menu-item-checked')).toBe(true)
    })

    test('does not add checked class when not checked', () => {
      const item: MenuAction = {
        caption: 'Toggle',
        checked: () => false,
        action: () => {
          /* noop */
        },
      }
      const element = createMenuAction(item, baseOptions)
      expect(element.classList.contains('xin-menu-item-checked')).toBe(false)
    })

    test('adds disabled attribute when disabled', () => {
      const item: MenuAction = {
        caption: 'Disabled',
        enabled: () => false,
        action: () => {
          /* noop */
        },
      }
      const element = createMenuAction(item, baseOptions)
      expect(element.hasAttribute('disabled')).toBe(true)
      expect(element.getAttribute('aria-disabled')).toBe('true')
    })

    test('uses role="menuitem" by default', () => {
      const item: MenuAction = {
        caption: 'Test',
        action: () => {
          /* noop */
        },
      }
      const element = createMenuAction(item, { ...baseOptions, role: 'menu' })
      expect(element.getAttribute('role')).toBe('menuitem')
    })

    test('uses role="option" when role is listbox', () => {
      const item: MenuAction = {
        caption: 'Test',
        action: () => {
          /* noop */
        },
      }
      const element = createMenuAction(item, {
        ...baseOptions,
        role: 'listbox',
      })
      expect(element.getAttribute('role')).toBe('option')
    })

    test('adds aria-selected when checked in listbox mode', () => {
      const item: MenuAction = {
        caption: 'Selected',
        checked: () => true,
        action: () => {
          /* noop */
        },
      }
      const element = createMenuAction(item, {
        ...baseOptions,
        role: 'listbox',
      })
      expect(element.getAttribute('aria-selected')).toBe('true')
    })

    test('localizes caption when localized option is true', () => {
      const item: MenuAction = {
        caption: 'test-key',
        action: () => {
          /* noop */
        },
      }
      // Just verify it doesn't throw when localized is true
      const element = createMenuAction(item, {
        ...baseOptions,
        localized: true,
      })
      expect(element).toBeDefined()
    })
  })

  describe('createSubMenu', () => {
    const baseOptions: PopMenuOptions = {
      target: document.createElement('button'),
      menuItems: [],
    }

    test('creates button element', () => {
      const item: SubMenu = {
        caption: 'Submenu',
        menuItems: [
          {
            caption: 'Child',
            action: () => {
              /* noop */
            },
          },
        ],
      }
      const element = createSubMenu(item, baseOptions)
      expect(element.tagName.toLowerCase()).toBe('button')
    })

    test('displays caption', () => {
      const item: SubMenu = {
        caption: 'More Options',
        menuItems: [],
      }
      const element = createSubMenu(item, baseOptions)
      expect(element.textContent).toContain('More Options')
    })

    test('is disabled when enabled returns false', () => {
      const item: SubMenu = {
        caption: 'Disabled Submenu',
        enabled: () => false,
        menuItems: [],
      }
      const element = createSubMenu(item, baseOptions)
      expect(element.hasAttribute('disabled')).toBe(true)
    })
  })

  describe('createMenuItem', () => {
    const baseOptions: PopMenuOptions = {
      target: document.createElement('button'),
      menuItems: [],
    }

    test('creates separator for null', () => {
      const element = createMenuItem(null, baseOptions)
      expect(element.classList.contains('xin-menu-separator')).toBe(true)
    })

    test('creates menu action for action item', () => {
      const item: MenuAction = {
        caption: 'Action',
        action: () => {
          /* noop */
        },
      }
      const element = createMenuItem(item, baseOptions)
      expect(element.classList.contains('xin-menu-item')).toBe(true)
    })

    test('creates submenu for item with menuItems', () => {
      const item: SubMenu = {
        caption: 'Submenu',
        menuItems: [
          {
            caption: 'Child',
            action: () => {
              /* noop */
            },
          },
        ],
      }
      const element = createMenuItem(item, baseOptions)
      expect(element.classList.contains('xin-menu-item')).toBe(true)
    })
  })

  describe('menu function', () => {
    test('creates menu container with role', () => {
      const target = document.createElement('button')
      container.appendChild(target)
      const menuElement = menu({
        target,
        menuItems: [
          {
            caption: 'Test',
            action: () => {
              /* noop */
            },
          },
        ],
        role: 'menu',
      })
      expect(menuElement.getAttribute('role')).toBe('menu')
    })

    test('creates menu with listbox role', () => {
      const target = document.createElement('button')
      container.appendChild(target)
      const menuElement = menu({
        target,
        menuItems: [
          {
            caption: 'Test',
            action: () => {
              /* noop */
            },
          },
        ],
        role: 'listbox',
      })
      expect(menuElement.getAttribute('role')).toBe('listbox')
    })

    test('adds xin-menu-with-icons class when items have icons', () => {
      const target = document.createElement('button')
      container.appendChild(target)
      const menuElement = menu({
        target,
        menuItems: [
          {
            caption: 'Test',
            icon: 'check',
            action: () => {
              /* noop */
            },
          },
        ],
      })
      expect(menuElement.classList.contains('xin-menu-with-icons')).toBe(true)
    })

    test('does not add xin-menu-with-icons class when no icons', () => {
      const target = document.createElement('button')
      container.appendChild(target)
      const menuElement = menu({
        target,
        menuItems: [
          {
            caption: 'Test',
            action: () => {
              /* noop */
            },
          },
        ],
      })
      expect(menuElement.classList.contains('xin-menu-with-icons')).toBe(false)
    })
  })

  describe('TosiMenu component', () => {
    test('creates custom element', () => {
      const menuComponent = xinMenu({ menuItems: [] })
      container.appendChild(menuComponent)
      expect(menuComponent).toBeInstanceOf(XinMenu)
      expect(menuComponent.tagName.toLowerCase()).toBe('tosi-menu')
    })

    test('stores menuItems', () => {
      const items: MenuItem[] = [
        {
          caption: 'One',
          action: () => {
            /* noop */
          },
        },
        {
          caption: 'Two',
          action: () => {
            /* noop */
          },
        },
      ]
      const menuComponent = xinMenu({ menuItems: items })
      container.appendChild(menuComponent)
      expect(menuComponent.menuItems).toEqual(items)
    })

    test('accepts menuWidth property', () => {
      const menuComponent = xinMenu({ menuItems: [], menuWidth: '200px' })
      container.appendChild(menuComponent)
      expect(menuComponent.menuWidth).toBe('200px')
    })

    test('accepts localized property', () => {
      const menuComponent = xinMenu({ menuItems: [], localized: true })
      container.appendChild(menuComponent)
      expect(menuComponent.localized).toBe(true)
    })

    test('has trigger button', () => {
      const menuComponent = xinMenu({ menuItems: [] }, 'Click me')
      container.appendChild(menuComponent)
      const trigger = menuComponent.querySelector('button[part="trigger"]')
      expect(trigger).not.toBeNull()
    })

    test('accepts acceptsDrop property', () => {
      const menuComponent = xinMenu({
        menuItems: [],
        acceptsDrop: 'text/plain;text/html',
      })
      container.appendChild(menuComponent)
      expect(menuComponent.acceptsDrop).toBe('text/plain;text/html')
    })
  })

  describe('filterForDrop', () => {
    test('disables items without acceptsDrop by default', () => {
      const items: MenuItem[] = [
        {
          caption: 'Has drop',
          acceptsDrop: ['text/plain'],
          dropAction: () => {},
          action: () => {},
        },
        { caption: 'No drop', action: () => {} },
      ]
      const result = filterForDrop(items, ['text/plain'])
      expect(result.length).toBe(2)
      expect((result[0] as MenuAction).caption).toBe('Has drop')
      expect((result[1] as MenuAction).enabled!()).toBe(false)
    })

    test('hides items without acceptsDrop when hideDisabled', () => {
      const items: MenuItem[] = [
        {
          caption: 'Has drop',
          acceptsDrop: ['text/plain'],
          dropAction: () => {},
          action: () => {},
        },
        { caption: 'No drop', action: () => {} },
      ]
      const result = filterForDrop(items, ['text/plain'], true)
      expect(result.length).toBe(1)
      expect((result[0] as MenuAction).caption).toBe('Has drop')
    })

    test('disables non-matching MIME types by default', () => {
      const items: MenuItem[] = [
        {
          caption: 'Text only',
          acceptsDrop: ['text/plain'],
          dropAction: () => {},
          action: () => {},
        },
        {
          caption: 'HTML only',
          acceptsDrop: ['text/html'],
          dropAction: () => {},
          action: () => {},
        },
      ]
      const result = filterForDrop(items, ['text/plain'])
      expect(result.length).toBe(2)
      expect((result[0] as MenuAction).caption).toBe('Text only')
      expect((result[1] as MenuAction).enabled!()).toBe(false)
    })

    test('hides non-matching MIME types when hideDisabled', () => {
      const items: MenuItem[] = [
        {
          caption: 'Text only',
          acceptsDrop: ['text/plain'],
          dropAction: () => {},
          action: () => {},
        },
        {
          caption: 'HTML only',
          acceptsDrop: ['text/html'],
          dropAction: () => {},
          action: () => {},
        },
      ]
      const result = filterForDrop(items, ['text/plain'], true)
      expect(result.length).toBe(1)
      expect((result[0] as MenuAction).caption).toBe('Text only')
    })

    test('supports wildcard MIME types', () => {
      const items: MenuItem[] = [
        {
          caption: 'Any text',
          acceptsDrop: ['text/*'],
          dropAction: () => {},
          action: () => {},
        },
      ]
      const result = filterForDrop(items, ['text/html'])
      expect(result.length).toBe(1)
    })

    test('recursively filters submenu children when hideDisabled', () => {
      const items: MenuItem[] = [
        {
          caption: 'Folder',
          acceptsDrop: ['text/plain'],
          menuItems: [
            {
              caption: 'Accepts text',
              acceptsDrop: ['text/plain'],
              dropAction: () => {},
              action: () => {},
            },
            {
              caption: 'Accepts images',
              acceptsDrop: ['image/png'],
              dropAction: () => {},
              action: () => {},
            },
          ],
        },
      ]
      const result = filterForDrop(items, ['text/plain'], true)
      expect(result.length).toBe(1)
      const sub = result[0] as SubMenu
      expect(sub.menuItems.length).toBe(1)
      expect((sub.menuItems[0] as MenuAction).caption).toBe('Accepts text')
    })

    test('removes empty submenus when hideDisabled', () => {
      const items: MenuItem[] = [
        {
          caption: 'Empty folder',
          acceptsDrop: ['text/plain'],
          menuItems: [
            {
              caption: 'Images only',
              acceptsDrop: ['image/png'],
              dropAction: () => {},
              action: () => {},
            },
          ],
        },
      ]
      const result = filterForDrop(items, ['text/plain'], true)
      expect(result.length).toBe(0)
    })

    test('keeps submenu with dropAction even if children filtered out', () => {
      const items: MenuItem[] = [
        {
          caption: 'Drop here too',
          acceptsDrop: ['text/plain'],
          dropAction: () => {},
          menuItems: [
            {
              caption: 'Images only',
              acceptsDrop: ['image/png'],
              dropAction: () => {},
              action: () => {},
            },
          ],
        },
      ]
      const result = filterForDrop(items, ['text/plain'], true)
      expect(result.length).toBe(1)
      expect((result[0] as SubMenu).caption).toBe('Drop here too')
    })

    test('cleans up double separators when hideDisabled', () => {
      const items: MenuItem[] = [
        {
          caption: 'Keep',
          acceptsDrop: ['text/plain'],
          dropAction: () => {},
          action: () => {},
        },
        null,
        { caption: 'Remove', action: () => {} },
        null,
        {
          caption: 'Also keep',
          acceptsDrop: ['text/plain'],
          dropAction: () => {},
          action: () => {},
        },
      ]
      const result = filterForDrop(items, ['text/plain'], true)
      expect(result.length).toBe(3)
      expect(result[1]).toBeNull()
    })

    test('removes trailing separators when hideDisabled', () => {
      const items: MenuItem[] = [
        {
          caption: 'Keep',
          acceptsDrop: ['text/plain'],
          dropAction: () => {},
          action: () => {},
        },
        null,
        { caption: 'Remove', action: () => {} },
      ]
      const result = filterForDrop(items, ['text/plain'], true)
      expect(result.length).toBe(1)
    })

    test('returns empty for no matches when hideDisabled', () => {
      const items: MenuItem[] = [
        { caption: 'No drop', action: () => {} },
        { caption: 'Also no drop', action: () => {} },
      ]
      const result = filterForDrop(items, ['text/plain'], true)
      expect(result.length).toBe(0)
    })

    test('disables all for no matches by default', () => {
      const items: MenuItem[] = [
        { caption: 'No drop', action: () => {} },
        { caption: 'Also no drop', action: () => {} },
      ]
      const result = filterForDrop(items, ['text/plain'])
      expect(result.length).toBe(2)
      expect((result[0] as MenuAction).enabled!()).toBe(false)
      expect((result[1] as MenuAction).enabled!()).toBe(false)
    })
  })

  describe('filterForClick', () => {
    test('keeps items with action', () => {
      const items: MenuItem[] = [
        { caption: 'Click me', action: () => {} },
        {
          caption: 'Drop only',
          acceptsDrop: ['text/plain'],
          dropAction: () => {},
        } as MenuItem,
      ]
      const result = filterForClick(items, true)
      expect(result.length).toBe(1)
      expect((result[0] as MenuAction).caption).toBe('Click me')
    })

    test('disables drop-only items by default', () => {
      const items: MenuItem[] = [
        { caption: 'Click me', action: () => {} },
        {
          caption: 'Drop only',
          acceptsDrop: ['text/plain'],
          dropAction: () => {},
        } as MenuItem,
      ]
      const result = filterForClick(items)
      expect(result.length).toBe(2)
      expect((result[1] as MenuAction).enabled!()).toBe(false)
    })

    test('keeps submenus with clickable children', () => {
      const items: MenuItem[] = [
        {
          caption: 'Sub',
          menuItems: [{ caption: 'Child', action: () => {} }],
        },
      ]
      const result = filterForClick(items)
      expect(result.length).toBe(1)
    })

    test('hides submenus with no clickable children when hideDisabled', () => {
      const items: MenuItem[] = [
        {
          caption: 'Sub',
          menuItems: [
            {
              caption: 'Drop only',
              acceptsDrop: ['text/plain'],
              dropAction: () => {},
            } as MenuItem,
          ],
        },
      ]
      const result = filterForClick(items, true)
      expect(result.length).toBe(0)
    })

    test('disables submenus with no clickable children by default', () => {
      const items: MenuItem[] = [
        {
          caption: 'Sub',
          menuItems: [
            {
              caption: 'Drop only',
              acceptsDrop: ['text/plain'],
              dropAction: () => {},
            } as MenuItem,
          ],
        },
      ]
      const result = filterForClick(items)
      expect(result.length).toBe(1)
      expect((result[0] as MenuAction).enabled!()).toBe(false)
    })
  })

  describe('createDropMenuItem', () => {
    const baseOptions: PopMenuOptions = {
      target: document.createElement('button'),
      menuItems: [],
      _dropMode: true,
      _dataTypes: ['text/plain'],
    }

    test('creates button element', () => {
      const item: MenuAction = {
        caption: 'Drop here',
        acceptsDrop: ['text/plain'],
        dropAction: () => {},
        action: () => {},
      }
      const element = createDropMenuItem(item, baseOptions)
      expect(element.tagName.toLowerCase()).toBe('button')
      expect(element.classList.contains('xin-menu-item')).toBe(true)
    })

    test('displays caption', () => {
      const item: MenuAction = {
        caption: 'My Drop Target',
        acceptsDrop: ['text/plain'],
        dropAction: () => {},
        action: () => {},
      }
      const element = createDropMenuItem(item, baseOptions)
      expect(element.textContent).toContain('My Drop Target')
    })

    test('respects disabled state', () => {
      const item: MenuAction = {
        caption: 'Disabled',
        acceptsDrop: ['text/plain'],
        dropAction: () => {},
        action: () => {},
        enabled: () => false,
      }
      const element = createDropMenuItem(item, baseOptions)
      expect(element.hasAttribute('disabled')).toBe(true)
    })
  })

  describe('createMenuItem in drop mode', () => {
    const dropOptions: PopMenuOptions = {
      target: document.createElement('button'),
      menuItems: [],
      _dropMode: true,
      _dataTypes: ['text/plain'],
    }

    test('creates drop item for action with dropAction', () => {
      const item: MenuAction = {
        caption: 'Drop target',
        acceptsDrop: ['text/plain'],
        dropAction: () => {},
        action: () => {},
      }
      const element = createMenuItem(item, dropOptions)
      expect(element.classList.contains('xin-menu-item')).toBe(true)
    })

    test('creates submenu for item with menuItems', () => {
      const item: SubMenu = {
        caption: 'Folder',
        acceptsDrop: ['text/plain'],
        menuItems: [
          {
            caption: 'Child',
            acceptsDrop: ['text/plain'],
            dropAction: () => {},
            action: () => {},
          },
        ],
      }
      const element = createMenuItem(item, dropOptions)
      expect(element.classList.contains('xin-menu-item')).toBe(true)
    })

    test('creates disabled item for acceptsDrop without dropAction or menuItems', () => {
      const item = {
        caption: 'Label only',
        acceptsDrop: ['text/plain'],
      } as MenuItem
      const element = createMenuItem(item, dropOptions)
      expect(element.hasAttribute('disabled')).toBe(true)
    })
  })
})
