import { red, green } from '@ackvf/colors'
import { assert } from 'console'

export type NLike = string | number | bigint | N

export type Rounder = (value: bigint, factor: bigint) => 1n | -1n | 0n

/* Exported at N.ROUNDING */
enum ROUNDING_MODES {
  /** a.k.a. **Floor** or **toward Negative Infinity** */
  'DOWN' = 'DOWN',
  /** a.k.a. **Ceil** or **toward Positive Infinity** */
  'UP' = 'UP',
  /** a.k.a. **Truncate** */
  'TOWARD_ZERO' = 'TOWARD_ZERO',
  // 'AWAY_FROM_ZERO' = 'AWAY_FROM_ZERO',
  // 'HALF_DOWN' = 'HALF_DOWN',
  // 'HALF_UP' = 'HALF_UP',
  // 'HALF_TOWARD_ZERO' = 'HALF_TOWARD_ZERO',
  'HALF_AWAY_FROM_ZERO' = 'HALF_AWAY_FROM_ZERO',
  // 'HALF_TO_EVEN' = 'HALF_TO_EVEN',
  // 'HALF_TO_ODD' = 'HALF_TO_ODD',
  /**
   * @example
   * N.ROUNDING_CUSTOM_FUNCTION = (value: bigint, factor: bigint): -1n | 0n | 1n => { ... }
   * N.ROUNDING_MODE = N.ROUNDING.CUSTOM
   */
  'CUSTOM' = 'CUSTOM',
}

// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------

/**
 * @author Qwerty (Vítězslav Ackermann Ferko) <qwerty@qwerty.xyz>
 *
 * @description This library is intended to work as a replacement for other
 * BigInt-like libraries, such as BigNumber, by implementing all the necessary methods.
 * Simply replace the imports and it should _just work™_.
 *
 * @example
 * // import BigNumber from "bignumber.js"  // <- before
 * import BigNumber from "BigN.ts"          // <- after
 */

export default class N {

  static readonly ROUNDING = ROUNDING_MODES

  // GLOBAL SETTINGS ---------------------------------------------------------------------------------------------------

  /**
   * The number of decimal places for internal calculations. Changing this value does not affect existing instances as it is used only in constructor.
   *
   * If set to anything less than **original decimals**, they will be used instead.
   *
   * Note: you can also override the precision adhoc in situ via constructor parameter.
   * @example
   *
   * let n = new N(12300, 2, 80) // <- precision is set to 80 in the constructor
   */
  static DEFAULT_PRECISION = 80

  /**
   * Changing this value affects all instances.
   *
   * @example
   * N.ROUNDING_MODE = N.ROUNDING.HALF_AWAY_FROM_ZERO
   */
  static ROUNDING_MODE: ROUNDING_MODES = N.ROUNDING.HALF_AWAY_FROM_ZERO

  /**
   * Override this property to provide custom rounding function.
   *
   * @example
   * N.ROUNDING_CUSTOM_FUNCTION = (value: bigint, factor: bigint): -1n | 0n | 1n => { ... }
   * N.ROUNDING_MODE = N.ROUNDING.CUSTOM
   */
  static ROUNDING_CUSTOM_FUNCTION: Rounder = () => 0n

  // INTERNALS ---------------------------------------------------------------------------------------------------------

  /**
   * Given a float value 123.456 and DEFAULT_PRECISION = 5,
   * we get 123456 with 3 decimals, which is then internally stored as:
   *
   * decimals = 3
   * decimalsFactor = 1000n
   *
   * value = 12345600n
   * precision = 5
   * factor = 100000n
   */

  /** The original token's decimals. Only used during wrapping and unwrapping. */
  public readonly decimals!: number
  /** Decimals as multiplier: 10^decimals. */
  public readonly decimalsFactor!: bigint

  /** Internal value is original value rebased on higher precision. */
  public value!: bigint
  /** Internal decimal precision. This is the number of digits used to store the decimals. https://simple.wikipedia.org/wiki/Precision_(numbers) */
  public precision: number = N.DEFAULT_PRECISION
  /** Internal decimal precision as multiplier: 10^precision. */
  public factor!: bigint

  // --

  constructor(instance: N)
  constructor(value: string, _ignored?: undefined, precision?: number)
  /**
   * @argument options.isPrecise is useful when you want to construct new N() with values from another BigInt implementation.
   * It stores the `value` directly into the new object without rebasing to new precision.
   * E.g. `12345600` from above example is a **precise** value of a number `123.456` rebased with precision = 5.
   */
  constructor(value: bigint, decimals: number, precision: number, options: { isPrecise: true })
  constructor(value?: string | number | bigint, decimals?: number, precision?: number, options?: { isPrecise?: boolean })
  /**
   * @param decimals How many numbers of the specified `value` are decimal places.
   * @param precision Calculations are performed to *this* amount of decimal places. The rest is truncated.
   * @param options.isPrecise
   * @returns
   */
  constructor(value: NLike = 0, decimals = 0, precision: number = N.DEFAULT_PRECISION, options?: { isPrecise?: boolean }) {

    if (value instanceof N) {
      return Object.assign(this, value)
    }

    if (typeof value === 'string' && value.includes('.')) {
      decimals = value.length - 1 - value.indexOf('.')
      value = value.split('.').join('')
      precision ||= decimals
    }

    assert(decimals >= 0, "Decimals cannot be negative.")

    this.decimals = decimals
    this.decimalsFactor = 10n ** BigInt(decimals)

    this.precision = precision = precision < decimals ? decimals : precision
    this.factor = 10n ** BigInt(precision)

    if (options?.isPrecise === true) {
      this.value = BigInt(value)
    } else {
      this.value = BigInt(value) * this.factor / this.decimalsFactor
    }

    console.debug('\n========== this\n', this)
  }

  clone() {
    return new N(this)
  }

  /** Returns the rounded BigInt value. Same as calling `N.toDecimal(0)`. */
  valueOf(): bigint { return this.value / this.factor + this.rounder() }

  /** Returns the internal BigInt value using internal precision. */
  toPrecise(): bigint { return this.value }

  /** Returns the value as a bigint with original decimal precision. */
  toDecimal(): bigint
  /** Returns the value as a bigint to specified precision. */
  toDecimal(precision: number): bigint
  toDecimal(precision: number = this.decimals): bigint {
    if (precision < this.precision) {
      const newDecimalsFactor = 10n ** BigInt(this.precision - precision)
      return this.value / newDecimalsFactor + this.rounder(this.value, newDecimalsFactor)
    }
    return this.value * 10n ** BigInt(precision - this.precision)
  }

  /** Returns the value as a string with decimal point and original precision. */
  toString(): string
  /** Returns the value as a string with decimal point to specified precision. */
  toString(precision: number): string
  toString(precision: number = this.decimals): string {
    const decimal: string = this.toDecimal(precision).toString().padStart(precision, '0')
    return (precision) > 0
      ? decimal.slice(0, -precision) + '.' + decimal.slice(-precision)
      : decimal + ''.padEnd(-precision, '0')
  }

  /* Arithmetics */

  plus(Addend: NLike): N {
    const Augend: N = this.clone()
    const addend: bigint = Augend.rebase(Addend).value
    const augend: bigint = Augend.value
    Augend.value = augend + addend
    return Augend
  }

  minus(Subtrahend: NLike): N {
    const Minuend: N = this.clone()
    const subtrahend: bigint = Minuend.rebase(Subtrahend).value
    const minuend: bigint = Minuend.value
    Minuend.value = minuend - subtrahend
    return Minuend
  }

  mul(Factor: NLike): N {
    const Multiplier: N = this.clone()
    const multiplicand: bigint = Multiplier.rebase(Factor).value
    const multiplier: bigint = Multiplier.value
    Multiplier.value = multiplier * multiplicand / this.factor
    return Multiplier
  }

  /** Alias for `mul(NLike)`. Used by BigNumber.js. */
  multipliedBy(Factor: NLike): N { return this.mul(Factor) }

  div(Divisor: NLike): N {
    const Dividend: N = this.clone()
    const divisor: bigint = Dividend.rebase(Divisor).value
    const dividend: bigint = Dividend.value
    Dividend.value = this.factor * dividend / divisor
    return Dividend
  }

  sq(): N {
    return this.mul(this)
  }

  sqrt(): N {
    const Radicand: N = this.clone()
    const x: bigint = Radicand.value * Radicand.factor

    if (x < 0n) { throw 'square root of negative numbers is not supported' }
    if (x < 2n) { return Radicand }

    let z: bigint = x / 2n + 1n
    let y: bigint = x
    while (z < y) {
      y = z
      z = (x / z + z) / 2n
    }

    Radicand.value = y
    return Radicand
  }

  /* Comparisons */

  eq(Comparand: NLike): boolean {
    const Compared: N = this.clone()
    const comparand: bigint = Compared.rebase(Comparand).value
    const compared: bigint = Compared.value
    return compared == comparand
  }

  lt(Comparand: NLike): boolean {
    const Compared: N = this.clone()
    const comparand: bigint = Compared.rebase(Comparand).value
    const compared: bigint = Compared.value
    return compared < comparand
  }

  lte(Comparand: NLike): boolean {
    const Compared: N = this.clone()
    const comparand: bigint = Compared.rebase(Comparand).value
    const compared: bigint = Compared.value
    return compared <= comparand
  }

  gt(Comparand: NLike): boolean {
    const Compared: N = this.clone()
    const comparand: bigint = Compared.rebase(Comparand).value
    const compared: bigint = Compared.value
    return compared > comparand
  }

  gte(Comparand: NLike): boolean {
    const Compared: N = this.clone()
    const comparand: bigint = Compared.rebase(Comparand).value
    const compared: bigint = Compared.value
    return compared >= comparand
  }

  /* Helpers */

  /** Bring both operands to the same (higher) precision of both to allow mathematical interaction. */
  private rebase(instance: NLike): N {
    instance = this.nfy(instance)

    if (instance.precision < this.precision) {
      instance.value *= 10n ** BigInt(this.precision - instance.precision)
      instance.precision = this.precision
      instance.factor = this.factor
    } else if (instance.precision > this.precision) {
      this.value *= 10n ** BigInt(instance.precision - this.precision)
      this.precision = instance.precision
      this.factor = instance.factor
    }

    return instance
  }

  /** This is an internal shortcut for the constructor. Pronounced N-fy. */
  private nfy(instance: NLike): N {
    if (!(instance instanceof N)) {
      return new N(instance, 0, this.precision)
    }
    return instance.clone()
  }

  /** When rounding, this represents the carried "1" that needs to be added or subtracted. */
  private rounder(value: bigint = this.value, factor: bigint = this.factor) {
    return N.rounders[N.ROUNDING_MODE](value, factor)
  }

  static readonly rounders = {
    [N.ROUNDING.DOWN]: function DOWN(value: bigint, factor: bigint) {
      const sign = value < 0 ? -1n : 1n
      return (sign * value % factor) === 0n
        ? 0n
        : sign < 0
          ? -1n
          : 0n
    },
    [N.ROUNDING.UP]: function UP(value: bigint, factor: bigint) {
      const sign = value < 0 ? -1n : 1n
      return (sign * value % factor) === 0n
        ? 0n
        : sign < 0
          ? 0n
          : 1n
    },
    [N.ROUNDING.TOWARD_ZERO]: function TOWARD_ZERO(value: bigint, factor: bigint) {
      return 0n
    },
    [N.ROUNDING.HALF_AWAY_FROM_ZERO]: function HALF_AWAY_FROM_ZERO(value: bigint, factor: bigint) {
      const sign = value < 0 ? -1n : 1n
      return (sign * value % factor) << 1n >= factor ? sign : 0n
    },
    /** Custom rounding function can be configured at N.ROUNDING_CUSTOM_FUNCTION. */
    [N.ROUNDING.CUSTOM]: (value: bigint, factor: bigint) => N.ROUNDING_CUSTOM_FUNCTION(value, factor),
  } as const

}

// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------

// Make BigInt serializable with `JSON.stringify()`
(BigInt.prototype as any).toJSON = function () { return this.toString() }

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
  namespace jest { // eslint-disable-line @typescript-eslint/no-namespace
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
