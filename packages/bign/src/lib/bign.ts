import { assert } from 'console'

type NLike = string | number | bigint | N

type AnyObject = Record<string, unknown>


export default class N {

  /** The number of decimal places for internal calculations. */
  static DEFAULT_PRECISION = 80

  /**
   * Given float value 123.456 and DEFAULT_PRECISION = 5,
   * we get 123456 with 3 decimals, which is then internally stored as:
   *
   *
   * decimals = 3
   * decimalsFactor = 1000
   *
   * value = 12345600
   * precision = 5
   * factor = 100000
   */

  /** The original token's decimals. Only used during wrapping and unwrapping. */
  public readonly decimals!: number
  /** Decimals as multiplier: 10^decimals. */
  public readonly decimalsFactor!: bigint

  /** Internal value is original value rebased on higher precision. */
  public value!: bigint
  /** Internal decimal precision. */
  public precision: number = N.DEFAULT_PRECISION
  /** Internal decimal precision as multiplier: 10^precision. */
  public factor!: bigint

  constructor(value: N)
  /**
   * @argument options.isPrecise is useful when you want to construct new N() with values from another BigInt implementation.
   * It stores the `value` directly into the new object without rebasing to new precision.
   * E.g. `12345600` from above example is a **precise** value of a number `123.456` rebased with precision = 5.
   */
  constructor(value: bigint, decimals: number, precision: number, options: { isPrecise: true })
  constructor(value: string, decimals?: undefined, precision?: number, options?: AnyObject)
  constructor(value?: string | number | bigint, decimals?: number, precision?: number, options?: { isPrecise?: boolean })
  /**
   * @param decimals How many numbers of the specified `value` are decimal places.
   * @param precision Calculations are performed to *this* amount of decimal places. The rest is truncated.
   * @param options.isPrecise
   * @returns
   */
  constructor(value: NLike = 0, decimals = 0, precision: number = N.DEFAULT_PRECISION, options?: { isPrecise?: boolean }) {

    assert(precision >= decimals, 'Precision cannot be smaller than decimals.')

    if (value instanceof N) {
      return Object.assign(this, value)
    }

    if (typeof value === 'string' && value.includes('.')) {
      decimals = value.length - 1 - value.indexOf('.')
      value = value.split('.').join('')
    }

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

  /** Returns the truncated BigInt value. */
  valueOf(): bigint { return this.value / this.factor }

  /** Returns the BigInt value including original decimals. */
  toDecimal(): bigint
  /** Returns the BigInt value including specified number of decimals. */
  toDecimal(decimals: number): bigint

  toDecimal(decimals: number = this.decimals): bigint {
    return this.value * (10n ** BigInt(decimals)) / this.factor
  }

  /** Returns the internal BigInt value using internal precision. */
  toPrecise(): bigint { return this.value }

  /** Returns the value as a decimal string. */
  toString(): string {
    const decimal = this.toDecimal().toString().padStart(this.decimals, '0')
    return this.decimals
      ? decimal.slice(0, -this.decimals) + '.' + decimal.slice(-this.decimals)
      : decimal
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

  /** Alias for `mul(N)`. Used by BigNumber.js. */
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

  /** Brings the other operand to same precision to allow mathematical interaction. */
  private rebase(instance: NLike): bigint {
    if (!(instance instanceof N)) {
      instance = this.nify(instance)
    }

    if (instance.precision != this.precision) {
      /*
        The instance's value can potentially lose precision if it has higher factor
        than this.factor or the DEFAULT_PRECISION, but it shouldn't matter anyway,
        since we have a fixed precision on *this*,
        meaning that the result of the arithmetic operation would get truncated anyway.
      */
      return this.factor * instance.value / instance.factor
    }

    return instance.value
  }

  /** This is an internal shortcut for the constructor. */
  private nify(instance: NLike): N {
    if (!(instance instanceof N)) {
      return new N(instance, 0, this.precision)
    }
    return instance
  }

}
