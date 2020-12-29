import { Generator,Arbitrary } from "../Generator";
import { Random } from "../Random";
import { Shrinkable } from "../Shrinkable";
import { shrinkableTuple } from "../shrinker/tuple";
// import { shrinkableTuple } from "../shrinker/tuple";

// Generator<A> => A
type GenValueType<Gen> = Gen extends Generator<infer T> ? T : never

// [Generator<A>, ..., Generator<B>] => [A,...,B]
type GenValueTypes<Gens> = { [K in keyof Gens]: GenValueType<Gens[K]> }
// [Generator<A>, ..., Generator<B>] => [Shrinkable<A>,...,Shrinkable<B>]
type ShrsFromGens<Gens> = { [K in keyof Gens]: Shrinkable<GenValueType<Gens[K]>> }

export function TupleGen<GeneratorTs extends Generator<unknown>[]>(...elemGens:GeneratorTs):Generator<GenValueTypes<GeneratorTs>> {
    type Ts = GenValueTypes<GeneratorTs>
    return new Arbitrary<Ts>((rand:Random) => {
        const shrinkables:any[] = elemGens.map(elemGen => elemGen.generate(rand)) as ShrsFromGens<GeneratorTs>
        return shrinkableTuple(...shrinkables) as Shrinkable<GenValueTypes<GeneratorTs>>
    })
}
