import { Shrinkable } from '../Shrinkable'
import { shrinkableArray } from './array'
import { shrinkableTuple } from './tuple'

export interface Dictionary<T> {
    [Key: string]: T
}

/**
 * Creates a `Shrinkable<Dictionary<T>>` from an array of `[key, value]` Shrinkable pairs.
 *
 * Shrinks across three dimensions — matching `cppproptest`'s `shrinkMap` behaviour:
 *
 *  1. **Membership-wise** — removes key-value pairs using `shrinkFrontAndThenMid`
 *     (full 2^N subset exploration, not just rear-truncation).
 *  2. **Key shrinking** — each key is shrunk through its key generator's shrink tree
 *     (e.g. shorter strings, smaller integer keys).
 *  3. **Value shrinking** — each value is shrunk through its value generator's shrink tree.
 *
 * Key + value shrinking are combined via `shrinkableTuple(keyShr, valShr)` which
 * uses `concat` so both axes are accessible at every node of the membership tree.
 * Element-wise shrinking is wired with `concat` (not `andThen`) in `shrinkableArray`,
 * so pair shrinks fire at every membership node, not only at leaves.
 *
 * @param pairs   - Array of `[Shrinkable<string>, Shrinkable<T>]` entries.
 * @param minSize - Minimum number of key-value pairs after shrinking.
 */
export function shrinkableDictionary<T>(
    pairs: Array<[Shrinkable<string>, Shrinkable<T>]>,
    minSize: number
): Shrinkable<Dictionary<T>> {
    // Wrap each (keyShr, valShr) pair into a Shrinkable<[string, T]> using
    // shrinkableTuple.  The resulting Shrinkable carries key shrinks (position 0,
    // via the map chain from keyShr) and value shrinks (position 1, via concat)
    // at every node.
    const pairShrinkables = pairs.map(
        ([keyShr, valShr]) => shrinkableTuple(keyShr, valShr) as unknown as Shrinkable<[string, T]>
    )

    // Apply membership-wise + element-wise shrinking.
    // membershipWise = true  → shrinkFrontAndThenMid
    // elementWise    = true  → shrink key+value at every membership node (via concat)
    const shrinkableArr = shrinkableArray(pairShrinkables, minSize, true, true)

    // Convert Array<[string, T]> → Dictionary<T>.
    // If key shrinking produces a duplicate key, the later pair's value wins;
    // the dict will have fewer entries than before, but the property still
    // fails / holds correctly (a smaller dict is always a valid shrink candidate).
    return shrinkableArr.map(arr => {
        const dict: Dictionary<T> = {}
        for (const [key, value] of arr) {
            dict[key] = value
        }
        return dict
    })
}
