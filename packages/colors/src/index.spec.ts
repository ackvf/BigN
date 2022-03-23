import { colors } from './lib/colors'
import { red } from './index'

describe('colors helpers', () => {
  const expected = colors.fg.red + 'red' + colors.reset

  it('called as function', () => {
    expect(red('red')).toEqual(expected)
  })

  it('called as tagged template', () => {
    expect(red`red`).toEqual(expected)
  })
})
