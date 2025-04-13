import { Shrinkable } from '../Shrinkable'
import { Stream } from '../Stream'
import { binarySearchShrinkable } from './integer'

/**
 * Helper function to shrink elements within a specific chunk of the array.
 * The array is conceptually divided into 2^power chunks, and this function
 * processes the chunk specified by the offset.
 *
 * @internal
 * @param ancestor - The original Shrinkable array structure.
 * @param power - Determines the number of chunks (2^power).
 * @param offset - Specifies which chunk to process (0 <= offset < 2^power).
 * @returns A Stream of shrunken arrays, focusing on the specified chunk.
 */
function shrinkBulk<T>(
    ancestor: Shrinkable<Array<Shrinkable<T>>>,
    power: number,
    offset: number
): Stream<Shrinkable<Array<Shrinkable<T>>>> {
    const genStream = (
        ancestor: Shrinkable<Array<Shrinkable<T>>>,
        power: number,
        offset: number,
        parent: Shrinkable<Array<Shrinkable<T>>>,
        fromPos: number,
        toPos: number,
        elemStreams: Array<Stream<Shrinkable<T>>>
    ): Stream<Shrinkable<Array<Shrinkable<T>>>> => {
        const size = toPos - fromPos
        if (size === 0) return Stream.empty()

        if (elemStreams.length !== size) throw new Error(`element streams size error ${elemStreams.length} != ${size}`)

        const newElemStreams: Array<Stream<Shrinkable<T>>> = []
        const newArray = parent.value.concat()
        const ancestorArray = ancestor.value

        if (newArray.length !== ancestorArray.length)
            throw new Error(`list size error: ${newArray.length} != ${ancestorArray.length}`)

        let nothingToDo = true

        for (let i = 0; i < elemStreams.length; i++) {
            if (elemStreams[i].isEmpty()) {
                newArray[i + fromPos] = new Shrinkable(ancestorArray[i + fromPos].value)
                newElemStreams.push(Stream.empty())
            } else {
                newArray[i + fromPos] = elemStreams[i].getHead()
                newElemStreams.push(elemStreams[i].getTail())
                nothingToDo = false
            }
        }
        if (nothingToDo) return Stream.empty()

        let newShrinkable = new Shrinkable(newArray)
        newShrinkable = newShrinkable.with(() => shrinkBulk(newShrinkable, power, offset))
        return new Stream(newShrinkable, () =>
            genStream(ancestor, power, offset, newShrinkable, fromPos, toPos, newElemStreams)
        )
    }

    const parentSize = ancestor.value.length
    const numSplits = Math.pow(2, power)
    if (parentSize / numSplits < 1) return Stream.empty()

    if (offset >= numSplits) throw new Error('offset should not reach numSplits')

    const fromPos = (parentSize * offset) / numSplits
    const toPos = (parentSize * (offset + 1)) / numSplits

    if (toPos < parentSize) throw new Error(`topos error: ${toPos} != ${parentSize}`)

    const parentArr = ancestor.value
    const elemStreams: Array<Stream<Shrinkable<T>>> = []
    let nothingToDo = true
    for (let i = fromPos; i < toPos; i++) {
        const shrinks = parentArr[i].shrinks()
        elemStreams.push(shrinks)
        if (!shrinks.isEmpty()) nothingToDo = false
    }

    if (nothingToDo) return Stream.empty()

    return genStream(ancestor, power, offset, ancestor, fromPos, toPos, elemStreams)
}

/**
 * Shrinks an array by shrinking its individual elements.
 * This strategy divides the array into chunks (controlled by `power` and `offset`)
 * and shrinks elements within the targeted chunk. It's useful for applying
 * element-specific shrinking logic in a structured way.
 *
 * @param shrinkableElemsShr - The Shrinkable containing the array of Shrinkable elements.
 * @param power - Determines the number of chunks (2^power) the array is divided into for shrinking.
 * @param offset - Specifies which chunk (0 <= offset < 2^power) of elements to shrink in this step.
 * @returns A Stream of Shrinkable arrays, where elements in the specified chunk have been shrunk.
 */
export function shrinkElementWise<T>(
    shrinkableElemsShr: Shrinkable<Array<Shrinkable<T>>>,
    power: number,
    offset: number
): Stream<Shrinkable<Array<Shrinkable<T>>>> {
    if (shrinkableElemsShr.value.length === 0) return Stream.empty()

    const shrinkableElems = shrinkableElemsShr.value
    const length = shrinkableElems.length
    const numSplits = Math.pow(2, power)
    if (length / numSplits < 1 || offset >= numSplits) return Stream.empty()

    const newShrinkableElemsShr = shrinkableElemsShr.concat(parent => {
        const length = parent.value.length
        if (length / numSplits < 1 || offset >= numSplits) return Stream.empty()
        else return shrinkBulk<T>(parent, power, offset)
    })

    return newShrinkableElemsShr.shrinks()
}

/**
 * Shrinks an array by reducing its length from the rear.
 * It attempts to produce arrays with lengths ranging from the original size down to `minSize`.
 * Uses binary search internally for efficiency.
 *
 * @param shrinkableElems - The array of Shrinkable elements.
 * @param minSize - The minimum allowed size for the shrunken array.
 * @returns A Shrinkable representing arrays of potentially smaller lengths.
 */
// shrink array by removing elements at rear
export function shrinkArrayLength<T>(shrinkableElems: Shrinkable<T>[], minSize: number): Shrinkable<Shrinkable<T>[]> {
    const size = shrinkableElems.length
    const rangeShrinkable = binarySearchShrinkable(size - minSize).map(s => s + minSize)
    return rangeShrinkable.map(newSize => {
        if (newSize === 0) return []
        else return shrinkableElems.slice(0, newSize)
    })
}

/**
 * Implements a shrinking strategy prioritizing removal from the front, then recursively
 * shrinking the middle part by increasing the number of fixed elements at the rear.
 *
 * Strategy:
 * 1. Shrink by removing elements from the front (`slice(0, frontSize)`), keeping `rearSize` elements fixed at the end.
 * 2. Recursively:
 *    a. If further shrinking is possible, call `shrinkFrontAndThenMid` again with an increased `rearSize`.
 *       This fixes more elements at the rear and allows further shrinking of the front/middle.
 *    b. If front shrinking is exhausted but the array can still be shrunk towards `minSize`,
 *       delegate to `shrinkMid` to try removing elements from the middle/rear while keeping the front fixed.
 *
 * @internal
 */
function shrinkFrontAndThenMid<T>(
    shrinkableElems: Shrinkable<T>[],
    minSize: number,
    rearSize: number
): Shrinkable<Shrinkable<T>[]> {
    // remove front, fixing rear
    const minFrontSize = Math.max(minSize - rearSize, 0) // rear size already occupies some elements
    const maxFrontSize = shrinkableElems.length - rearSize
    // front size within [min,max]
    const rangeShrinkable = binarySearchShrinkable(maxFrontSize - minFrontSize).map(s => s + minFrontSize)
    return rangeShrinkable
        .map(frontSize => {
            // concat front and rear
            return shrinkableElems
                .slice(0, frontSize)
                .concat(shrinkableElems.slice(maxFrontSize, shrinkableElems.length))
        })
        .concat(parent => {
            // increase rear size
            const parentSize = parent.value.length
            // no further shrinking possible
            if (parentSize <= minSize || parentSize <= rearSize) {
                if (minSize < parentSize && rearSize + 1 < parentSize)
                    return shrinkMid(parent.value, minSize, 1, rearSize + 1).shrinks()
                else return Stream.empty()
            }
            // shrink front further by fixing last element in front to rear
            // [[1,2,3,4]]
            // [[1,2,3],[4]] → [[]|[1]|[1,2]|, [4]]
            return shrinkFrontAndThenMid(parent.value, minSize, rearSize + 1).shrinks()
        })
}

/**
 * Implements a shrinking strategy focusing on removing elements from the middle/rear,
 * keeping a fixed number of elements at the front.
 *
 * Strategy:
 * 1. Shrink by removing elements from the middle/rear (`slice(shrinkableElems.length - rearSize, ...)`),
 *    keeping `frontSize` elements fixed at the beginning.
 * 2. Recursively call `shrinkMid` with an increased `frontSize` to fix more elements
 *    at the front and allow further shrinking of the remaining middle/rear part.
 *
 * @internal
 */
function shrinkMid<T>(
    shrinkableElems: Shrinkable<T>[],
    minSize: number,
    frontSize: number,
    rearSize: number
): Shrinkable<Shrinkable<T>[]> {
    const minRearSize = Math.max(minSize - frontSize, 0)
    const maxRearSize = shrinkableElems.length - frontSize
    // rear size within [min,max]
    const rangeShrinkable = binarySearchShrinkable(maxRearSize - minRearSize).map(s => s + minRearSize)
    return rangeShrinkable
        .map(rearSize => {
            // concat front and rear
            return shrinkableElems
                .slice(0, frontSize)
                .concat(shrinkableElems.slice(shrinkableElems.length - rearSize, shrinkableElems.length))
        })
        .concat(parent => {
            const parentSize = parent.value.length
            // no further shrinking possible
            if (parentSize <= minSize || parentSize <= frontSize) return Stream.empty()
            // shrink rear further by fixing last element in rear to front
            // [[1,2,3,4]]
            // [[1],[2,3,4]] → [1,[]|[2]|[2,3]]
            return shrinkMid(parent.value, minSize, frontSize + 1, rearSize).shrinks()
        })
}

/**
 * Shrinks an array by removing elements (membership).
 * It primarily uses the `shrinkFrontAndThenMid` strategy, starting with
 * no fixed elements at the rear (`rearSize = 0`), effectively prioritizing
 * removal of elements from the front initially.
 *
 * @param shrinkableElems - The array of Shrinkable elements.
 * @param minSize - The minimum allowed size for the shrunken array.
 * @returns A Shrinkable representing arrays with potentially fewer elements.
 */
export function shrinkMembershipWise<T>(
    shrinkableElems: Shrinkable<T>[],
    minSize: number
): Shrinkable<Shrinkable<T>[]> {
    return shrinkFrontAndThenMid(shrinkableElems, minSize, 0)
}

/**
 * Creates a Shrinkable for an array, allowing shrinking by removing elements
 * and optionally by shrinking the elements themselves.
 *
 * @param shrinkableElems - The initial array of Shrinkable elements.
 * @param minSize - The minimum allowed length of the array after shrinking element membership.
 * @param membershipWise - If true, allows shrinking by removing elements (membership). Defaults to true.
 * @param elementWise - If true, applies element-wise shrinking *after* membership shrinking. Defaults to false.
 * @returns A Shrinkable<Array<T>> that represents the original array and its potential shrunken versions.
 */
export function shrinkableArray<T>(
    shrinkableElems: Array<Shrinkable<T>>,
    minSize: number,
    membershipWise = true,
    elementWise = false
): Shrinkable<Array<T>> {
    // Base Shrinkable containing the initial structure Shrinkable<T>[]
    let currentShrinkable: Shrinkable<Shrinkable<T>[]> = new Shrinkable(shrinkableElems);

    // Chain membership shrinking if enabled
    if (membershipWise) {
        currentShrinkable = currentShrinkable.andThen(parent => {
            return shrinkMembershipWise(parent.value, minSize).shrinks();
        });
    }

    // Chain element-wise shrinking if enabled
    if (elementWise) {
        currentShrinkable = currentShrinkable.andThen(parent => {
            return shrinkElementWise(parent, 0, 0);
        });
    }

    // Map the final Shrinkable<Shrinkable<T>[]> to Shrinkable<Array<T>> by extracting the values.
    return currentShrinkable.map(theArr => theArr.map(shr => shr.value))
}
