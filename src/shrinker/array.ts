import { Shrinkable } from '../Shrinkable';
import { binarySearchShrinkable } from './integer';

export function shrinkableArray<T>(arr:Array<Shrinkable<T>>, minSize:number):Shrinkable<Array<T>> {
    const size = arr.length
    const rangeShrinkable = binarySearchShrinkable(size - minSize).transform(s => s + minSize)
    const shrinkableArr = rangeShrinkable.transform(newSize => {
        if(newSize == 0)
            return []
        else
            return arr.slice(0, newSize)
    })

    // TODO: shrink elementwise
    return shrinkableArr.transform(theArr => theArr.map(shr => shr.value))
}