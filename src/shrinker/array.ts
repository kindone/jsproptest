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

export function shrinkBulkRecursive<T>(
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


export function shrinkArrayLength<T>(shrinkableElems:Shrinkable<T>[], minSize: number):Shrinkable<Shrinkable<T>[]> {
    const size = shrinkableElems.length
    const rangeShrinkable = binarySearchShrinkable(size - minSize).map(s => s + minSize)
    return rangeShrinkable.map(newSize => {
        if (newSize === 0) return []
        else return shrinkableElems.slice(0, newSize)
    })
}

export function shrinkableArray<T>(shrinkableElems: Array<Shrinkable<T>>, minSize: number, shrinkElementWise = true): Shrinkable<Array<T>> {
    let shrinkableElemsShr = shrinkArrayLength(shrinkableElems, minSize)
    // further shrink element-wise
    if(shrinkElementWise)
        shrinkableElemsShr = shrinkableElemsShr.andThen(parent => shrinkBulkRecursive(parent, 0, 0))
    return shrinkableElemsShr.map(theArr => theArr.map(shr => shr.value))
}
