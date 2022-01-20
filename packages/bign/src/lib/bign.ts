type NLike = string | number | bigint | N

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
  /** Decimals as multipliert: 10^decimals. */
  public readonly decimalsFactor!: bigint

  /** Internal value is original value rebased on higher precision. */
  public value!: bigint
  /** Internal decimal precision. */
  public precision: number = N.DEFAULT_PRECISION
  /** Decimal precision as multiplier: 10^precision. */
  public factor!: bigint

  constructor(value: N)
  constructor(value: bigint, decimals: number, precision: number, options: { isPrecise: true })
  constructor(value?: string | number | bigint, decimals?: number, precision?: number, options?: { isPrecise?: boolean })
  constructor(value: NLike = 0, decimals = 0, precision: number = N.DEFAULT_PRECISION, options?: { isPrecise?: boolean }) {

    if (value instanceof N) {
      Object.assign(this, value)
      return
    }

    if (typeof value === 'string' && value.includes('.')) {
      decimals = value.length - 1 - value.indexOf('.')
      value = value.split('.').join('')
    }

    this.decimals = decimals
    this.decimalsFactor = 10n ** BigInt(decimals)

    this.precision = precision < decimals ? decimals : precision
    this.factor = 10n ** BigInt(precision)

    if (options?.isPrecise === true) {
      this.value = BigInt(value)
    } else {
      this.value = BigInt(value) * this.factor / this.decimalsFactor
    }
  }

  /** Returns the truncated BigInt value. */
  valueOf(): bigint { return this.value / this.factor }

  /** Returns the BigInt value including original decimals. */
  toDecimal(): bigint { return this.value * this.decimalsFactor / this.factor }

  /** Returns the internal BigInt value using internal precision. */
  toPrecise(): bigint { return this.value }

  /** Returns the original decimal BigInt value as string. */
  toString(): string {
    const precise = this.toDecimal()
    return precise.toString().slice(0, -this.decimals) + '.' + precise.toString().slice(-this.decimals)
  }

  clone() {
    return new N(this)
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
