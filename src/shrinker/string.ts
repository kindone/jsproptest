import { Shrinkable } from '../Shrinkable';
import { shrinkElementwise } from './array';
import { binarySearchShrinkable } from './integer';

export function shrinkableString(
    codepoints: Array<Shrinkable<number>>,
    minSize: number
): Shrinkable<string> {
    const size = codepoints.length;
    const rangeShrinkable = binarySearchShrinkable(size - minSize).map(
        s => s + minSize
    );
    let shrinkableArr = rangeShrinkable.map(newSize => {
        if (newSize === 0) return [];
        else return codepoints.slice(0, newSize);
    });

    // TODO: shrink elementwise
    shrinkableArr = shrinkableArr.andThen(parent => shrinkElementwise(parent, 0, 0))
    return shrinkableArr.map(theArr =>
        String.fromCodePoint(...theArr.map(shr => shr.value))
    );
}
