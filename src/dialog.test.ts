import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { TosiDialog, tosiDialog } from './dialog'

describe('TosiDialog', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
    // Clean up any dialogs
    document.querySelectorAll('tosi-dialog').forEach((el) => el.remove())
  })

  describe('initialization', () => {
    test('creates a custom element', () => {
      const dialog = tosiDialog()
      container.appendChild(dialog)
      expect(dialog).toBeInstanceOf(TosiDialog)
      expect(dialog.tagName.toLowerCase()).toBe('tosi-dialog')
    })

    test('contains a native dialog element', () => {
      const dialog = tosiDialog()
      container.appendChild(dialog)
      const nativeDialog = dialog.querySelector('dialog')
      expect(nativeDialog).not.toBeNull()
    })

    test('has header, content, and footer slots', () => {
      const dialog = tosiDialog()
      container.appendChild(dialog)
      const headerSlot = dialog.querySelector('xin-slot[name="header"]')
      const footerSlot = dialog.querySelector('xin-slot[name="footer"]')
      const contentSlot = dialog.querySelector('xin-slot:not([name])')
      expect(headerSlot).not.toBeNull()
      expect(footerSlot).not.toBeNull()
      expect(contentSlot).not.toBeNull()
    })

    test('has OK button', () => {
      const dialog = tosiDialog()
      container.appendChild(dialog)
      const okButton = dialog.querySelector('button[part="ok"]')
      expect(okButton).not.toBeNull()
      expect(okButton?.textContent).toBe('OK')
    })

    test('removeOnClose defaults to false', () => {
      const dialog = tosiDialog()
      container.appendChild(dialog)
      expect(dialog.removeOnClose).toBe(false)
    })

    test('closeOnBackgroundClick defaults to false', () => {
      const dialog = tosiDialog()
      container.appendChild(dialog)
      expect(dialog.closeOnBackgroundClick).toBe(false)
    })
  })

  describe('properties', () => {
    test('accepts removeOnClose property', () => {
      const dialog = tosiDialog({ removeOnClose: true })
      container.appendChild(dialog)
      expect(dialog.removeOnClose).toBe(true)
    })

    test('accepts closeOnBackgroundClick property', () => {
      const dialog = tosiDialog({ closeOnBackgroundClick: true })
      container.appendChild(dialog)
      expect(dialog.closeOnBackgroundClick).toBe(true)
    })
  })

  describe('slotted content', () => {
    test('accepts header slot content', () => {
      const header = document.createElement('h3')
      header.slot = 'header'
      header.textContent = 'Test Header'
      const dialog = tosiDialog({}, header)
      container.appendChild(dialog)
      const slottedHeader = dialog.querySelector('h3[slot="header"]')
      expect(slottedHeader?.textContent).toBe('Test Header')
    })

    test('accepts footer slot content', () => {
      const footer = document.createElement('button')
      footer.slot = 'footer'
      footer.textContent = 'Cancel'
      const dialog = tosiDialog({}, footer)
      container.appendChild(dialog)
      const slottedFooter = dialog.querySelector('button[slot="footer"]')
      expect(slottedFooter?.textContent).toBe('Cancel')
    })

    test('accepts main content', () => {
      const content = document.createElement('p')
      content.textContent = 'Dialog body content'
      const dialog = tosiDialog({}, content)
      container.appendChild(dialog)
      const slottedContent = dialog.querySelector('p')
      expect(slottedContent?.textContent).toBe('Dialog body content')
    })
  })

  describe('close method', () => {
    test('calls dialogWillClose callback', () => {
      let closedWith: string | undefined
      const dialog = tosiDialog({
        dialogWillClose(reason) {
          closedWith = reason
        },
      })
      container.appendChild(dialog)
      dialog.close('test-reason')
      expect(closedWith).toBe('test-reason')
    })

    test('uses "cancel" as default reason', () => {
      let closedWith: string | undefined
      const dialog = tosiDialog({
        dialogWillClose(reason) {
          closedWith = reason
        },
      })
      container.appendChild(dialog)
      dialog.close()
      expect(closedWith).toBe('cancel')
    })
  })

  describe('ok method', () => {
    test('closes with "confirm" reason', () => {
      let closedWith: string | undefined
      const dialog = tosiDialog({
        dialogWillClose(reason) {
          closedWith = reason
        },
      })
      container.appendChild(dialog)
      dialog.ok()
      expect(closedWith).toBe('confirm')
    })
  })

  describe('static methods', () => {
    // Note: These tests are limited because happy-dom doesn't fully support
    // dialog.showModal(). We test that the methods exist and create dialogs.

    test('alert method exists', () => {
      expect(typeof TosiDialog.alert).toBe('function')
    })

    test('confirm method exists', () => {
      expect(typeof TosiDialog.confirm).toBe('function')
    })

    test('prompt method exists', () => {
      expect(typeof TosiDialog.prompt).toBe('function')
    })
  })
})
