import { Shrinkable } from '../Shrinkable';
import { binarySearchShrinkable } from './integer';

export function shrinkableString(codepoints:Array<Shrinkable<number>>, minSize:number):Shrinkable<string> {
    const size = codepoints.length
    const rangeShrinkable = binarySearchShrinkable(size - minSize).transform(s => s + minSize)
    const shrinkableArr = rangeShrinkable.transform(newSize => {
        if(newSize == 0)
            return []
        else
            return codepoints.slice(0, newSize)
    })

    // TODO: shrink elementwise
    return shrinkableArr.transform(theArr => String.fromCodePoint(...theArr.map(shr => shr.value)))
}