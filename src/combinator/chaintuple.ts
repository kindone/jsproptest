import { Arbitrary, Generator } from '../Generator'
import { Random } from '../Random'
import { Shrinkable } from '../Shrinkable'

/**
 * Chains the generation of a tuple with the generation of a subsequent value
 * that depends on the tuple's contents.
 *
 * This allows creating generators where the parameters of one generator depend
 * on the output of a previous one, specifically within the context of building up a tuple.
 *
 * @param tupleGen The generator for the initial tuple elements `Ts`.
 * @param genFactory A function that takes the generated tuple `Ts` and returns a generator for the final element `U`.
 * @returns A generator for the combined tuple `[...Ts, U]`.
 */
export function chainTuple<Ts extends unknown[], U>(
    tupleGen: Generator<Ts>,
    genFactory: (arg: Ts) => Generator<U>
): Generator<[...Ts, U]> {
    return new Arbitrary<[...Ts, U]>((rand: Random) => {
        // Generate the initial tuple and the dependent value (wrapped in Shrinkable)
        const intermediate: Shrinkable<[...Ts, Shrinkable<U>]> = tupleGen
            .generate(rand)
            .map(tuple => [...tuple, genFactory(tuple).generate(rand)] as [...Ts, Shrinkable<U>])

        // Define the shrinking logic. It combines shrinks from both generators:
        // 1. Shrinks the initial tuple (from `tupleGen`) and regenerates the dependent value (`genFactory`) for each shrink.
        // 2. Shrinks the dependent value (from `genFactory`) while keeping the initial tuple fixed.
        return intermediate
            .andThen(interShr => {
                const head = interShr.value.slice(0, interShr.value.length - 1) as Ts
                const tail = interShr.value[interShr.value.length - 1] as Shrinkable<U>
                // Combine the fixed head with shrinks of the tail
                return tail
                    .flatMap<[...Ts, Shrinkable<U>]>(second => new Shrinkable([...head, new Shrinkable(second)]))
                    .shrinks()
            })
            // Extract the final value from the inner Shrinkable
            .map(tupleWithShrU => [
                ...(tupleWithShrU.slice(0, tupleWithShrU.length - 1) as Ts),
                (tupleWithShrU[tupleWithShrU.length - 1] as Shrinkable<U>).value as U,
            ])
    })
}
