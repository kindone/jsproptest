import { Shrinkable } from '../Shrinkable'
import { shrinkElementWise } from './array'
import { binarySearchShrinkable } from './integer'

/**
 * Creates a Shrinkable for strings based on an array of shrinkable UTF-16 codepoints.
 * This shrinker first attempts to reduce the length of the string (in bytes),
 * then shrinks the individual codepoints themselves.
 *
 * @param codepoints An array of Shrinkable numbers representing the UTF-16 codepoints.
 * @param minSize The minimum allowed size of the string in bytes.
 * @returns A Shrinkable string.
 */
export function shrinkableString(codepoints: Array<Shrinkable<number>>, minSize: number): Shrinkable<string> {
    const size = codepoints.length
    const rangeShrinkable = binarySearchShrinkable(size - minSize).map(s => s + minSize)

    // Shrink the size (in bytes) of the string first
    let shrinkableArr = rangeShrinkable.map(newSize => {
        if (newSize === 0) return []
        else {
            let curSize = 0
            let i = 0
            // Calculate the number of codepoints needed to reach `newSize` bytes.
            // Codepoints >= 0x10000 (surrogate pairs) count as 2 bytes.
            for (; i < codepoints.length && curSize < newSize; i++) {
                if (codepoints[i].value >= 0x10000) {
                    curSize += 2
                } else {
                    curSize += 1
                }
            }
            // Slice the array, adjusting index if the last codepoint pushed us over the size limit.
            return codepoints.slice(0, curSize <= newSize ? i : i - 1)
        }
    })

    // TODO: shrink elementwise
    // Then, shrink the individual codepoints within the array
    shrinkableArr = shrinkableArr.andThen(parent => shrinkElementWise(parent, 0, 0))
    return shrinkableArr.map(theArr => String.fromCodePoint(...theArr.map(shr => shr.value)))
}
