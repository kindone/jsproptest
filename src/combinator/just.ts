import { Arbitrary, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'

/**
 * Creates a generator that always produces the same given value.
 *
 * @param value The constant value to be generated.
 * @returns A generator that yields the provided value.
 *
 * @example
 * ```ts
 * Gen.just({ k: 1 })
 * ```
 */
export function just<T>(value: T): Generator<T> {
    return new Arbitrary<T>(() => new Shrinkable(value))
}
