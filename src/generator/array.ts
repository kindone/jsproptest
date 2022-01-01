import { ArbiContainer, Generator } from '../Generator'
import { Shrinkable } from '../Shrinkable'
import { shrinkableArray } from '../shrinker/array'
import { SetGen } from './set'

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

export function UniqueArrayGen<T>(elemGen: Generator<T>, minSize: number, maxSize: number): Generator<Array<T>> {
    return SetGen(elemGen, minSize, maxSize).map(set => {
        const arr = new Array<T>()
        set.forEach(function(item) {
            arr.push(item)
        })
        return arr.sort((a, b) => (a > b ? 1 : a == b ? 0 : -1))
    })
}
