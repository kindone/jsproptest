import { Shrinkable } from '../Shrinkable';

// Shrinkable<A> => A
type ShrValueType<Shr> = Shr extends Shrinkable<infer T> ? T : never
// [Shrinkable<A>, ..., Shrinkable<B>] => [A,...,B]
type ShrValueTypes<Shrs> = { [K in keyof Shrs]: ShrValueType<Shrs[K]> }
// [Shrinkable<A>, ..., Shrinkable<B>] => [Shrinkable<A>,...,Shrinkable<B>]
// type ShrinkablesTypeShrinkable<Shrs> = Shrinkable<{ [K in keyof Shrs]: ShrinkableType<Shrs[K]> }>

// in: [Shrinkable<A>,...,Shrinkable<B>]
export function shrinkableTuple<ShrinkableTuple extends Shrinkable<unknown>[]>(...tuple:ShrinkableTuple):Shrinkable<ShrValueTypes<ShrinkableTuple>> {
    let shrTuple = tuple[0].transform(first => [new Shrinkable(first), ...tuple.slice(1)]) as Shrinkable<ShrinkableTuple>
    for(let i = 1; i < tuple.length; i++) {
        shrTuple = shrTuple.concat(parent => {
            return parent.value[i].shrinks().transform(shr => {
                const tup = [...parent.value.slice(0,i), shr, ...parent.value.slice(i+1)]
                return new Shrinkable(tup) as Shrinkable<ShrinkableTuple>
            })
        })
    }
    return shrTuple.transform(tup =>
        tup.map(shr => (shr as Shrinkable<unknown>).value) as ShrValueTypes<ShrinkableTuple>
    )
}