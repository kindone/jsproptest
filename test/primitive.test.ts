import { Random } from '../src/Random'
import { generateInteger } from '../src/shrinker/integer'
import { exhaustive } from './testutil'

describe('primitive', () => {
    it('generateInteger', () => {
        const rand = new Random('0')
        exhaustive(generateInteger(rand, -8, -4))
        exhaustive(generateInteger(rand, -8, -4))
        exhaustive(generateInteger(rand, -8, -4))
        exhaustive(generateInteger(rand, -8, -4))
    })
})
