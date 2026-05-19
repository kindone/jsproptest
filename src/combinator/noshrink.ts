import { Generator } from '../Generator'

/**
 * Wraps a generator to produce the same values but with an empty shrink stream.
 * Use when shrinking is meaningless or undesirable — e.g. seeds, UUIDs, timestamps,
 * or when you want to suppress context shrinking in a `flatMap` chain.
 *
 * @template T The type produced by the base generator.
 * @param gen The base generator.
 * @returns A Generator<T> that produces the same distribution of values but no shrink candidates.
 *
 * @example
 * ```ts
 * // Seed value that should not be shrunk
 * const seedGen = Gen.noShrink(Gen.interval(0, 1000))
 *
 * // Suppress context (T) shrinking in a flatMap:
 * // Only the inner value (U) will shrink — T is locked to the generated value.
 * const gen = Gen.noShrink(Gen.interval(0, 10)).flatMap(n => Gen.array(Gen.interval(0, n), 1, 5))
 * ```
 */
export function noShrink<T>(gen: Generator<T>): Generator<T> {
    return gen.noShrink()
}
