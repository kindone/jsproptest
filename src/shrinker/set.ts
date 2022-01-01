import { Shrinkable } from '../Shrinkable'
import { shrinkableArray } from './array'

export function shrinkableSet<T>(array: Array<Shrinkable<T>>, minSize: number): Shrinkable<Set<T>> {
    const shrinkableArr = shrinkableArray(array, minSize)
    return shrinkableArr.map(theArr => new Set(theArr))
}
