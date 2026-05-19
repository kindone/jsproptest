import { Shrinkable } from '../Shrinkable'
import { shrinkableArray } from './array'

/**
 * Creates a shrinkable for `Set<T>` instances.
 * The shrinking process is based on shrinking the underlying array representation of the set.
 * It ensures that the size of the set does not shrink below the specified minimum size.
 *
 * @param array - An array of `Shrinkable<T>` elements that will form the initial set.
 * @param minSize - The minimum number of elements the shrunk set must contain.
 * @returns A `Shrinkable` instance for the `Set<T>`.
 */
export function shrinkableSet<T>(array: Array<Shrinkable<T>>, minSize: number): Shrinkable<Set<T>> {
    // elementWise is intentionally disabled: shrinking an element's value could produce a value
    // that already exists in the set, collapsing the set size below minSize and violating the
    // uniqueness invariant. Membership shrinking (element removal) is safe and sufficient.
    const shrinkableArr = shrinkableArray(array, minSize, true, false)
    return shrinkableArr.map(theArr => new Set(theArr))
}
