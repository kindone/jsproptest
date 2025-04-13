import { Arbitrary, Generator } from '../Generator'
import { Random } from '../Random'
import { shrinkableBoolean } from '../shrinker/boolean'

/**
 * Creates a generator for boolean values.
 *
 * @param trueProb The probability of generating `true`. Must be between 0 and 1. Defaults to 0.5.
 * @returns A generator that produces shrinkable boolean values.
 */
export function BooleanGen(trueProb = 0.5): Generator<boolean> {
    return new Arbitrary((random: Random) => {
        const value = random.nextBoolean(trueProb)
        return shrinkableBoolean(value)
    })
}
