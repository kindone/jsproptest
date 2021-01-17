import { ArbiContainer, Generator } from '../Generator';
import { Shrinkable } from '../Shrinkable';
import { shrinkableArray } from '../shrinker/array';

export function ArrayGen<T>(
    elemGen: Generator<T>,
    minSize: number,
    maxSize: number
): Generator<Array<T>> {
    return new ArbiContainer<Array<T>>(rand => {
        const size = rand.interval(minSize, maxSize);
        const array: Array<Shrinkable<T>> = [];
        for (let i = 0; i < size; i++) array.push(elemGen.generate(rand));

        return shrinkableArray(array, minSize);
    }, minSize, maxSize);
}
