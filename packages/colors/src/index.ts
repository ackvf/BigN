export * from './lib/colors'

import { colors, extractMessage } from './lib/colors'
import type { Colorizer } from './lib/colors'

const m = extractMessage

/**
 * Colorize console output with these helper methods.
 * They can either be used as *tagged template literal* or as a *function*.
 *
 * @example
 * // Function call
 * red('received')
 * green(`Hi number ${five}`)
 *
 * // Tagged template literal
 * red`received`
 * green`Hi number ${five}`
 *
 * @example
 * `expect(${red`received`})${name}(${green`expected`})
 *
 * Expected: "${green(expected)}"
 * Received: "${red(actual)}"`
 */

export const red: Colorizer = (...messages) => colors.fg.red + m(messages) + colors.reset
export const green: Colorizer = (...messages) => colors.fg.green + m(messages) + colors.reset

export const dyeRed: Colorizer = (...messages) => colors.bg.red + colors.fg.black + m(messages) + colors.reset
