import { ArbiContainer, Generator } from '../Generator';
import { Shrinkable } from '../Shrinkable';
import { shrinkableSet } from '../shrinker/set';

export function SetGen<T>(
    elemGen: Generator<T>,
    minSize: number,
    maxSize: number
): Generator<Set<T>> {
    return new ArbiContainer<Set<T>>(rand => {
        const size = rand.interval(minSize, maxSize);
        const array: Array<Shrinkable<T>> = [];
        const valueSet:Set<T> = new Set([])
        while (array.length < size) {
            const shr = elemGen.generate(rand)
            if(!valueSet.has(shr.value)) {
                array.push(shr);
                valueSet.add(shr.value)
            }
        }

        return shrinkableSet(array, minSize);
    }, minSize, maxSize);
}
