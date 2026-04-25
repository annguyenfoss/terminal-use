import { describe, expect, it } from 'vitest'

import { encodeInputKey } from '../src/session-manager.js'

describe('encodeInputKey', () => {
  it('supports shell and widened nano keys', () => {
    expect(encodeInputKey('Enter')).toBe('\r')
    expect(encodeInputKey('Up')).toBe('\x1b[A')
    expect(encodeInputKey('Home')).toBe('\x1b[H')
    expect(encodeInputKey('PageDown')).toBe('\x1b[6~')
    expect(encodeInputKey('Ctrl+A')).toBe('\x01')
    expect(encodeInputKey('Ctrl+C')).toBe('\x03')
    expect(encodeInputKey('Ctrl+K')).toBe('\x0b')
    expect(encodeInputKey('Ctrl+L')).toBe('\x0c')
    expect(encodeInputKey('Ctrl+G')).toBe('\x07')
    expect(encodeInputKey('Ctrl+O')).toBe('\x0f')
    expect(encodeInputKey('Ctrl+R')).toBe('\x12')
    expect(encodeInputKey('Ctrl+S')).toBe('\x13')
    expect(encodeInputKey('Ctrl+T')).toBe('\x14')
    expect(encodeInputKey('Ctrl+U')).toBe('\x15')
    expect(encodeInputKey('Ctrl+W')).toBe('\x17')
    expect(encodeInputKey('Ctrl+X')).toBe('\x18')
    expect(encodeInputKey('Ctrl+Y')).toBe('\x19')
    expect(encodeInputKey('Ctrl+\\')).toBe('\x1c')
    expect(encodeInputKey('Ctrl+6')).toBe('\x1e')
    expect(encodeInputKey('Ctrl+/')).toBe('\x1f')
  })

  it('rejects unsupported keys', () => {
    expect(encodeInputKey('F5')).toBeNull()
  })
})
