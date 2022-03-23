import { colors } from './colors'

describe('colors', () => {
  it('uncolorize should revert colored text', () => {
    const colored = colors.fg.red + 'red' + colors.reset
    expect(colors.uncolorize(colored)).toEqual('red')
  })
})
