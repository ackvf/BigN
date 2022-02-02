import type N from "../N"
import { green, red } from "./colors"

function jestMessage(name: string, actual: any, expected: any) {
  return () => `expect(${red`received`})${name}(${green`expected`})

Expected: "${green(expected)}"
Received: "${red(actual)}"`
}

export const jestMatchers = {
  N_toExactlyMatch(actual: N, expected: N) {
    let pass = true

    if (actual.value !== expected.value) pass = false
    if (actual.precision !== expected.precision) pass = false
    if (actual.factor !== expected.factor) pass = false

    if (pass) {
      return {
        message: jestMessage('.not.N_toExactlyMatch', actual, expected),
        pass: true,
      }
    } else {
      return {
        message: jestMessage('.N_toExactlyMatch', actual, expected),
        pass: false,
      }
    }
  },
  N_toBeAround(actual: bigint | number, expected: bigint | number, precision?: bigint | number) {
    let pass = false

    if (typeof actual === 'bigint' && typeof expected === 'bigint' && typeof precision === 'bigint') {
      actual = actual / 10n ** precision
      expected = expected / 10n ** precision
      pass = actual - expected === 0n
    }
    else if (typeof actual === 'number' && typeof expected === 'number' && typeof precision === 'number') {
      actual = actual / 10 ** precision
      expected = expected / 10 ** precision
      pass = actual - expected === 0
    }

    if (pass) {
      return {
        message: jestMessage('.not.N_toBeAround', actual, expected),
        pass: true
      }
    } else {
      return {
        message: jestMessage('.N_toBeAround', actual, expected),
        pass: false
      }
    }
  }

}

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Tests that two instances match exactly, that is, their `value`, `precision` and `factor` are exactly the same.
       *
       * @example
       * import { jestMatchers } from 'BigN'
       * expect.extend(jestMatchers)
       */
      N_toExactlyMatch(b: N): R
      /**
       * @example
       * import { jestMatchers } from 'BigN'
       * expect.extend(jestMatchers)
       */
      N_toBeAround<T extends bigint | number>(b: T, precisionCutOff?: T): R
    }
  }
}
