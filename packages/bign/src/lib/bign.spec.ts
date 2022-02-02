import N, { jestMatchers, Rounder } from './bign'

expect.extend(jestMatchers)

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
      const result = new N(A())
      expect(result).N_toExactlyMatch(control)
      expect(result !== control).toBeTruthy()
    })

    test(`new N({ isPrecise: true })`, () => {
      const n = new N(123456789000000000n, 2, 10, { isPrecise: true })

      const result = n.toString()
      const expected = '12345678.90'

      expect(result).toEqual(expected)
    })

    test(`N.clone()`, () => {
      const result = A().clone()
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
      const expected = 100n * 10n ** BigInt(a.precision)

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

    /* 2 : TOWARD_ZERO */

    describe('N.ROUNDING.TOWARD_ZERO', () => {

      beforeAll(() => {
        N.ROUNDING_MODE = N.ROUNDING.TOWARD_ZERO
      })

      test(`N.valueOf() :  5 rounds down`, () => {
        const n = new N('1234.5')

        const result = n.valueOf()
        const expected = 1234n

        expect(result.toString()).toBe(expected.toString())
      })

      test(`N.valueOf() :  4 rounds down`, () => {
        const n = new N('123.4')

        const result = n.valueOf()
        const expected = 123n

        expect(result.toString()).toBe(expected.toString())
      })

      test(`N.valueOf() : -4 rounds up`, () => {
        const n = new N('-123.4')

        const result = n.valueOf()
        const expected = -123n

        expect(result.toString()).toBe(expected.toString())
      })

      test(`N.valueOf() : -5 rounds up`, () => {
        const n = new N('-1234.5')

        const result = n.valueOf()
        const expected = -1234n

        expect(result.toString()).toBe(expected.toString())
      })

      test(`rounding is symmetric : - new N(n) == new N(-n)`, () => {
        const m = new N('1234.5')
        const n = new N('-1234.5')

        const mr = (-m.valueOf()).toString()
        const nr = n.valueOf().toString()
        const expected = '-1234'

        expect(mr).toBe(expected)
        expect(mr).toBe(nr)
      })

    })

    /* 7 : HALF_AWAY_FROM_ZERO */

    describe('N.ROUNDING.HALF_AWAY_FROM_ZERO', () => {

      beforeAll(() => {
        N.ROUNDING_MODE = N.ROUNDING.HALF_AWAY_FROM_ZERO
      })

      test(`N.valueOf() :  5 rounds up`, () => {
        const n = new N('1234.5')

        const result = n.valueOf()
        const expected = 1235n

        expect(result.toString()).toBe(expected.toString())
      })

      test(`N.valueOf() :  4 rounds down`, () => {
        const n = new N('123.4')

        const result = n.valueOf()
        const expected = 123n

        expect(result.toString()).toBe(expected.toString())
      })

      test(`N.valueOf() : -4 rounds up`, () => {
        const n = new N('-123.4')

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

      test(`rounding is symmetric : - new N(n) == new N(-n)`, () => {
        const m = new N('1234.5')
        const n = new N('-1234.5')

        const mr = (-m.valueOf()).toString()
        const nr = n.valueOf().toString()
        const expected = '-1235'

        expect(mr).toBe(expected)
        expect(mr).toBe(nr)
      })

    })

    /* 10 : CUSTOM */

    describe('N.ROUNDING.CUSTOM', () => {

      const mockedRoundingFunction: Rounder = jest.fn(() => 0n)

      beforeAll(() => {
        N.ROUNDING_MODE = N.ROUNDING.CUSTOM
        N.ROUNDING_CUSTOM_FUNCTION = mockedRoundingFunction
      })

      test(`is called`, () => {
        const n = new N('1234.5')

        const result = n.valueOf().toString()
        const expected = 1234n.toString()

        expect(result).toBe(expected)
        expect(mockedRoundingFunction).toHaveBeenCalled()
      })

    })

  })

  /* Arithmetics */

  describe('Arithmetics', () => {

    test(`N.plus(N)  : A+B=C`, () => {
      const expected = Number(C())

      const a = A()
      const b = B()
      const result = Number(a.plus(b))

      expect(result).toBe(expected)
    })

    test(`N.minus(N) : C-B=A`, () => {
      const expected = Number(A())

      const a = C()
      const b = B()
      const result = Number(a.minus(b))

      expect(result).toBe(expected)
    })

    test(`N.mul(N)   : D×E=A`, () => {
      const expected = Number(A())

      const a = D()
      const b = E()
      const result = Number(a.mul(b))

      expect(result).toBe(expected)
    })

    test(`N.div(N)   : A÷E=D`, () => {
      const expected = Number(D())

      const a = A()
      const b = E()
      const result = Number(a.div(b))

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
