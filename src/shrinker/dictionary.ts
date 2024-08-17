import { Shrinkable } from '../Shrinkable'
import { shrinkElementwise } from './array'
import { binarySearchShrinkable } from './integer'

export interface Dictionary<T> {
    [Key: string]: T
}

// TODO: shrink elementwise
function createDictionary<T>(pairs: Array<[string, Shrinkable<T>]>): Dictionary<T> {
    const dict: Dictionary<T> = {}
    for (const pair of pairs) {
        dict[pair[0]] = pair[1].value
    }
    return dict
}

export function shrinkableDictionary<T>(dict: Dictionary<Shrinkable<T>>, minSize: number): Shrinkable<Dictionary<T>> {
    const size = Object.keys(dict).length
    const rangeShrinkable = binarySearchShrinkable(size - minSize).map(s => s + minSize)
    let shrinkableArr: Shrinkable<Array<[string, Shrinkable<T>]>> = rangeShrinkable.map(newSize => {
        if (newSize === 0) return []
        else {
            const arr: Array<[string, Shrinkable<T>]> = []
            let i = 0
            for (const key in dict) {
                if (i < newSize) arr.push([key, dict[key]])
                else break
                i++
            }
            return arr
        }
    })

    // shrink elementwise
    shrinkableArr = shrinkableArr.andThen(parent => {
        const parent2 = parent.map(arr => {
            return arr.map(pair => pair[1].map<[string, T]>(value => [pair[0], value]))
        })
        return shrinkElementwise(parent2, 0, 0).transform(shrArrShrStrT =>
            shrArrShrStrT.map(arrShrStrT => arrShrStrT.map(shrStrT => [shrStrT.value[0], shrStrT.map(pair => pair[1])]))
        )
    })
    return shrinkableArr.map(pairs => createDictionary(pairs))
}
