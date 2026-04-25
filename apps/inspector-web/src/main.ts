import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import type {
  ClientToHostMessage,
  HostToClientMessage
} from '@terminal-use/protocol'
import {
  PROTOCOL_VERSION,
  hostToClientMessageSchema
} from '@terminal-use/protocol'
import '@xterm/xterm/css/xterm.css'

import './styles.css'

interface QuickAction {
  label: string
  name: string
  args?: unknown
  destructive?: boolean
}

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  'deterministic-demo': [
    { label: 'moveNext', name: 'moveNext' },
    { label: 'movePrev', name: 'movePrev' },
    { label: 'openSelected', name: 'openSelected' },
    { label: 'requestDelete', name: 'requestDelete' },
    { label: 'confirmDelete', name: 'confirmDelete' },
    { label: 'cancel', name: 'cancel' }
  ],
  nano: [
    { label: 'save', name: 'save' },
    { label: 'openHelp', name: 'openHelp' },
    { label: 'closeHelp', name: 'closeHelp' },
    { label: 'toggleMark', name: 'toggleMark' },
    { label: 'copySelection', name: 'copySelection' },
    { label: 'cutSelection', name: 'cutSelection' },
    { label: 'paste', name: 'paste' },
    { label: 'undo', name: 'undo' },
    { label: 'redo', name: 'redo' },
    { label: 'runSpeller', name: 'runSpeller' },
    { label: 'runFormatter', name: 'runFormatter' },
    { label: 'runLinter', name: 'runLinter' },
    { label: 'jumpPrevLint', name: 'jumpPrevLint' },
    { label: 'jumpNextLint', name: 'jumpNextLint' },
    { label: 'recordMacro', name: 'recordMacro' },
    { label: 'playMacro', name: 'playMacro' },
    { label: 'placeAnchor', name: 'placeAnchor' }
  ],
  htop: [
    { label: 'down', name: 'moveSelection', args: { direction: 'down', count: 1 } },
    { label: 'up', name: 'moveSelection', args: { direction: 'up', count: 1 } },
    { label: 'home', name: 'home' },
    { label: 'end', name: 'end' },
    { label: 'refresh', name: 'refresh' },
    { label: 'tree', name: 'toggleTree' },
    { label: 'sort pid', name: 'sortBy', args: { preset: 'pid' } },
    { label: 'sort cpu', name: 'sortBy', args: { preset: 'cpu' } },
    { label: 'sort mem', name: 'sortBy', args: { preset: 'memory' } },
    { label: 'sort time', name: 'sortBy', args: { preset: 'time' } },
    { label: 'clear filter', name: 'clearFilter' },
    { label: 'kill', name: 'killSelected', destructive: true }
  ]
}

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing app root')
}

app.innerHTML = `
  <div class="shell">
    <section class="panel terminal-panel">
      <div class="toolbar">
        <div class="toolbar-row">
          <input id="ws-url" value="ws://127.0.0.1:3000/ws" />
          <button id="connect">Connect</button>
          <select id="profile-select">
            <option value="deterministic-demo">Deterministic Demo</option>
            <option value="nano">GNU nano 9.0</option>
            <option value="htop">htop 3.5.x</option>
          </select>
          <input id="profile-file" placeholder="optional nano file path" />
          <input id="profile-pids" placeholder="optional htop pids, comma-separated" hidden />
          <label id="profile-readonly-wrap" class="toggle" hidden>
            <input id="profile-readonly" type="checkbox" checked />
            readonly htop
          </label>
          <button id="start-session" class="secondary">Start Session</button>
          <button id="record-start" class="ghost">Start Recording</button>
          <button id="record-stop" class="ghost">Stop Recording</button>
        </div>
        <div class="status-strip">
          <span class="status-pill" id="status-connection">disconnected</span>
          <span class="status-pill" id="status-session">no session</span>
          <span class="status-pill" id="status-driver">driver: none</span>
          <span class="status-pill" id="status-revision">revision: 0</span>
          <span class="status-pill" id="status-recording">recording: idle</span>
        </div>
      </div>
      <div class="terminal-wrap">
        <div id="terminal"></div>
      </div>
    </section>
    <aside class="sidebar">
      <section class="panel section">
        <h2>Actions</h2>
        <div class="actions" id="actions"></div>
        <div class="action-console">
          <input id="action-name" placeholder="action name" />
          <textarea
            id="action-args"
            rows="3"
            placeholder='optional JSON args, for example {"query":"beta"}'
          ></textarea>
          <button id="invoke-action" class="secondary">Invoke Action</button>
        </div>
      </section>
      <section class="panel section">
        <h2>Elements</h2>
        <div class="elements" id="elements"></div>
      </section>
      <section class="panel section">
        <h2>Semantic State</h2>
        <pre id="semantic-output">{}</pre>
      </section>
      <section class="panel section">
        <h2>Raw Events</h2>
        <pre id="raw-output">[]</pre>
      </section>
    </aside>
  </div>
`

const wsUrlInput = required<HTMLInputElement>('#ws-url')
const connectButton = required<HTMLButtonElement>('#connect')
const profileSelect = required<HTMLSelectElement>('#profile-select')
const profileFileInput = required<HTMLInputElement>('#profile-file')
const profilePidsInput = required<HTMLInputElement>('#profile-pids')
const profileReadonlyWrap = required<HTMLLabelElement>('#profile-readonly-wrap')
const profileReadonlyInput = required<HTMLInputElement>('#profile-readonly')
const startSessionButton = required<HTMLButtonElement>('#start-session')
const recordStartButton = required<HTMLButtonElement>('#record-start')
const recordStopButton = required<HTMLButtonElement>('#record-stop')
const actionNameInput = required<HTMLInputElement>('#action-name')
const actionArgsInput = required<HTMLTextAreaElement>('#action-args')
const invokeActionButton = required<HTMLButtonElement>('#invoke-action')
const actionsContainer = required<HTMLElement>('#actions')
const semanticOutput = required<HTMLElement>('#semantic-output')
const rawOutput = required<HTMLElement>('#raw-output')
const elementsContainer = required<HTMLElement>('#elements')
const connectionLabel = required<HTMLElement>('#status-connection')
const sessionLabel = required<HTMLElement>('#status-session')
const driverLabel = required<HTMLElement>('#status-driver')
const revisionLabel = required<HTMLElement>('#status-revision')
const recordingLabel = required<HTMLElement>('#status-recording')

const terminal = new Terminal({
  convertEol: false,
  fontFamily: '"Iosevka Term", "SFMono-Regular", monospace',
  fontSize: 14,
  theme: {
    background: '#161513',
    foreground: '#f6e7ca',
    cursor: '#ffbb4d',
    black: '#161513',
    red: '#d35b36',
    green: '#7aa95c',
    yellow: '#d5a64a',
    blue: '#70a2d7',
    magenta: '#b778e0',
    cyan: '#5fc6c3',
    white: '#f1e1c3',
    brightBlack: '#5a4f43',
    brightRed: '#f07c58',
    brightGreen: '#8bcf7a',
    brightYellow: '#f4c76c',
    brightBlue: '#8fc0ef',
    brightMagenta: '#d09df4',
    brightCyan: '#87dbd8',
    brightWhite: '#fff8ec'
  }
})
const fitAddon = new FitAddon()
terminal.loadAddon(fitAddon)
terminal.open(required('#terminal'))
fitAddon.fit()

window.addEventListener('resize', () => {
  fitAddon.fit()
})

const state = {
  socket: null as WebSocket | null,
  sessionId: null as string | null,
  driverId: null as string | null,
  revision: 0,
  recordingPath: null as string | null,
  htopReadonly: true,
  rawEvents: [] as unknown[],
  semantic: null as unknown
}

const pending = new Map<
  string,
  {
    resolve: (message: HostToClientMessage) => void
    reject: (error: Error) => void
  }
>()

terminal.onData((data) => {
  if (!state.sessionId || !state.socket || state.socket.readyState !== WebSocket.OPEN) {
    return
  }

  send({
    sessionId: state.sessionId,
    type: 'input.text',
    payload: {
      text: data
    }
  })
})

connectButton.addEventListener('click', () => {
  void connect()
})

startSessionButton.addEventListener('click', () => {
  void startManagedSession()
})

recordStartButton.addEventListener('click', () => {
  void startRecording()
})

recordStopButton.addEventListener('click', () => {
  void stopRecording()
})

profileSelect.addEventListener('change', () => {
  renderProfileInputs()
  renderActionButtons()
})

profileReadonlyInput.addEventListener('change', () => {
  renderActionButtons()
})

invokeActionButton.addEventListener('click', () => {
  void invokeCustomAction()
})

setConnectionStatus('disconnected')
renderSemantic(null)
renderRaw()
renderElements([])
renderProfileInputs()
renderActionButtons()

async function connect(): Promise<void> {
  if (state.socket && state.socket.readyState === WebSocket.OPEN) {
    state.socket.close(1000, 'reconnect')
  }

  terminal.reset()
  state.sessionId = null
  state.driverId = null
  state.revision = 0
  state.recordingPath = null
  state.htopReadonly = true
  state.rawEvents = []
  state.semantic = null
  renderAll()

  setConnectionStatus('connecting')

  const socket = new WebSocket(wsUrlInput.value)
  state.socket = socket

  socket.addEventListener('message', (event) => {
    handleSocketMessage(String(event.data))
  })
  socket.addEventListener('close', () => {
    setConnectionStatus('disconnected')
  })
  socket.addEventListener('error', () => {
    setConnectionStatus('error')
  })

  await onceOpen(socket)
  await request('hello.ok', {
    type: 'hello',
    payload: {
      clientName: '@terminal-use/inspector-web'
    }
  })

  setConnectionStatus('connected')
}

async function startManagedSession(): Promise<void> {
  terminal.reset()
  state.sessionId = null
  state.driverId = null
  state.semantic = null
  state.rawEvents = []
  renderAll()

  const payload: Extract<ClientToHostMessage, { type: 'session.start' }>['payload'] = {
    profile: profileSelect.value,
    args: []
  }

  if (profileSelect.value === 'nano' && profileFileInput.value.trim().length > 0) {
    payload.profileArgs = {
      file: profileFileInput.value.trim()
    }
  }

  if (profileSelect.value === 'htop') {
    const pids = parsePidList(profilePidsInput.value)
    state.htopReadonly = profileReadonlyInput.checked
    payload.profileArgs = {
      readonly: state.htopReadonly,
      ...(pids.length > 0 ? { pids } : {})
    }
  }

  const started = await request('session.started', {
    type: 'session.start',
    payload
  })

  state.sessionId = started.payload.sessionId
  state.driverId = started.payload.driver ?? null
  sessionLabel.textContent = `session: ${started.payload.sessionId}`
  driverLabel.textContent = `driver: ${state.driverId ?? 'none'}`
  renderActionButtons()
}

async function invokeAction(name: string, args?: unknown): Promise<void> {
  if (!state.sessionId || !state.driverId) {
    return
  }

  await request('action.result', {
    sessionId: state.sessionId,
    type: 'action.invoke',
    payload: {
      driver: state.driverId,
      name,
      args
    }
  })
}

async function invokeCustomAction(): Promise<void> {
  const name = actionNameInput.value.trim()

  if (!name) {
    return
  }

  const argsText = actionArgsInput.value.trim()
  const args =
    argsText.length === 0 ? undefined : parseActionArgs(actionArgsInput.value)

  await invokeAction(name, args)
}

async function startRecording(): Promise<void> {
  if (!state.sessionId) {
    return
  }

  const started = await request('recording.started', {
    sessionId: state.sessionId,
    type: 'recording.start',
    payload: {
      format: 'asciicast-bundle'
    }
  })

  state.recordingPath = started.payload.outputDir
  recordingLabel.textContent = `recording: ${started.payload.outputDir}`
}

async function stopRecording(): Promise<void> {
  if (!state.sessionId) {
    return
  }

  const stopped = await request('recording.stopped', {
    sessionId: state.sessionId,
    type: 'recording.stop',
    payload: {}
  })

  state.recordingPath = stopped.payload.outputDir
  recordingLabel.textContent = `recording: ${stopped.payload.outputDir}`
}

function handleSocketMessage(raw: string): void {
  let message: HostToClientMessage

  try {
    message = hostToClientMessageSchema.parse(JSON.parse(raw))
  } catch (error) {
    console.error(error)
    return
  }

  if (message.id && pending.has(message.id)) {
    const waiter = pending.get(message.id)

    if (message.type === 'error') {
      waiter?.reject(new Error(message.payload.message))
      pending.delete(message.id)
      return
    }

    waiter?.resolve(message)
    pending.delete(message.id)
  }

  switch (message.type) {
    case 'screen.snapshot':
      terminal.resize(message.payload.cols, message.payload.rows)
      state.revision = message.payload.revision
      revisionLabel.textContent = `revision: ${state.revision}`
      break
    case 'event.raw':
      pushRawEvent(message.payload)
      handleRawEvent(message.payload)
      break
    case 'event.semantic':
      state.driverId = message.payload.driverId
      state.semantic = message.payload
      state.revision = message.payload.revision
      renderSemantic(message.payload)
      renderElements(message.payload.elements)
      renderActionButtons()
      revisionLabel.textContent = `revision: ${state.revision}`
      driverLabel.textContent = `driver: ${state.driverId ?? 'none'}`
      break
    case 'session.exited':
      connectionLabel.textContent = 'connected'
      sessionLabel.textContent = 'session: exited'
      break
    case 'recording.started':
      recordingLabel.textContent = `recording: ${message.payload.outputDir}`
      break
    case 'recording.stopped':
      recordingLabel.textContent = `recording: ${message.payload.outputDir}`
      break
    default:
      break
  }
}

function handleRawEvent(event: Extract<HostToClientMessage, { type: 'event.raw' }>['payload']): void {
  switch (event.kind) {
    case 'pty-output':
      terminal.write(event.data)
      return
    case 'resize':
      terminal.resize(event.cols, event.rows)
      return
    case 'snapshot':
      state.revision = event.revision
      revisionLabel.textContent = `revision: ${state.revision}`
      return
    case 'session-exit':
      sessionLabel.textContent = `session: exited (${event.exitCode ?? 'null'})`
      return
    default:
      return
  }
}

function pushRawEvent(event: unknown): void {
  state.rawEvents.push(event)

  if (state.rawEvents.length > 100) {
    state.rawEvents.shift()
  }

  renderRaw()
}

function renderSemantic(value: unknown): void {
  semanticOutput.textContent = JSON.stringify(value, null, 2)
}

function renderRaw(): void {
  rawOutput.textContent = JSON.stringify(state.rawEvents, null, 2)
}

function renderElements(elements: Array<{ id: string; role: string; text?: string; name?: string }>): void {
  elementsContainer.innerHTML = ''

  for (const element of elements) {
    const card = document.createElement('div')
    card.className = 'element-card'
    card.innerHTML = `<strong>${element.role}</strong><br />${element.name ?? element.text ?? element.id}`
    elementsContainer.append(card)
  }
}

function renderActionButtons(): void {
  actionsContainer.innerHTML = ''

  const activeDriver = state.driverId ?? profileSelect.value
  const quickActions = (QUICK_ACTIONS[activeDriver] ?? []).filter((action) => {
    if (activeDriver !== 'htop' || !action.destructive) {
      return true
    }

    return !isReadonlyHtopContext()
  })

  for (const action of quickActions) {
    const button = document.createElement('button')
    button.textContent = action.label
    button.addEventListener('click', () => {
      void invokeAction(action.name, action.args)
    })
    actionsContainer.append(button)
  }
}

function renderProfileInputs(): void {
  const profile = profileSelect.value
  profileFileInput.hidden = profile !== 'nano'
  profilePidsInput.hidden = profile !== 'htop'
  profileReadonlyWrap.hidden = profile !== 'htop'
}

function renderAll(): void {
  sessionLabel.textContent = state.sessionId ? `session: ${state.sessionId}` : 'no session'
  driverLabel.textContent = `driver: ${state.driverId ?? 'none'}`
  revisionLabel.textContent = `revision: ${state.revision}`
  recordingLabel.textContent = state.recordingPath
    ? `recording: ${state.recordingPath}`
    : 'recording: idle'
  renderSemantic(state.semantic)
  renderRaw()
  renderElements([])
  renderActionButtons()
}

function isReadonlyHtopContext(): boolean {
  if ((state.driverId ?? profileSelect.value) !== 'htop') {
    return false
  }

  return state.htopReadonly
}

function send(message: Omit<ClientToHostMessage, 'v' | 'id'> & { id?: string }): string {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket is not connected')
  }

  const id = message.id ?? crypto.randomUUID()

  state.socket.send(
    JSON.stringify({
      v: PROTOCOL_VERSION,
      ...message,
      id
    })
  )

  return id
}

async function request<TType extends HostToClientMessage['type']>(
  expectedType: TType,
  message: Omit<ClientToHostMessage, 'v' | 'id'> & { id?: string }
): Promise<Extract<HostToClientMessage, { type: TType }>> {
  const requestId = send(message)

  return new Promise((resolve, reject) => {
    pending.set(requestId, {
      resolve: (response) => {
        if (response.type !== expectedType) {
          reject(new Error(`Expected ${expectedType}, received ${response.type}`))
          return
        }

        resolve(response as Extract<HostToClientMessage, { type: TType }>)
      },
      reject
    })
  })
}

async function onceOpen(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.OPEN) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const onOpen = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('WebSocket connection failed'))
    }
    const cleanup = () => {
      socket.removeEventListener('open', onOpen)
      socket.removeEventListener('error', onError)
    }

    socket.addEventListener('open', onOpen, { once: true })
    socket.addEventListener('error', onError, { once: true })
  })
}

function setConnectionStatus(value: string): void {
  connectionLabel.textContent = value
}

function parseActionArgs(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch (error) {
    console.error(error)
    throw new Error('Action args must be valid JSON')
  }
}

function parsePidList(value: string): number[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => Number.parseInt(entry, 10))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector(selector)

  if (!element) {
    throw new Error(`Missing element: ${selector}`)
  }

  return element as T
}
