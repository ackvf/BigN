import { red, green } from '@ackvf/colors'
import { assert } from 'console'

export type NLike = string | number | bigint | N

export type Rounder = (value: bigint, factor: bigint) => 1n | -1n | 0n

/* Exported at N.ROUNDING */
enum ROUNDING_MODES {
  // 'DOWN' = 0,
  // 'UP' = 1,
  /** a.k.a. Truncate */
  'TOWARD_ZERO' = 2,
  // 'AWAY_FROM_ZERO' = 3,
  // 'HALF_DOWN' = 4,
  // 'HALF_UP' = 5,
  // 'HALF_TOWARD_ZERO' = 6,
  'HALF_AWAY_FROM_ZERO' = 7,
  // 'HALF_TO_EVEN' = 8,
  // 'HALF_TO_ODD' = 9,
  'CUSTOM' = 10,
}

// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------

/**
 * @author Qwerty (Vítězslav Ackermann Ferko) <qwerty@qwerty.xyz>
 *
 * @description This library is intended to work as a replacement for other
 * BigInt-like libraries, such as BigNumber, by implementing all the necessary methods.
 * Simply replace the imports and it should work(tm).
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
   * You can override this value adhoc in situ.
   * @example
   *
   * let n = new N(12300, 2, 80) // <- 80 is the precision override
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
   * Given float value 123.456 and DEFAULT_PRECISION = 5,
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
  public readonly precision: number = N.DEFAULT_PRECISION
  /** Internal decimal precision as multiplier: 10^precision. */
  public readonly factor!: bigint

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
  constructor(value: NLike = 0, decimals = 0, precision: number = N.DEFAULT_PRECISION || decimals, options?: { isPrecise?: boolean }) {

    if (value instanceof N) {
      return Object.assign(this, value)
    }

    if (typeof value === 'string' && value.includes('.')) {
      decimals = value.length - 1 - value.indexOf('.')
      value = value.split('.').join('')
      precision ||= decimals
    }

    assert(decimals >= 0, "Decimals cannot be negative.")
    assert(precision >= 0, 'Precision cannot be negative.') // TODO: it actually can https://simple.wikipedia.org/wiki/Precision_(numbers)

    this.decimals = decimals
    this.decimalsFactor = 10n ** BigInt(decimals)

    this.precision = precision
    this.factor = 10n ** BigInt(precision)

    if (options?.isPrecise === true) {
      this.value = BigInt(value)
    } else {
      this.value = BigInt(value) * this.factor / this.decimalsFactor
    }

  }

  clone() {
    return new N(this)
  }

  /** Returns the rounded BigInt value. Same as calling `N.toDecimal(0)`. */
  valueOf(): bigint { return this.value / this.factor + this.rounder() }

  /** Returns the internal BigInt value using internal precision. */
  toPrecise(): bigint { return this.value }

  /** Returns the value as a bigint with original decimals. */
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
    const decimal = this.toDecimal(precision).toString().padStart(precision, '0')
    return (precision) > 0
      ? decimal.slice(0, -precision) + '.' + decimal.slice(-precision)
      : decimal + ''.padEnd(-precision, '0')
  }

  /* Arithmetics */

  plus(Addend: NLike): N {
    const Augend = this.clone()
    const augend = Augend.value
    const addend = this.rebase(Addend)
    Augend.value = augend + addend
    return Augend
  }

  minus(Subtrahend: NLike): N {
    const Minuend = this.clone()
    const minuend = Minuend.value
    const subtrahend = this.rebase(Subtrahend)
    Minuend.value = minuend - subtrahend
    return Minuend
  }

  mul(Factor: NLike): N {
    const Multiplier = this.clone()
    const multiplier = Multiplier.value
    const multiplicand = this.rebase(Factor)
    Multiplier.value = multiplier * multiplicand / this.factor
    return Multiplier
  }

  /** Alias for `mul(NLike)`. Used by BigNumber.js. */
  multipliedBy(Factor: NLike): N { return this.mul(Factor) }

  div(Divisor: NLike): N {
    const Dividend = this.clone()
    const dividend = Dividend.value
    const divisor = this.rebase(Divisor)
    Dividend.value = this.factor * dividend / divisor
    return Dividend
  }

  sq(): N {
    return this.mul(this)
  }

  sqrt(): N {
    const Radicand = this.clone()

    if (Radicand.value < 0n) {
      throw 'square root of negative numbers is not supported'
    }

    if (Radicand.value < 2n) {
      return Radicand
    }

    function newtonIteration(n: bigint, x0: bigint): bigint {
      const x1 = ((n / x0) + x0) >> 1n
      if (x0 === x1 || x0 === (x1 - 1n)) {
        return x0
      }
      return newtonIteration(n, x1)
    }

    Radicand.value = newtonIteration(Radicand.value * Radicand.factor, 1n)
    return Radicand
  }

  /* Comparisons */

  eq(Comparand: NLike): boolean {
    const compared = this.value
    const comparand = this.rebase(Comparand)
    return compared == comparand
  }

  lt(Comparand: NLike): boolean {
    const compared = this.value
    const comparand = this.rebase(Comparand)
    return compared < comparand
  }

  lte(Comparand: NLike): boolean {
    const compared = this.value
    const comparand = this.rebase(Comparand)
    return compared <= comparand
  }

  gt(Comparand: NLike): boolean {
    const compared = this.value
    const comparand = this.rebase(Comparand)
    return compared > comparand
  }

  gte(Comparand: NLike): boolean {
    const compared = this.value
    const comparand = this.rebase(Comparand)
    return compared >= comparand
  }

  /* Helpers */

  /** Brings the other operand to the same precision to allow mathematical interaction. */
  private rebase(instance: NLike): bigint {
    instance = this.nfy(instance)

    if (instance.precision != this.precision) {
      /*
        The other instance's value can potentially lose precision if it has higher factor
        than this.factor or the DEFAULT_PRECISION, but it shouldn't matter anyway,
        since we have a fixed precision on *this*,
        meaning that the result of the arithmetic operation would get truncated anyway.
      */
      return this.factor * instance.value / instance.factor
    }

    return instance.value
  }

  /** This is an internal shortcut for the constructor. Pronounced N-fy. */
  private nfy(instance: NLike): N {
    if (!(instance instanceof N)) {
      return new N(instance, 0, this.precision)
    }
    return instance
  }

  /** When rounding, this represents the carried "1" that needs to be added or subtracted. */
  private rounder(value: bigint = this.value, factor: bigint = this.factor) {
    return this.rounders[N.ROUNDING_MODE](value, factor)
  }

  readonly rounders = {
    [N.ROUNDING.TOWARD_ZERO]: function TOWARD_ZERO(value: bigint, factor: bigint) {
      return 0n
    },
    [N.ROUNDING.HALF_AWAY_FROM_ZERO]: function HALF_AWAY_FROM_ZERO(value: bigint, factor: bigint) {
      const sign = value < 0 ? -1n : 1n
      return (sign * value % factor) << 1n >= factor ? sign : 0n
    },
    /** Custom rounding function can be configured at N.ROUNDING_CUSTOM_FUNCTION. */
    [N.ROUNDING.CUSTOM]: N.ROUNDING_CUSTOM_FUNCTION,
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
  namespace jest { // eslint-disable-line @typescript-eslint/no-namespace
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
