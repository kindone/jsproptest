import { Arbitrary, Generator } from '../Generator'
import { Random } from '../Random'
import { shrinkableFloat } from '../shrinker/floating'

/**
 * Generates arbitrary floating-point numbers between 0 (inclusive) and 1 (exclusive).
 * The generated values are shrinkable towards 0.
 *
 * @returns A Generator for floating-point numbers.
 */
export function FloatingGen(): Generator<number> {
    return new Arbitrary<number>((random: Random) => {
        // Uses the PRNG's default method to get a number in [0, 1).
        const value = random.nextNumber()
        // Creates a Shrinkable representation of the float, enabling shrinking towards 0.
        return shrinkableFloat(value)
    })
}
