import { Shrinkable } from '../Shrinkable';
import { binarySearchShrinkable } from './integer';

export interface Dictionary<T> {
    [Key: string]: T
}

// TODO: shrink elementwise
function createDictionary<T>(pairs:Array<[string,Shrinkable<T>]>):Dictionary<T> {
    const dict:Dictionary<T> = {}
    for(const pair of pairs) {
        dict[pair[0]] = pair[1].value
    }
    return dict
}

export function shrinkableDictionary<T>(dict:Dictionary<Shrinkable<T>>, minSize:number):Shrinkable<Dictionary<T>> {
    const size = Object.keys(dict).length
    const rangeShrinkable = binarySearchShrinkable(size - minSize).map(s => s + minSize)
    const shrinkableArr = rangeShrinkable.map(newSize => {
        if(newSize == 0)
            return []
        else {
            const arr:Array<[string, Shrinkable<T>]> = []
            for(const key in dict) {
                arr.push([key, dict[key]])
            }
            return arr
        }
    })

    // TODO: shrink elementwise
    return shrinkableArr.map(pairs => createDictionary(pairs))
}