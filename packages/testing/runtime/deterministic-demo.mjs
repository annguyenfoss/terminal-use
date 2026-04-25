#!/usr/bin/env node
/* global process */

const state = {
  mode: 'list',
  items: ['Alpha', 'Beta', 'Gamma', 'Delta'],
  selectedIndex: 0,
  status: 'Ready',
  confirmOpen: false
}

const stdin = process.stdin
const stdout = process.stdout

stdin.setEncoding('utf8')

if (stdin.isTTY) {
  stdin.setRawMode(true)
}

stdin.resume()
stdout.write('\u001b]0;Deterministic Demo\u0007')
render()

stdin.on('data', (chunk) => {
  if (chunk === '\u0003' || chunk === 'q') {
    shutdown(0)
    return
  }

  handleInput(chunk)
  render()
})

process.on('SIGINT', () => {
  shutdown(0)
})

process.on('exit', () => {
  stdout.write('\u001b[?25h')
})

function handleInput(chunk) {
  if (state.confirmOpen) {
    if (chunk === 'y' || chunk === 'Y' || chunk === '\r') {
      const removed = state.items.splice(state.selectedIndex, 1)[0] ?? 'item'
      if (state.items.length === 0) {
        state.items.push('Placeholder')
      }
      state.selectedIndex = Math.min(state.selectedIndex, state.items.length - 1)
      state.confirmOpen = false
      state.mode = 'list'
      state.status = `Deleted ${removed}`
      return
    }

    if (chunk === 'n' || chunk === 'N' || chunk === '\u001b') {
      state.confirmOpen = false
      state.mode = 'details'
      state.status = 'Delete cancelled'
      return
    }

    return
  }

  if (chunk === '\u001b[A') {
    state.selectedIndex =
      (state.selectedIndex - 1 + state.items.length) % state.items.length
    state.status = `Selected ${selectedLabel()}`
    return
  }

  if (chunk === '\u001b[B') {
    state.selectedIndex = (state.selectedIndex + 1) % state.items.length
    state.status = `Selected ${selectedLabel()}`
    return
  }

  if (chunk === '\r') {
    state.mode = 'details'
    state.status = `Opened ${selectedLabel()}`
    return
  }

  if (chunk === 'd' || chunk === 'D') {
    state.confirmOpen = true
    state.mode = 'confirm'
    state.status = `Delete requested for ${selectedLabel()}`
    return
  }

  if (chunk === '\u001b') {
    if (state.mode === 'details') {
      state.mode = 'list'
      state.status = 'Returned to list'
    } else {
      state.status = 'Nothing to cancel'
    }
  }
}

function render() {
  const lines = [
    'Deterministic Demo',
    `Mode: ${state.mode}`,
    '',
    'Items',
    ...state.items.map((item, index) =>
      `${index === state.selectedIndex ? '>' : ' '} ${item}`
    ),
    '',
    state.confirmOpen ? 'Confirm Delete' : '',
    state.confirmOpen
      ? `Delete ${selectedLabel()}? (y/n)`
      : state.mode === 'details'
        ? `Details: ${selectedLabel()}`
        : '',
    '',
    `Status: ${state.status}`,
    'Hints: Up/Down move | Enter open | d delete | Esc cancel | q quit'
  ]

  stdout.write('\u001b[?25l\u001b[2J\u001b[H')
  stdout.write(lines.join('\r\n'))
}

function selectedLabel() {
  return state.items[state.selectedIndex] ?? 'None'
}

function shutdown(code) {
  stdout.write('\u001b[?25h\r\n')
  process.exit(code)
}
