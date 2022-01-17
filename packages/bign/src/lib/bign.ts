export class N {

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
  public readonly decimals: number
  /** Decimals as multipliert: 10^decimals. */
  public readonly decimalsFactor: bigint

  /** Internal value is original value rebased on higher precision. */
  public value: bigint
  /** Internal decimal precision. */
  public precision: number
  /** Decimal precision as multiplier: 10^precision. */
  public factor: bigint

  constructor(value: N)
  constructor(value: bigint, decimals: number, precision: number, options: { isPrecise: true })
  constructor(value?: string | number | bigint, decimals?: number, precision?: number, options?: { isPrecise?: boolean })
  constructor(value: string | number | bigint | N = 0, decimals = 0, precision: number = N.DEFAULT_PRECISION, options?: { isPrecise?: boolean }) {

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

  /** Returns the internal value using internal precision. */
  toPrecise(): bigint { return this.value }

  /** Returns the original decimal BigInt value as string. */
  toString(): string {
    const precise = this.toDecimal()
    return precise.toString().slice(0, -this.decimals) + '.' + precise.toString().slice(-this.decimals)
  }

  clone() {
    return new N(this)
  }

  plus(Addend: N) {
    const augend = this.value
    const addend = this.rebase(Addend)
    this.value = augend + addend
    return this
  }

  minus(Subtrahend: N) {
    const minuend = this.value
    const subtrahend = this.rebase(Subtrahend)
    this.value = minuend - subtrahend
    return this
  }

  mul(Factor: N) {
    const multiplier = this.value
    const multiplicand = this.rebase(Factor)
    this.value = multiplier * multiplicand / this.factor
    return this
  }

  div(Divisor: N) {
    const dividend = this.value
    const divisor = this.rebase(Divisor)
    this.value = this.factor * dividend / divisor
    return this
  }

  /** Brings the other operand to same precision to allow mathematical interaction. */
  private rebase(instance: N) {
    return this.factor * instance.value / instance.factor
  }

}
