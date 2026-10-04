// Plain words for the hooks a mod listens to (its inputs) and the mods API calls it
// makes (its outputs). Words come from the Claude Code mods reference. Anything not in
// these tables is shown as raw text, so nothing a mod declares is hidden.

export const RISK_ORDER = ['high', 'medium', 'low', 'info']

const CALLS = {
  '$.process.run': { label: 'RUN', words: 'Starts programs on your machine', risk: 'high' },
  '$.http.fetch': { label: 'NET', words: 'Makes network requests', risk: 'high' },
  '$.fs.write': { label: 'WRITE', words: 'Writes files', risk: 'high' },
  '$.env.get': { label: 'ENV', words: 'Reads environment variables, which can hold secrets', risk: 'high' },
  '$.fs.read': { label: 'READ', words: 'Reads files', risk: 'medium' },
  '$.model.complete': { label: 'MODEL', words: 'Calls a model on your plan or API key', risk: 'medium' },
  '$.prompt.fill': { label: 'TYPE', words: 'Types text into your prompt', risk: 'medium' },
  '$.fs.list': { label: 'FILES', words: 'Looks at file names, sizes and dates', risk: 'low' },
  '$.fs.exists': { label: 'FILES', words: 'Looks at file names, sizes and dates', risk: 'low' },
  '$.fs.stat': { label: 'FILES', words: 'Looks at file names, sizes and dates', risk: 'low' },
  '$.ui.copy': { label: 'CLIP', words: 'Copies text to your clipboard', risk: 'low' },
  '$.audio.play': { label: 'SOUND', words: 'Plays sounds', risk: 'low' },
  '$.session.cwd': { label: 'SESS', words: 'Reads session details: folder, model, usage and turns', risk: 'low' },
  '$.session.model': { label: 'SESS', words: 'Reads session details: folder, model, usage and turns', risk: 'low' },
  '$.session.usage': { label: 'SESS', words: 'Reads session details: folder, model, usage and turns', risk: 'low' },
  '$.session.turns': { label: 'SESS', words: 'Reads session details: folder, model, usage and turns', risk: 'low' },
  '$.command.register': { label: 'CMD', words: 'Adds a slash command', risk: 'info' },
  '$.ui.open': { label: 'DRAW', words: 'Draws in the Claude Code interface', risk: 'info' },
  '$.ui.close': { label: 'DRAW', words: 'Draws in the Claude Code interface', risk: 'info' },
  '$.ui.panes': { label: 'DRAW', words: 'Draws in the Claude Code interface', risk: 'info' },
  '$.ui.resolve': { label: 'DRAW', words: 'Draws in the Claude Code interface', risk: 'info' },
  '$.ui.status': { label: 'DRAW', words: 'Draws in the Claude Code interface', risk: 'info' },
  '$.ui.toast': { label: 'TOAST', words: 'Shows short notices', risk: 'info' },
  '$.ui.log': { label: 'LOG', words: 'Writes lines to the transcript', risk: 'info' },
  '$.state.get': { label: 'DATA', words: 'Keeps its own saved data', risk: 'info' },
  '$.state.set': { label: 'DATA', words: 'Keeps its own saved data', risk: 'info' },
  '$.store.get': { label: 'DATA', words: 'Keeps its own saved data', risk: 'info' },
  '$.store.set': { label: 'DATA', words: 'Keeps its own saved data', risk: 'info' },
  '$.clock.now': { label: 'TIME', words: 'Uses the clock and timers', risk: 'info' },
  '$.clock.every': { label: 'TIME', words: 'Uses the clock and timers', risk: 'info' },
  '$.clock.after': { label: 'TIME', words: 'Uses the clock and timers', risk: 'info' },
  '$.clock.sleep': { label: 'TIME', words: 'Uses the clock and timers', risk: 'info' },
}

const HOOKS = {
  'classic.PreToolUse': { label: 'GATE', words: 'Can approve or block tool calls before they run', risk: 'high' },
  'tool.call': { label: 'TOOL', words: 'Sees every tool call, and can change or answer it', risk: 'high' },
  'tool.check': { label: 'TOOL', words: 'Sees every tool call, and can change or answer it', risk: 'high' },
  'prompt.submit': { label: 'PROMPT', words: 'Sees and can change the prompts you send', risk: 'medium' },
  'prompt.compose': { label: 'PROMPT', words: 'Sees and can change the prompts you send', risk: 'medium' },
  'turn.start': { label: 'TURN', words: 'Follows each turn', risk: 'low' },
  'turn.complete': { label: 'TURN', words: 'Follows each turn', risk: 'low' },
  'classic.Notification': { label: 'NOTE', words: 'Sees notifications', risk: 'low' },
  'session.start': { label: 'START', words: 'Runs when a session starts or ends', risk: 'info' },
  'session.end': { label: 'START', words: 'Runs when a session starts or ends', risk: 'info' },
  'classic.SessionEnd': { label: 'START', words: 'Runs when a session starts or ends', risk: 'info' },
  'classic.Stop': { label: 'STOP', words: 'Runs when Claude stops working', risk: 'info' },
  'command.run': { label: 'CMD', words: 'Answers its own slash commands', risk: 'info' },
  'ui.render': { label: 'DRAW', words: 'Draws or redraws parts of the interface', risk: 'info' },
  'ui.close': { label: 'DRAW', words: 'Draws or redraws parts of the interface', risk: 'info' },
}

// "ui.render{component=Pane}" is the ui.render hook with a filter.
const baseName = item => item.split('{')[0]

function describe(items, table, kind) {
  const groups = new Map()
  for (const item of items) {
    const known = table[baseName(item)]
    const key = known ? known.words : `raw:${item}`
    const group = groups.get(key) ?? {
      kind, label: known?.label ?? baseName(item).split('.').pop().toUpperCase().slice(0, 6),
      words: known?.words ?? item, risk: known?.risk ?? 'medium', known: Boolean(known), raw: [],
    }
    groups.set(key, { ...group, raw: [...group.raw, item] })
  }
  return [...groups.values()]
}

const byRisk = (a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk) || a.words.localeCompare(b.words)

export function capabilities({ hooks, calls }) {
  return {
    inputs: describe(hooks, HOOKS, 'hook').sort(byRisk),
    outputs: describe(calls, CALLS, 'call').sort(byRisk),
  }
}

export function topRisk({ inputs, outputs }) {
  const all = [...inputs, ...outputs]
  return RISK_ORDER.find(risk => all.some(group => group.risk === risk)) ?? 'info'
}
