import { N } from './bign'

// Make BigInt serializable with `JSON.stringify()`
(BigInt.prototype as any).toJSON = function () { return this.toString() }

expect.extend({
  toExactlyMatchN(a: N, b: N) {
    let pass = true

    /* TODO: Maybe refine this later. What exactly should match for two bigints to be equal? Only their Integer part or also decimal precision? */
    if (a.value !== b.value) pass = false
    if (a.precision !== b.precision) pass = false
    if (a.factor !== b.factor) pass = false

    if (pass) {
      return {
        message: () =>
          `expected ${a.toString()} not to be same as ${b.toString()}`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${b.toString()} to be same as ${b.toString()}`,
        pass: false,
      }
    }
  },
})

declare global {
  namespace jest { // eslint-disable-line @typescript-eslint/no-namespace
    interface Matchers<R> {
      toExactlyMatchN(b: N): R
    }
  }
}

describe('N: BigInt tests', () => {

  const A = () => new N(10000n, 2)    // 100.00
  const B = () => new N(2345000n, 5)  //  23.45000
  const C = () => new N(123450n, 3)   // 123.450

  const D = () => new N(500n, 1)      // 50.0
  const E = () => new N(200000n, 5)   //  2.00000

  /* Construction */

  describe('Construction', () => {

    const control = A()

    test(`new N(number)`, () => {
      const result = new N(10000, 2)
      expect(result).toExactlyMatchN(control)
    })

    test(`new N(bigint)`, () => {
      const result = new N(10000n, 2)
      expect(result).toExactlyMatchN(control)
    })

    test(`new N(string)`, () => {
      const result = new N('10000', 2)
      expect(result).toExactlyMatchN(control)
    })

    test(`new N(decimal string)`, () => {
      const result = new N('100.00')
      expect(result).toExactlyMatchN(control)
    })

    test(`new N(N)`, () => {
      const a = new N(100n)

      const result = new N(a)
      expect(result).toExactlyMatchN(control)
    })

    test(`new N({ isPrecise: true })`, () => {
      const a = new N(123456789000000000n, 2, 10, { isPrecise: true })

      const result = a.toString()
      const expected = '12345678.90'

      expect(result).toEqual(expected)
    })

    test(`N.clone()`, () => {
      const a = new N(100n)

      const result = new N(a)
      expect(result).toExactlyMatchN(control)
    })

  })

  /* Methods */

  describe('Methods', () => {

    test(`N.valueOf()`, () => {
      const a = A()

      const result = a.valueOf()
      const expected = 100n

      expect(result === expected).toBeTruthy()
    })

    test(`N.toDecimal()`, () => {
      const a = A()

      const result = a.toDecimal()
      const expected = 10000n

      expect(result === expected).toBeTruthy()
    })

    test(`N.toPrecise()`, () => {
      const a = A()

      const result = a.toPrecise()
      const expected = 100n * 10n ** BigInt(N.DEFAULT_PRECISION)

      expect(result === expected).toBeTruthy()
    })

    test(`N.toString()`, () => {
      const a = A()

      const result = a.toString()
      const expected = '100.00'

      expect(result).toBe(expected)
    })
  })

  /* Arithmetics */

  describe('Arithmetics', () => {

    test(`N.plus()  : A+B=C`, () => {
      const expected = C().toPrecise()

      const a = A()
      const b = B()
      const result = a.plus(b).toPrecise()

      expect(result).toBe(expected)
    })

    test(`N.minus() : C-B=A`, () => {
      const expected = A().toPrecise()

      const a = C()
      const b = B()
      const result = a.minus(b).toPrecise()

      expect(result).toBe(expected)
    })

    test(`N.mul()   : D×E=A`, () => {
      const expected = A().toPrecise()

      const a = D()
      const b = E()
      const result = a.mul(b).toPrecise()

      expect(result).toBe(expected)
    })

    test(`N.div()   : A÷E=D`, () => {
      const expected = D().toPrecise()

      const a = A()
      const b = E()
      const result = a.div(b).toPrecise()

      expect(result).toBe(expected)
    })

  })

})
