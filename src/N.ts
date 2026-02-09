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
 * @author Vítězslav Ackermann Ferko <qwerty@qwerty.xyz>
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
  public readonly precision: number = N.DEFAULT_PRECISION
  /** Internal decimal precision as multiplier: 10^precision. */
  public readonly factor!: bigint

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
  constructor(value: NLike = 0, decimals: number = 0, precision: number = N.DEFAULT_PRECISION, options?: { isPrecise?: boolean }) {

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
    const augend: bigint = this.value
    const addend: bigint = this.rebase(Addend)
    this.value = augend + addend
    return this
  }

  minus(Subtrahend: NLike): N {
    const minuend: bigint = this.value
    const subtrahend: bigint = this.rebase(Subtrahend)
    this.value = minuend - subtrahend
    return this
  }

  mul(Factor: NLike): N {
    const multiplier: bigint = this.value
    const multiplicand: bigint = this.rebase(Factor)
    this.value = multiplier * multiplicand / this.factor
    return this
  }

  /** Alias for `mul(NLike)`. Used by BigNumber.js. */
  multipliedBy(Factor: NLike): N { return this.mul(Factor) }

  div(Divisor: NLike): N {
    const dividend: bigint = this.value
    const divisor: bigint = this.rebase(Divisor)
    this.value = this.factor * dividend / divisor
    return this
  }

  /** Alias for `div(NLike)`. Used by BigNumber.js. */
  dividedBy(Divisor: NLike): N { return this.div(Divisor) }

  /** Integer division: returns the integer part of the division. */
  dividedToIntegerBy(Divisor: NLike): N {
    const dividend: bigint = this.value
    const divisor: bigint = this.rebase(Divisor)
    this.value = dividend / divisor * this.factor
    return this
  }

  /** Alias for `mul(NLike)`. Used by BigNumber.js. */
  times(Factor: NLike): N { return this.mul(Factor) }

  /** Alias for `sqrt()`. Used by BigNumber.js. */
  squareRoot(): N { return this.sqrt() }

  /** Absolute value. */
  abs(): N {
    if (this.value < 0n) {
      this.value = -this.value
    }
    return this
  }

  /** Alias for `abs()`. Used by BigNumber.js. */
  absoluteValue(): N { return this.abs() }

  /** Negates the value. */
  negated(): N {
    this.value = -this.value
    return this
  }

  /** Modulo/remainder. */
  modulo(Divisor: NLike): N {
    const divisor: bigint = this.rebase(Divisor)
    this.value = this.value % divisor
    return this
  }

  /** Alias for `modulo(NLike)`. */
  mod(Divisor: NLike): N { return this.modulo(Divisor) }

  /** Exponentiation by integer exponent. */
  exponentiatedBy(Exponent: NLike): N {
    const exponent = BigInt(this.nfy(Exponent).valueOf())
    if (exponent < 0n) {
      throw new Error('Negative exponent is not supported.')
    }
    let result = 1n * this.factor
    let base = this.value
    let exp = exponent
    while (exp > 0n) {
      if (exp % 2n === 1n) {
        result = result * base / this.factor
      }
      base = base * base / this.factor
      exp /= 2n
    }
    this.value = result
    return this
  }

  /** Shifts the decimal point by the given number of places. */
  shiftedBy(shift: number): N {
    if (shift === 0) {
      return this
    }
    const factor = 10n ** BigInt(Math.abs(shift))
    this.value = shift > 0 ? this.value * factor : this.value / factor
    return this
  }

  /** Number of decimal places or a rounded value if dp is specified. */
  decimalPlaces(): number
  decimalPlaces(dp: number): N
  decimalPlaces(dp?: number): number | N {
    if (dp === undefined) {
      return this.decimals
    }
    return new N(this.toString(dp))
  }

  /** Returns the integer part of the value. */
  integerValue(): N {
    const integer = this.valueOf()
    this.value = integer * this.factor
    return this
  }

  /** Number of significant digits. */
  precision(includeZeros: boolean = false): number {
    if (this.value === 0n) {
      return 1
    }
    const raw = this.toString(this.decimals).replace('-', '').replace('.', '')
    const trimmedLeading = raw.replace(/^0+/, '')
    const trimmed = includeZeros ? trimmedLeading : trimmedLeading.replace(/0+$/, '')
    return trimmed.length || 1
  }

  /** Returns a plain number representation. */
  toNumber(): number {
    return Number(this.toString(this.decimals))
  }

  /** Returns a string with fixed decimal places. */
  toFixed(dp: number = this.decimals): string {
    return this.toString(dp)
  }

  /** Returns a string with an exponent. */
  toExponential(dp?: number): string {
    const num = Number(this.toString(this.decimals))
    return dp === undefined ? num.toExponential() : num.toExponential(dp)
  }

  /** Returns a string with a specified precision. */
  toPrecision(precision?: number): string {
    const num = Number(this.toString(this.decimals))
    return precision === undefined ? num.toPrecision() : num.toPrecision(precision)
  }

  /** Returns a formatted string with grouped integer digits. */
  toFormat(dp: number = this.decimals, groupSeparator: string = ','): string {
    const [intPart, decPart] = this.toString(dp).split('.')
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)
    return decPart === undefined ? grouped : `${grouped}.${decPart}`
  }

  /** Returns a fraction as [numerator, denominator]. */
  toFraction(): [string, string] {
    let numerator = this.value
    let denominator = this.factor
    const gcd = (a: bigint, b: bigint): bigint => {
      let x = a < 0n ? -a : a
      let y = b < 0n ? -b : b
      while (y !== 0n) {
        const t = y
        y = x % y
        x = t
      }
      return x
    }
    const divisor = gcd(numerator, denominator)
    numerator /= divisor
    denominator /= divisor
    return [numerator.toString(), denominator.toString()]
  }

  /** Comparisons */
  comparedTo(Comparand: NLike): number {
    const comparand: bigint = this.rebase(Comparand)
    if (this.value === comparand) {
      return 0
    }
    return this.value > comparand ? 1 : -1
  }

  isEqualTo(Comparand: NLike): boolean { return this.eq(Comparand) }
  isGreaterThan(Comparand: NLike): boolean { return this.gt(Comparand) }
  isGreaterThanOrEqualTo(Comparand: NLike): boolean { return this.gte(Comparand) }
  isLessThan(Comparand: NLike): boolean { return this.lt(Comparand) }
  isLessThanOrEqualTo(Comparand: NLike): boolean { return this.lte(Comparand) }

  isZero(): boolean { return this.value === 0n }
  isPositive(): boolean { return this.value > 0n }
  isNegative(): boolean { return this.value < 0n }
  isInteger(): boolean { return this.value % this.factor === 0n }
  isBigNumber(): boolean { return true }
  isFinite(): boolean { return true }
  isNaN(): boolean { return false }

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
    const compared: bigint = this.value
    const comparand: bigint = this.rebase(Comparand)
    return compared == comparand
  }

  lt(Comparand: NLike): boolean {
    const compared: bigint = this.value
    const comparand: bigint = this.rebase(Comparand)
    return compared < comparand
  }

  lte(Comparand: NLike): boolean {
    const compared: bigint = this.value
    const comparand: bigint = this.rebase(Comparand)
    return compared <= comparand
  }

  gt(Comparand: NLike): boolean {
    const compared: bigint = this.value
    const comparand: bigint = this.rebase(Comparand)
    return compared > comparand
  }

  gte(Comparand: NLike): boolean {
    const compared: bigint = this.value
    const comparand: bigint = this.rebase(Comparand)
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

// Make BigInt serializable with `JSON.stringify()`
(BigInt.prototype as any).toJSON = function () { return this.toString() }
