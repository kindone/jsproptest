import { Generator, Arbitrary } from '../Generator'
import { Random } from '../Random'
import { Shrinkable } from '../Shrinkable'
import { shrinkableTuple } from '../shrinker/tuple'
// import { shrinkableTuple } from "../shrinker/tuple";

// Generator<A> => A
type GenValueType<Gen> = Gen extends Generator<infer T> ? T : never

// [Generator<A>, ..., Generator<B>] => [A,...,B]
export type GenValueTypes<Gens extends Generator<unknown>[]> = { [K in keyof Gens]: GenValueType<Gens[K]> }
// [Generator<A>, ..., Generator<B>] => [Shrinkable<A>,...,Shrinkable<B>]
type ShrsFromGens<Gens> = {
    [K in keyof Gens]: Shrinkable<GenValueType<Gens[K]>>
}

export function TupleGen<Gens extends Generator<unknown>[]>(...elemGens: Gens): Generator<GenValueTypes<Gens>> {
    type Ts = GenValueTypes<Gens>
    return new Arbitrary<Ts>((rand: Random) => {
        const shrinkables: Shrinkable<unknown>[] = elemGens.map(elemGen => elemGen.generate(rand)) as ShrsFromGens<Gens>
        return shrinkableTuple(...shrinkables) as Shrinkable<GenValueTypes<Gens>>
    })
}
