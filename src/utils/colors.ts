export const colors = {
  uncolorize: (str: string) => str.replace(/\x1B\[\d+m/gi, ''),
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
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
    crimson: '\x1b[38m', // Scarlet
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

function interlace(strs: TemplateStringsArray, ...args: any[]): string {
  return strs.reduce((prev, current, ix) => prev + (current ?? '') + (args[ix] ?? ''), '')
}

const m = extractMessage
function extractMessage(args: Args): string {
  if (isTemplate(args)) return interlace(...args)
  return `${args[0]}`
}

function isTemplate(args: Args): args is TemplateArgs { return args[0].raw }

type TemplateArgs = [message: TemplateStringsArray, ...values: any[]]
type Args = [message: any] | TemplateArgs

// ---------------------------------------------------------------------------------------------------------------------

export const dyeRed = (...message: Args): string => colors.bg.red + colors.fg.black + m(message) + colors.reset
export const red = (...message: Args): string => colors.fg.red + m(message) + colors.reset
export const green = (...message: Args): string => colors.fg.green + m(message) + colors.reset
