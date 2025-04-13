import { expect } from '@jest/globals'
import { Random } from '../src/Random'
import { generateInteger } from '../src/shrinker/integer'
import { exhaustive } from './testutil'
import { Shrinkable } from '../src/Shrinkable'

describe('primitive', () => {
    it('generateInteger generates unique values within range and shrinks stay within range (100 runs)', () => {
        const min = -8
        const max = -4
        const numRuns = 100

        for (let i = 0; i < numRuns; i++) {
            const rand = new Random(`seed-${i}`)
            const shrinkable = generateInteger(rand, min, max)

            // Check initial value
            expect(shrinkable.value).toBeGreaterThanOrEqual(min)
            expect(shrinkable.value).toBeLessThanOrEqual(max)

            // Keep track of seen values for this run
            const seenValues = new Set<number>()

            // Define assertion function for exhaustive traversal
            const assertInRangeAndUnique = (shr: Shrinkable<number>) => {
                // Check for uniqueness
                expect(seenValues.has(shr.value)).toBe(false)
                seenValues.add(shr.value)

                // Check range
                expect(shr.value).toBeGreaterThanOrEqual(min)
                expect(shr.value).toBeLessThanOrEqual(max)
            }

            // Traverse shrinks and assert
            exhaustive(shrinkable, 0, assertInRangeAndUnique)
        }
    })
})
