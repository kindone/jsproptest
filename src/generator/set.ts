import { ArbiContainer, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'
import { shrinkableSet } from '../shrinker/set'

const DEFAULT_MIN_SIZE = 0
const DEFAULT_MAX_SIZE = 20

/**
 * Configuration for {@link SetGen}.
 *
 * @example
 * ```ts
 * Gen.set({ elemGen: Gen.asciiString(1, 3), maxSize: 5 })
 * ```
 */
export interface SetGenConfig<T> {
    /** Generator for the elements to be included in the set. Required. */
    elemGen: Generator<T>
    /** Minimum number of elements. Default: 0. */
    minSize?: number
    /** Maximum number of elements. Default: 20. */
    maxSize?: number
}

/**
 * Creates a Generator for producing Set<T> instances.
 * Supports both a positional form and a config-object form.
 *
 * @example
 * ```ts
 * // positional (existing)
 * Gen.set(Gen.asciiString(1, 3), 0, 5)
 * // config object — all size fields optional
 * Gen.set({ elemGen: Gen.asciiString(1, 3), maxSize: 5 })
 * ```
 */
export function SetGen<T>(config: SetGenConfig<T>): Generator<Set<T>>
export function SetGen<T>(elemGen: Generator<T>, minSize: number, maxSize: number): Generator<Set<T>>
export function SetGen<T>(
    first: SetGenConfig<T> | Generator<T>,
    minSize?: number,
    maxSize?: number
): Generator<Set<T>> {
    const isPosForm = minSize !== undefined
    const resolvedElemGen = isPosForm ? (first as Generator<T>) : (first as SetGenConfig<T>).elemGen
    const resolvedMinSize = isPosForm ? minSize! : ((first as SetGenConfig<T>).minSize ?? DEFAULT_MIN_SIZE)
    const resolvedMaxSize = isPosForm ? maxSize! : ((first as SetGenConfig<T>).maxSize ?? DEFAULT_MAX_SIZE)

    return new ArbiContainer<Set<T>>(
        rand => {
            // Determine the target size for the set randomly within the specified range.
            const size = rand.interval(resolvedMinSize, resolvedMaxSize)
            const array: Array<Shrinkable<T>> = []
            const valueSet: Set<T> = new Set([])
            // Keep generating elements until the set reaches the target size.
            // Ensures uniqueness by checking if the value already exists in valueSet.
            while (array.length < size) {
                const shr = resolvedElemGen.generate(rand)
                if (!valueSet.has(shr.value)) {
                    array.push(shr)
                    valueSet.add(shr.value)
                }
            }
            // Create a shrinkable set from the generated unique elements.
            return shrinkableSet(array, resolvedMinSize)
        },
        resolvedMinSize,
        resolvedMaxSize
    )
}
