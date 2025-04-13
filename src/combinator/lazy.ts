import { Arbitrary, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'

/**
 * Creates a generator that delays the evaluation of the provided function until the generator is sampled.
 * This is particularly useful for defining recursive generators or generators that depend on expensive computations.
 * @param func A function that returns the value to be generated.
 * @returns A Generator that produces the value returned by `func` upon generation.
 */
export function lazy<T>(func: () => T): Generator<T> {
    return new Arbitrary<T>(() => new Shrinkable(func()))
}
