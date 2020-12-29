// import { Generator,Arbitrary } from "../Generator";
// import { Random } from "../Random";
// import { Shrinkable } from "../Shrinkable";

import { Arbitrary, Generator } from "../Generator"
import { TupleGen } from "../generator/tuple"
import { Random } from "../Random"

// Generator<A> => A
type GeneratorType<Gen> = Gen extends Generator<infer T> ? T : any

// [Generator<A>, ..., Generator<B>] => [A,...,B]
type GeneratorsType<Gens> = { [K in keyof Gens]: GeneratorType<Gens[K]> }


export function construct<T, GeneratorTs extends Generator<unknown>[]>(type: { new (...a:GeneratorsType<GeneratorTs>):T }, ...gens:GeneratorTs):Generator<T> {
    const tupleGen = TupleGen(...gens).map(tuple => new type(...tuple))
    return new Arbitrary<T>((rand:Random)=> {
        return tupleGen.generate(rand)
    })
}

// export function construct<T, ARGS extends unknown[]>(type: { new (...a:ARGS):T }, ...args:ARGS):T {

//     return new type(...args)
// }