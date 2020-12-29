import { Shrinkable } from '../Shrinkable';
import { binarySearchShrinkable } from './integer';

export function shrinkableSet<T>(
    set: Set<Shrinkable<T>>,
    minSize: number
): Shrinkable<Set<T>> {
    const size = set.size;
    const rangeShrinkable = binarySearchShrinkable(size - minSize).transform(
        s => s + minSize
    );
    const shrinkableArr = rangeShrinkable.transform(newSize => {
        if (newSize === 0) return [];
        else {
            const arr: Array<Shrinkable<T>> = [];
            set.forEach(elem => arr.push(elem));
            return arr.slice(0, newSize);
        }
    });

    // TODO: shrink elementwise
    return shrinkableArr.transform(
        theArr => new Set(theArr.map(shr => shr.value))
    );
}
