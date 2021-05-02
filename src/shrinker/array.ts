import { Shrinkable } from '../Shrinkable'
import { Stream } from '../Stream'
import { binarySearchShrinkable } from './integer'

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

        if (elemStreams.length != size) throw new Error(`element streams size error ${elemStreams.length} != ${size}`)

        const newElemStreams: Array<Stream<Shrinkable<T>>> = []
        const newArray = parent.value.concat()
        const ancestorArray = ancestor.value

        if (newArray.length != ancestorArray.length)
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

export function shrinkElementwise<T>(
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

// shrink array by removing elements at rear
export function shrinkArrayLength<T>(shrinkableElems:Shrinkable<T>[], minSize: number):Shrinkable<Shrinkable<T>[]> {
    const size = shrinkableElems.length
    const rangeShrinkable = binarySearchShrinkable(size - minSize).map(s => s + minSize)
    return rangeShrinkable.map(newSize => {
        if (newSize === 0) return []
        else return shrinkableElems.slice(0, newSize)
    })
}


function shrinkFront<T>(shrinkableElems:Shrinkable<T>[], minSize:number, rearSize:number):Shrinkable<Shrinkable<T>[]> {
    // remove front, fixing rear
    const minFrontSize = Math.max(minSize - rearSize, 0) // rear size already occupies some elements
    const maxFrontSize = shrinkableElems.length - rearSize
    // front size within [min,max]
    const rangeShrinkable = binarySearchShrinkable(maxFrontSize - minFrontSize).map(s => s + minFrontSize)
    return rangeShrinkable.map(frontSize => {
        // concat front and rear
        return shrinkableElems.slice(0, frontSize).concat(shrinkableElems.slice(maxFrontSize, shrinkableElems.length))
    }).concat(parent => {
        // increase rear size
        const parentSize = parent.value.length

        // no further shrinking possible
        if(parentSize <= minSize || parentSize <= rearSize) {
            // const diminished = shrinkableElems.length - parentSize
            // const newFrontSize = maxFrontSize - diminished
            if(minSize < parentSize && rearSize+1 < parentSize)
                return shrinkMid(parent.value, minSize, 1, rearSize + 1).shrinks()
            else
                return Stream.empty()
        }
        // shrink front further by fixing last element in front to rear
        // [[1,2,3,4]]
        // [[1,2,3],[4]] → [[]|[1]|[1,2]|, [4]]
        return shrinkFront(parent.value, minSize, rearSize + 1).shrinks()
    })/*.andThen(parent => {
        const parentSize = parent.value.length
        if(parentSize <= minFrontSize+1 || minFrontSize+1 >= maxFrontSize)
            return Stream.empty()
        return shrinkMid2(parent.value, minFrontSize, maxFrontSize).shrinks()
    })*/
}

function shrinkMid<T>(shrinkableElems:Shrinkable<T>[], minSize:number, frontSize:number, rearSize:number):Shrinkable<Shrinkable<T>[]> {
    // remove rear, fixing front
    const minRearSize = Math.max(minSize - frontSize, 0)
    const maxRearSize = shrinkableElems.length - frontSize
    // rear size within [min,max]
    const rangeShrinkable = binarySearchShrinkable(maxRearSize - minRearSize).map(s => s + minRearSize)
    return rangeShrinkable.map(rearSize => {
        // concat front and rear
        return shrinkableElems.slice(0, frontSize).concat(shrinkableElems.slice(shrinkableElems.length-rearSize, shrinkableElems.length))
    }).concat(parent => {
        const parentSize = parent.value.length
        // no further shrinking possible
        if(parentSize <= minSize || parentSize <= frontSize)
            return Stream.empty()
        // shrink rear further by fixing last element in rear to front
        // [[1,2,3,4]]
        // [[1],[2,3,4]] → [1,[]|[2]|[2,3]]
        return shrinkMid(parent.value, minSize, frontSize + 1, rearSize).shrinks()
    })
}

function shrinkMembershipwise<T>(shrinkableElems:Shrinkable<T>[], minSize:number):Shrinkable<Shrinkable<T>[]> {
    // return shrinkMid(shrinkableElems, minSize, maxSize).andThen(parent => {
    //     const originalSize = shrinkableElems.length
    //     const parentSize = parent.value.length
    //     if(parentSize <= minSize)
    //         return Stream.empty()
    //     return shrinkMid2(parent.value, minSize, maxSize).shrinks()
    // })
    // return shrinkMid2(shrinkableElems, minSize, maxSize)
    return shrinkFront(shrinkableElems, minSize, 0)
}

export function shrinkableArray<T>(shrinkableElems: Array<Shrinkable<T>>, minSize: number, shrinkElementWise = false): Shrinkable<Array<T>> {
    let shrinkableElemsShr = shrinkMembershipwise(shrinkableElems, minSize)
    // further shrink element-wise
    if(shrinkElementWise)
        shrinkableElemsShr = shrinkableElemsShr.andThen(parent => shrinkElementwise(parent, 0, 0))
    return shrinkableElemsShr.map(theArr => theArr.map(shr => shr.value))
}
