import { Shrinkable } from '../Shrinkable';
import { binarySearchShrinkable } from './integer';
import { shrinkBulkRecursive } from './array';

export function shrinkableSet<T>(
    array: Array<Shrinkable<T>>,
    minSize: number
): Shrinkable<Set<T>> {
    const size = array.length;
    const rangeShrinkable = binarySearchShrinkable(size - minSize).map(
        s => s + minSize
    );
    let shrinkableArr = rangeShrinkable.map(newSize => {
        if (newSize === 0) return [];
        else {
            return array.slice(0, newSize);
        }
    });

    // shrink elementwise
    shrinkableArr = shrinkableArr.andThen(parent => shrinkBulkRecursive(parent, 0, 0))
    return shrinkableArr.map(
        theArr => new Set(theArr.map(shr => shr.value))
    );
}
