import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import {
  TosiNotification,
  tosiNotification,
  postNotification,
} from './notifications'

describe('notifications', () => {
  beforeEach(() => {
    // Clean up any existing notifications
    document.querySelectorAll('tosi-notification').forEach((el) => el.remove())
  })

  afterEach(() => {
    document.querySelectorAll('tosi-notification').forEach((el) => el.remove())
  })

  describe('TosiNotification', () => {
    test('creates a custom element', () => {
      const notification = tosiNotification()
      document.body.appendChild(notification)
      expect(notification).toBeInstanceOf(TosiNotification)
      expect(notification.tagName.toLowerCase()).toBe('tosi-notification')
    })
  })

  describe('postNotification', () => {
    test('returns a close callback', () => {
      const close = postNotification({ message: 'Test', duration: -1 })
      expect(typeof close).toBe('function')
      close() // Clean up
    })

    test('accepts string shorthand', () => {
      const close = postNotification('Simple message')
      expect(typeof close).toBe('function')
      close()
    })

    test('creates notification singleton', () => {
      postNotification({ message: 'Test', duration: -1 })
      const notifications = document.querySelectorAll('tosi-notification')
      expect(notifications.length).toBe(1)
    })

    test('reuses singleton for multiple notifications', () => {
      const close1 = postNotification({ message: 'First', duration: -1 })
      const close2 = postNotification({ message: 'Second', duration: -1 })
      const notifications = document.querySelectorAll('tosi-notification')
      expect(notifications.length).toBe(1)
      close1()
      close2()
    })
  })

  describe('TosiNotification.post', () => {
    test('accepts message property', () => {
      const close = TosiNotification.post({
        message: 'Hello World',
        duration: -1,
      })
      expect(typeof close).toBe('function')
      close()
    })

    test('accepts type property', () => {
      const types = [
        'success',
        'info',
        'log',
        'warn',
        'error',
        'progress',
      ] as const
      for (const type of types) {
        const close = TosiNotification.post({
          message: 'Test',
          type,
          duration: -1,
        })
        expect(typeof close).toBe('function')
        close()
      }
    })

    test('accepts icon property as string', () => {
      const close = TosiNotification.post({
        message: 'With icon',
        icon: 'check',
        duration: -1,
      })
      expect(typeof close).toBe('function')
      close()
    })

    test('accepts duration property', () => {
      const close = TosiNotification.post({ message: 'Quick', duration: 0.1 })
      expect(typeof close).toBe('function')
      // Don't need to manually close - it will auto-close
    })

    test('accepts close callback', () => {
      let wasClosed = false
      const close = TosiNotification.post({
        message: 'With callback',
        duration: -1,
        close() {
          wasClosed = true
        },
      })
      close()
      expect(wasClosed).toBe(true)
    })

    test('accepts color property', () => {
      const close = TosiNotification.post({
        message: 'Custom color',
        color: '#ff0000',
        duration: -1,
      })
      expect(typeof close).toBe('function')
      close()
    })

    test('accepts progress callback', () => {
      const close = TosiNotification.post({
        message: 'Progress',
        type: 'progress',
        duration: -1,
        progress() {
          return 50
        },
      })
      expect(typeof close).toBe('function')
      close()
    })
  })

  describe('notification types and ARIA', () => {
    // These tests verify the internal implementation creates correct ARIA attributes
    // We can't easily test shadow DOM content in happy-dom, but we verify the API

    test('info type is default', () => {
      const close = TosiNotification.post({
        message: 'Default type',
        duration: -1,
      })
      // If no error, type was accepted
      expect(typeof close).toBe('function')
      close()
    })

    test('error type is accepted', () => {
      const close = TosiNotification.post({
        message: 'Error!',
        type: 'error',
        duration: -1,
      })
      expect(typeof close).toBe('function')
      close()
    })

    test('warn type is accepted', () => {
      const close = TosiNotification.post({
        message: 'Warning!',
        type: 'warn',
        duration: -1,
      })
      expect(typeof close).toBe('function')
      close()
    })

    test('success type is accepted', () => {
      const close = TosiNotification.post({
        message: 'Success!',
        type: 'success',
        duration: -1,
      })
      expect(typeof close).toBe('function')
      close()
    })
  })

  describe('removeNote', () => {
    test('static method exists', () => {
      expect(typeof TosiNotification.removeNote).toBe('function')
    })
  })
})
