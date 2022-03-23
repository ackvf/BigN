export const colors = {
  uncolorize: (str: string) => str.replace(/\x1B\[\d+m/gi, ''),
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',     // bold
  italic: '\x1b[3m',  // non-standard feature
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m',
  },

  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m',
  },
}

// TODO 256 colors https://gist.github.com/abritinthebay/d80eb99b2726c83feb0d97eab95206c4?permalink_comment_id=3991965#gistcomment-3991965


// Helper functions for template manipulation --------------------------------------------------------------------------

export function extractMessage(messages: Messages): string {
  if (isTemplate(messages)) return interlace(...messages)
  return `${messages[0]}`
}

export function isTemplate(messages: Messages): messages is TemplateArgs { return messages?.[0]?.raw }

export function interlace(strs: TemplateStringsArray, /* template values array */...args: any[]): string {
  return strs.reduce((prev, current, ix) => prev + (current ?? '') + (args[ix] ?? ''), '')
}

export type TemplateArgs = [messages: TemplateStringsArray, ...values: any[]]
export type Messages = [messages: any] | TemplateArgs
export type Colorizer = (...messages: Messages) => string
