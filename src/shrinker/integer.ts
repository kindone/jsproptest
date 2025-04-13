import { Random } from '../Random'
import { Stream } from '../Stream'
import { Shrinkable } from '../Shrinkable'

// Generates a stream of shrink candidates for a positive integer range using binary search.
// It repeatedly splits the range [min, max) in half, shrinking towards min.
function genpos(min: number, max: number): Stream<Shrinkable<number>> {
    // Calculate the midpoint, ensuring it rounds towards min correctly, even for odd ranges.
    const mid = Math.floor(min / 2) + Math.floor(max / 2) + (min % 2 !== 0 && max % 2 !== 0 ? 1 : 0)
    if (min + 1 >= max) return Stream.empty() // Base case: No more shrinking possible.
    else if (min + 2 >= max) return Stream.one(new Shrinkable<number>(mid)) // Base case: Only the midpoint is left.
    // Recursively generate shrinks: prioritize the midpoint, then the lower half, then the upper half.
    else return Stream.one(new Shrinkable<number>(mid).with(() => genpos(min, mid))).concat(genpos(mid, max))
}

// Generates a stream of shrink candidates for a negative integer range using binary search.
// It repeatedly splits the range (min, max] in half, shrinking towards max.
function genneg(min: number, max: number): Stream<Shrinkable<number>> {
    // Calculate the midpoint, ensuring it rounds towards max correctly, even for odd ranges.
    const mid = Math.floor(min / 2) + Math.floor(max / 2) + (min % 2 !== 0 && max % 2 !== 0 ? -1 : 0)
    if (min + 1 >= max) return Stream.empty() // Base case: No more shrinking possible.
    else if (min + 2 >= max) return Stream.one(new Shrinkable<number>(mid)) // Base case: Only the midpoint is left.
    // Recursively generate shrinks: prioritize the midpoint, then the lower half (closer to max), then the upper half.
    // Note: genpos is used for the lower half because it shrinks towards the lower bound (which is closer to 0).
    else return Stream.one(new Shrinkable<number>(mid).with(() => genpos(min, mid))).concat(genpos(mid, max))
}

/**
 * Creates a Shrinkable<number> that shrinks towards 0 using a binary search approach.
 *
 * @param value The initial integer value.
 * @returns A Shrinkable number that shrinks towards 0.
 */
export function binarySearchShrinkable(value: number): Shrinkable<number> {
    return new Shrinkable<number>(value).with(() => {
        if (value === 0) return Stream.empty() // 0 cannot shrink further.
        // For positive numbers, shrink towards 0: prioritize 0, then use genpos for the range (0, value).
        else if (value > 0) return Stream.one(new Shrinkable<number>(0)).concat(genpos(0, value))
        // For negative numbers, shrink towards 0: prioritize 0, then use genneg for the range (value, 0).
        else return Stream.one(new Shrinkable<number>(0)).concat(genneg(value, 0))
    })
}

/**
 * Generates a Shrinkable integer within the specified range [min, max].
 * The generated value shrinks towards the minimum bound if min >= 0,
 * towards the maximum bound if max <= 0, or towards 0 otherwise.
 *
 * @param random The random number generator.
 * @param min The minimum inclusive bound.
 * @param max The maximum inclusive bound.
 * @returns A Shrinkable integer within the specified range.
 * @throws {Error} If the generated value is outside the [min, max] range (should not happen with correct random.intInterval).
 */
export function generateInteger(random: Random, min: number, max: number): Shrinkable<number> {
    const value = random.intInterval(min, max)
    // Basic range check for safety, though random.intInterval should guarantee this.
    if (value < min || max < value) throw new Error('invalid range')

    // If the range is entirely non-negative, shrink towards min.
    if (min >= 0) return binarySearchShrinkable(value - min).map(n => n + min)
    // If the range is entirely non-positive, shrink towards max.
    else if (max <= 0) return binarySearchShrinkable(value - max).map(n => n + max)
    // If the range crosses zero, shrink towards 0.
    else return binarySearchShrinkable(value)
}

// TODO: shrinkIntegral
