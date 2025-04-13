import { ArbiContainer, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'
import { shrinkableArray } from '../shrinker/array'
import { SetGen } from './set'

/**
 * Generates an array of elements using the provided element generator.
 * The generated array adheres to the specified minimum and maximum size constraints.
 * It utilizes `shrinkableArray` to enable shrinking towards smaller arrays and simpler element values
 * during property-based testing failures.
 *
 * @template T The type of elements in the array.
 * @param elemGen The generator for individual elements.
 * @param minSize The minimum number of elements in the generated array.
 * @param maxSize The maximum number of elements in the generated array.
 * @returns {Generator<Array<T>>} A generator producing arrays of type T.
 */
export function ArrayGen<T>(elemGen: Generator<T>, minSize: number, maxSize: number): Generator<Array<T>> {
    return new ArbiContainer<Array<T>>(
        rand => {
            const size = rand.interval(minSize, maxSize)
            const array: Array<Shrinkable<T>> = []
            for (let i = 0; i < size; i++) array.push(elemGen.generate(rand))

            return shrinkableArray(array, minSize)
        },
        minSize,
        maxSize
    )
}

/**
 * Generates an array containing unique elements, sorted in ascending order.
 * It achieves uniqueness by first generating a Set using `SetGen` and then converting the Set into an array.
 * Sorting ensures a canonical representation for the generated unique arrays.
 *
 * @template T The type of elements in the array.
 * @param elemGen The generator for individual elements.
 * @param minSize The minimum number of unique elements in the generated array.
 * @param maxSize The maximum number of unique elements in the generated array.
 * @returns {Generator<Array<T>>} A generator producing sorted arrays of unique elements of type T.
 */
export function UniqueArrayGen<T>(elemGen: Generator<T>, minSize: number, maxSize: number): Generator<Array<T>> {
    return SetGen(elemGen, minSize, maxSize).map(set => {
        const arr = new Array<T>()
        set.forEach(function(item) {
            arr.push(item)
        })
        return arr.sort((a, b) => (a > b ? 1 : a === b ? 0 : -1))
    })
}
