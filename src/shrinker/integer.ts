import { Random } from '../Random';
import { Stream } from '../Stream'
import { Shrinkable } from "../Shrinkable";

function genpos(min:number, max:number):Stream<Shrinkable<number>> {
    const mid = Math.floor(min/2) + Math.floor(max/2) + ((min % 2 != 0 && max % 2 !=0) ? 1 : 0)
    if(min + 1 >= max)
        return Stream.empty()
    else if(min + 2 >= max)
        return Stream.one(new Shrinkable<number>(mid))
    else
        return Stream.one(new Shrinkable<number>(mid).with(() => genpos(min, mid))).concat(genpos(mid, max))
}

function genneg(min:number, max:number):Stream<Shrinkable<number>> {
    const mid = Math.floor(min/2) + Math.floor(max/2) + ((min % 2 != 0 && max % 2 != 0) ? -1 : 0)
    if(min + 1 >= max)
        return Stream.empty()
    else if(min + 2 >= max)
        return Stream.one(new Shrinkable<number>(mid))
    else
        return Stream.one(new Shrinkable<number>(mid).with(() => genpos(min, mid))).concat(genpos(mid, max))
}

export function binarySearchShrinkable(value:number):Shrinkable<number> {
    return new Shrinkable<number>(value).with(() => {
        if(value == 0)
            return Stream.empty()
        else if(value > 0)
            return Stream.one(new Shrinkable<number>(0)).concat(genpos(0, value))
        else
            return Stream.one(new Shrinkable<number>(0)).concat(genneg(value, 0))
    })
}

export function generateInteger(random:Random, min:number, max:number):Shrinkable<number> {
    const value = random.intInterval(min, max)
    if(value < min || max < value)
        throw "invalid range"

    if(min >= 0)
        return binarySearchShrinkable(value - min).transform((n) => n + min)
    else if(max <= 0)
        return binarySearchShrinkable(value - max).transform((n) => n + max)
    else
        return binarySearchShrinkable(value)
}

// export function exhaustive<T>(shrinkable:Shrinkable<T>, level:number = 0, print = true):void {
//     if(print) {
//         for(let i = 0; i < level; i++) {
//             console.log("  ")
//         }
//         console.log(`Shrinkable: ${shrinkable}`)
//     }

//     const shrinks = shrinkable.shrinks()
//     for(const itr = shrinks.iterator(); itr.hasNext();) {
//         const shr = itr.next()
//         exhaustive(shr, level + 1, print)
//     }
// }