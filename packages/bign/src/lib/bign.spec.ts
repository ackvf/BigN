import N from './bign'


expect.extend({
  N_toExactlyMatch(a: N, b: N) {
    let pass = a.eq(b)

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
      N_toExactlyMatch(b: N): R
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
      expect(result).N_toExactlyMatch(control)
    })

    test(`new N(bigint)`, () => {
      const result = new N(10000n, 2)
      expect(result).N_toExactlyMatch(control)
    })

    test(`new N(string)`, () => {
      const result = new N('10000', 2)
      expect(result).N_toExactlyMatch(control)
    })

    test(`new N(decimal string)`, () => {
      const result = new N('100.00')
      expect(result).N_toExactlyMatch(control)
    })

    test(`new N(N)`, () => {
      const a = new N(100n)

      const result = new N(a)
      expect(result).N_toExactlyMatch(control)
      expect(result !== control).toBeTruthy()
    })

    test(`new N({ isPrecise: true })`, () => {
      const a = new N(123456789000000000n, 2, 10, { isPrecise: true })

      const result = a.toString()
      const expected = '12345678.90'

      expect(result).toEqual(expected)
    })

    test(`N.clone()`, () => {
      const a = new N(100n)

      const result = a.clone()
      expect(result).N_toExactlyMatch(control)
      expect(result !== control).toBeTruthy()
    })

  })

  /* Methods */

  describe('Methods', () => {

    test(`N.valueOf()`, () => {
      const a = A()

      const result = a.valueOf()
      const expected = 100n

      expect(result.toString()).toBe(expected.toString())
    })

    test(`N.toDecimal()`, () => {
      const c = C()

      const result = c.toDecimal()
      const expected = 123450n

      expect(result.toString()).toBe(expected.toString())
    })

    test(`N.toDecimal(number) : number > N.precision`, () => {
      const a = A()
      const newDecimals = 90

      const result = a.toDecimal(newDecimals)
      const expected = 100n * 10n ** BigInt(newDecimals)

      expect(result.toString()).toBe(expected.toString())
    })

    test(`N.toDecimal(number) : number < N.precision`, () => {
      const a = A()
      const newDecimals = 70

      const result = a.toDecimal(newDecimals)
      const expected = 100n * 10n ** BigInt(newDecimals)

      expect(result.toString()).toBe(expected.toString())
    })

    test(`N.toPrecise()`, () => {
      const a = A()

      const result = a.toPrecise()
      const expected = 100n * 10n ** BigInt(N.DEFAULT_PRECISION)

      expect(result.toString()).toBe(expected.toString())
    })

    describe('N.toString()', () => {
      /**
       * The following toString tests simultaneously test `toString()` `toDecimal()` and ***rounding***
       */
      const x = new N(123456789098765n, 5)

      test(`N.toString()`, () => {
        const result = x.toString()
        const expected = '1234567890.98765'

        expect(result).toBe(expected)
      })

      test(`N.toString(number) : number = N.decimals`, () => {
        const result = x.toString(5)
        const expected = '1234567890.98765'

        expect(result).toBe(expected)
      })

      test(`N.toString(number) : number > N.decimals`, () => {
        const result = x.toString(8)
        const expected = '1234567890.98765000'

        expect(result).toBe(expected)
      })

      test(`N.toString(number) : number < N.decimals`, () => {
        const result = x.toString(3)
        const expected = '1234567890.988'

        expect(result).toBe(expected)
      })

      test(`N.toString(number) : number = 0`, () => {
        const result = x.toString(0)
        const expected = '1234567891'

        expect(result).toBe(expected)
      })

      test(`N.toString(number) : number < 0`, () => {
        const result = x.toString(-3)
        const expected = '1234568000'

        expect(result).toBe(expected)
      })

    })

  })

  /* Rounding */

  describe('Rounding', () => {

    afterAll(() => {
      // Set back the default rounding method
      N.ROUNDING_MODE = N.ROUNDING.HALF_AWAY_FROM_ZERO
    })

    describe('N.ROUNDING.HALF_AWAY_FROM_ZERO', () => {

      beforeAll(() => {
        N.ROUNDING_MODE = N.ROUNDING.HALF_AWAY_FROM_ZERO
      })

      test(`N.valueOf() : 4 rounds down`, () => {
        const c = C()

        const result = c.valueOf()
        const expected = 123n

        expect(result.toString()).toBe(expected.toString())
      })

      test(`N.valueOf() : 5 rounds up`, () => {
        const n = new N('1234.5')

        const result = n.valueOf()
        const expected = 1235n

        expect(result.toString()).toBe(expected.toString())
      })

      test(`N.valueOf() : -4 rounds up`, () => {
        const n = new N('-123.45')

        const result = n.valueOf()
        const expected = -123n

        expect(result.toString()).toBe(expected.toString())
      })

      test(`N.valueOf() : -5 rounds down`, () => {
        const n = new N('-1234.5')

        const result = n.valueOf()
        const expected = -1235n

        expect(result.toString()).toBe(expected.toString())
      })

      test(`rounding is symmetric : - new N(n).toDecimal() == new N(-n).toDecimal()`, () => {
        const m = new N('123.45')
        const n = new N('-123.45')

        const mr = (-m.toDecimal(1)).toString()
        const nr = n.toDecimal(1).toString()
        const expected = '-1235'

        expect(mr).toBe(expected)
        expect(mr).toBe(nr)
      })

    })

  })

  /* Arithmetics */

  describe('Arithmetics', () => {

    test(`N.plus(N)  : A+B=C`, () => {
      const expected = C().toPrecise()

      const a = A()
      const b = B()
      const result = a.plus(b).toPrecise()

      expect(result).toBe(expected)
    })

    test(`N.minus(N) : C-B=A`, () => {
      const expected = A().toPrecise()

      const a = C()
      const b = B()
      const result = a.minus(b).toPrecise()

      expect(result).toBe(expected)
    })

    test(`N.mul(N)   : D×E=A`, () => {
      const expected = A().toPrecise()

      const a = D()
      const b = E()
      const result = a.mul(b).toPrecise()

      expect(result).toBe(expected)
    })

    test(`N.div(N)   : A÷E=D`, () => {
      const expected = D().toPrecise()

      const a = A()
      const b = E()
      const result = a.div(b).toPrecise()

      expect(result).toBe(expected)
    })

    test(`N.sqrt()   : √A`, () => {
      const a = A()

      const result = Number(a.sqrt())
      const expected = Math.sqrt(Number(a))

      expect(result).toBe(expected)
    })

  })

  /* Comparisons */

  describe('Comparisons : B < A < C', () => {

    describe('Truthy', () => {

      test(`N.eq(N)  : A == A`, () => {
        const compared = A()
        const comparand = A()
        expect(compared.eq(comparand)).toBeTruthy()
      })

      test(`N.lt(N)  : A < C`, () => {
        const compared = A()
        const comparand = C()
        expect(compared.lt(comparand)).toBeTruthy()
      })

      test(`N.lte(N) : A <= C`, () => {
        const compared = A()
        const comparand = C()
        expect(compared.lte(comparand)).toBeTruthy()
      })

      test(`N.gt(N)  : A > B`, () => {
        const compared = A()
        const comparand = B()
        expect(compared.gt(comparand)).toBeTruthy()
      })

      test(`N.gte(N) : A >= B`, () => {
        const compared = A()
        const comparand = B()
        expect(compared.gte(comparand)).toBeTruthy()
      })
    })

    describe('Falsy', () => {

      test(`N.eq(N)  ! A == C`, () => {
        const compared = A()
        const comparand = C()
        expect(compared.eq(comparand)).toBeFalsy()
      })

      test(`N.lt(N)  ! A < B`, () => {
        const compared = A()
        const comparand = B()
        expect(compared.lt(comparand)).toBeFalsy()
      })

      test(`N.lte(N) ! A <= B`, () => {
        const compared = A()
        const comparand = B()
        expect(compared.lte(comparand)).toBeFalsy()
      })

      test(`N.gt(N)  ! A > C`, () => {
        const compared = A()
        const comparand = C()
        expect(compared.gt(comparand)).toBeFalsy()
      })

      test(`N.gte(N) ! A >= C`, () => {
        const compared = A()
        const comparand = C()
        expect(compared.gte(comparand)).toBeFalsy()
      })

    })

  })

})
