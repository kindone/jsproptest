import { ArbiContainer, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'
import { shrinkableArray } from '../shrinker/array'
import { SetGen, SetGenConfig } from './set'

const DEFAULT_MIN_SIZE = 0
const DEFAULT_MAX_SIZE = 20

/**
 * Configuration for {@link ArrayGen}.
 *
 * @example
 * ```ts
 * Gen.array({ elemGen: Gen.interval(0, 9), minSize: 1 })
 * Gen.array({ elemGen: Gen.boolean(), minSize: 0, maxSize: 5 })
 * ```
 */
export interface ArrayGenConfig<T> {
    /** Generator for individual elements. Required. */
    elemGen: Generator<T>
    /** Minimum number of elements. Default: 0. */
    minSize?: number
    /** Maximum number of elements. Default: 20. */
    maxSize?: number
}

/**
 * Generates an array of elements using the provided element generator.
 * Supports both a positional form and a config-object form.
 *
 * @example
 * ```ts
 * // positional (existing)
 * Gen.array(Gen.interval(-5, 5), 0, 10)
 * // config object — all size fields optional
 * Gen.array({ elemGen: Gen.interval(-5, 5), minSize: 0, maxSize: 10 })
 * Gen.array({ elemGen: Gen.interval(-5, 5), maxSize: 5 })
 * ```
 */
export function ArrayGen<T>(config: ArrayGenConfig<T>): Generator<Array<T>>
export function ArrayGen<T>(elemGen: Generator<T>, minSize: number, maxSize: number): Generator<Array<T>>
export function ArrayGen<T>(
    first: ArrayGenConfig<T> | Generator<T>,
    minSize?: number,
    maxSize?: number
): Generator<Array<T>> {
    const isPosForm = minSize !== undefined
    const resolvedElemGen = isPosForm ? (first as Generator<T>) : (first as ArrayGenConfig<T>).elemGen
    const resolvedMinSize = isPosForm ? minSize! : ((first as ArrayGenConfig<T>).minSize ?? DEFAULT_MIN_SIZE)
    const resolvedMaxSize = isPosForm ? maxSize! : ((first as ArrayGenConfig<T>).maxSize ?? DEFAULT_MAX_SIZE)

    return new ArbiContainer<Array<T>>(
        rand => {
            const size = rand.interval(resolvedMinSize, resolvedMaxSize)
            const array: Array<Shrinkable<T>> = []
            for (let i = 0; i < size; i++) array.push(resolvedElemGen.generate(rand))

            return shrinkableArray(array, resolvedMinSize, true, true)
        },
        resolvedMinSize,
        resolvedMaxSize
    )
}

/**
 * Generates an array containing unique elements, sorted in ascending order.
 * Supports both a positional form and a config-object form.
 *
 * @example
 * ```ts
 * // positional (existing)
 * Gen.uniqueArray(Gen.interval(0, 100), 1, 8)
 * // config object
 * Gen.uniqueArray({ elemGen: Gen.interval(0, 100), minSize: 1, maxSize: 8 })
 * ```
 */
export function UniqueArrayGen<T>(config: SetGenConfig<T>): Generator<Array<T>>
export function UniqueArrayGen<T>(elemGen: Generator<T>, minSize: number, maxSize: number): Generator<Array<T>>
export function UniqueArrayGen<T>(
    first: SetGenConfig<T> | Generator<T>,
    minSize?: number,
    maxSize?: number
): Generator<Array<T>> {
    const setGen = minSize !== undefined
        ? SetGen(first as Generator<T>, minSize, maxSize!)
        : SetGen(first as SetGenConfig<T>)
    return setGen.map(set => {
        const arr = new Array<T>()
        set.forEach(function(item) {
            arr.push(item)
        })
        return arr.sort((a, b) => (a > b ? 1 : a === b ? 0 : -1))
    })
}
