import { ArbiContainer, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'
import { shrinkableSet } from '../shrinker/set'

/**
 * Creates a Generator for producing Set<T> instances.
 *
 * @param elemGen - The generator for the elements to be included in the set.
 * @param minSize - The minimum number of elements the generated set should contain.
 * @param maxSize - The maximum number of elements the generated set should contain.
 * @returns A Generator that produces Set<T> instances with sizes between minSize and maxSize (inclusive).
 */
export function SetGen<T>(elemGen: Generator<T>, minSize: number, maxSize: number): Generator<Set<T>> {
    return new ArbiContainer<Set<T>>(
        rand => {
            // Determine the target size for the set randomly within the specified range.
            const size = rand.interval(minSize, maxSize)
            const array: Array<Shrinkable<T>> = []
            const valueSet: Set<T> = new Set([])
            // Keep generating elements until the set reaches the target size.
            // Ensures uniqueness by checking if the value already exists in valueSet.
            while (array.length < size) {
                const shr = elemGen.generate(rand)
                if (!valueSet.has(shr.value)) {
                    array.push(shr)
                    valueSet.add(shr.value)
                }
            }
            // Create a shrinkable set from the generated unique elements.
            return shrinkableSet(array, minSize)
        },
        minSize,
        maxSize
    )
}
