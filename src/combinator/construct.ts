import { Arbitrary, Generator } from '../Generator'
import { GenValueTypes, TupleGen } from '../generator/tuple'
import { Random } from '../Random'

export function construct<T, Gens extends Generator<unknown>[]>(
    Type: { new (...args: GenValueTypes<Gens>): T },
    ...gens: Gens
): Generator<T> {
    const tupleGen = TupleGen(...gens).map(tuple => new Type(...tuple))
    return new Arbitrary<T>((rand: Random) => {
        return tupleGen.generate(rand)
    })
}
