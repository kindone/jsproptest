import { Arbitrary, Generator } from '../Generator'
import { GenValueTypes, TupleGen } from '../generator/tuple'
import { Random } from '../Random'

/**
 * Creates a generator for instances of a class `Type`.
 *
 * It takes the class `Type` and a sequence of generators `gens` corresponding
 * to the constructor arguments of `Type`. It generates a tuple of values using
 * the provided generators and then uses these values to instantiate `Type`.
 *
 * @template T The type of the class instances to generate.
 * @template Gens An array of Generator types, corresponding to the constructor argument types.
 * @param Type The constructor function of the class to instantiate.
 * @param gens A sequence of generators for the constructor arguments.
 * @returns A Generator that produces instances of `Type`.
 *
 * @example
 * ```ts
 * class User {
 *     constructor(public id: number, public name: string) {}
 * }
 *
 * const userGen = Gen.construct(User, Gen.interval(1, 100), Gen.asciiString(1, 20))
 * ```
 */
export function construct<T, Gens extends Generator<unknown>[]>(
    Type: { new (...args: GenValueTypes<Gens>): T },
    ...gens: Gens
): Generator<T> {
    const tupleGen = TupleGen(...gens).map(tuple => new Type(...tuple))
    return new Arbitrary<T>((rand: Random) => {
        return tupleGen.generate(rand)
    })
}
