import { Shrinkable } from '../Shrinkable'
import { shrinkElementwise } from './array'
import { binarySearchShrinkable } from './integer'

export function shrinkableString(codepoints: Array<Shrinkable<number>>, minSize: number): Shrinkable<string> {
    const size = codepoints.length
    const rangeShrinkable = binarySearchShrinkable(size - minSize).map(s => s + minSize)
    let shrinkableArr = rangeShrinkable.map(newSize => {
        if (newSize === 0) return []
        else {
            let curSize = 0
            let i = 0
            // a codepoint can be maximum 2 bytes long
            for (; i < codepoints.length && curSize < newSize; i++) {
                if (codepoints[i].value >= 0x10000) {
                    curSize += 2
                } else {
                    curSize += 1
                }
            }
            return codepoints.slice(0, curSize <= newSize ? i : i - 1)
        }
    })

    // TODO: shrink elementwise
    shrinkableArr = shrinkableArr.andThen(parent => shrinkElementwise(parent, 0, 0))
    return shrinkableArr.map(theArr => String.fromCodePoint(...theArr.map(shr => shr.value)))
}
