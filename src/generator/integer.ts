import { Arbitrary, Generator } from '../Generator'
import { Random } from '../Random'
import { generateInteger } from '../shrinker/integer'

/**
 * Generates integers within the specified inclusive range [min, max].
 *
 * @param min The minimum value of the range (inclusive). Defaults to `Number.MIN_SAFE_INTEGER`.
 * @param max The maximum value of the range (inclusive). Defaults to `Number.MAX_SAFE_INTEGER`.
 * @returns A generator for integers within the specified range.
 * @throws If min is greater than max.
 */
export function interval(min: number = Number.MIN_SAFE_INTEGER, max: number = Number.MAX_SAFE_INTEGER): Generator<number> {
    if (min > max) throw new Error(`invalid range: min (${min}) > max (${max})`)
    return new Arbitrary((random: Random) => {
        return generateInteger(random, min, max)
    })
}

/**
 * Generates integers within the specified range [fromInclusive, toExclusive).
 *
 * @param fromInclusive The minimum value of the range (inclusive).
 * @param toExclusive The maximum value of the range (exclusive).
 * @returns A generator for integers within the specified range.
 * @throws If fromInclusive is greater than or equal to toExclusive.
 */
export function inRange(fromInclusive: number, toExclusive: number): Generator<number> {
    if (fromInclusive >= toExclusive) throw new Error(`invalid range: from (${fromInclusive}) >= to (${toExclusive})`)
    return interval(fromInclusive, toExclusive - 1)
}

/**
 * Generates a sequence of `count` integers starting from `start`.
 * Equivalent to `inRange(start, start + count)`.
 * @deprecated Use `Gen.interval` or `Gen.inRange` instead.
 * @param start The starting integer (inclusive).
 * @param count The number of integers to generate.
 * @returns A generator for the sequence of integers.
 */
export function integers(start: number, count: number): Generator<number> {
    return inRange(start, start + count)
}

/**
 * Generates a random integer.
 * @returns A generator for a random integer.
 */
export function integer(): Generator<number> {
    return interval()
}