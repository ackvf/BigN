import N from "../N"
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
    if (actual.decimals !== expected.decimals) pass = false
    if (actual.decimalsFactor !== expected.decimalsFactor) pass = false
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
  N_toBeAround(actual: N | bigint | number, expected: N | bigint | number, precision?: bigint | number) {
    let pass = false

    if (actual instanceof N) actual = actual.toDecimal()
    if (expected instanceof N) expected = expected.toDecimal()

    if (typeof actual === 'bigint' && typeof expected === 'bigint' && typeof precision === 'bigint') {
      precision ??= 0n
      actual = actual / 10n ** precision
      expected = expected / 10n ** precision
      pass = actual - expected === 0n
    }
    else if (typeof actual === 'number' && typeof expected === 'number' && typeof precision === 'number') {
      precision ??= 0
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
       * *If you want to use this matcher, you need to import it.*
       * @example
       * import { jestMatchers } from 'BigN'
       * expect.extend(jestMatchers)
       */
      N_toExactlyMatch(b: N): R
      /**
       * Tests that two values are close to each other with certain precision. `precisionCutOff` controls how many insignificant places are ignored during comparison.
       * For example `1234567` and `1234500` are considered equal when the `precisionCutOff` is set to `2`.
       *
       * *If you want to use this matcher, you need to import it.*
       * @example
       * import { jestMatchers } from 'BigN'
       * expect.extend(jestMatchers)
       */
      N_toBeAround<T = bigint | number>(b: T | N, precisionCutOff?: typeof b extends N ? bigint : T): R
    }
  }
}
