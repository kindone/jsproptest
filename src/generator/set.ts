import { ArbiContainer, Generator } from '../Generator';
import { Shrinkable } from '../Shrinkable';
import { shrinkableSet } from '../shrinker/set';

export function setGen<T>(
    elemGen: Generator<T>,
    minSize: number,
    maxSize: number
): Generator<Set<T>> {
    return new ArbiContainer<Set<T>>(rand => {
        const size = rand.interval(minSize, maxSize);
        const set: Set<Shrinkable<T>> = new Set([]);
        while (set.size < size) set.add(elemGen.generate(rand));

        return shrinkableSet(set, minSize);
    });
}
