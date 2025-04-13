import { Generator, Arbitrary } from '../Generator'
import { Random } from '../Random'
import { Shrinkable } from '../Shrinkable'

/**
 * Wraps a Generator with an associated weight, used by `oneOf` to
 * determine the probability of selecting this generator.
 */
class Weighted<T> implements Generator<T> {
    constructor(readonly gen: Generator<T>, readonly weight: number) {}

    generate(rand: Random): Shrinkable<T> {
        return this.gen.generate(rand)
    }

    map<U>(transformer: (arg: T) => U): Generator<U> {
        return this.gen.map(transformer)
    }

    flatMap<U>(gen2gen: (arg: T) => Generator<U>): Generator<U> {
        return this.gen.flatMap(gen2gen)
    }

    chain<U>(gen2gen: (arg: T) => Generator<U>): Generator<[T, U]> {
        return this.gen.chain(gen2gen)
    }

    chainAsTuple<Ts extends unknown[], U>(genFactory: (arg: Ts) => Generator<U>): Generator<[...Ts, U]> {
        return this.gen.chainAsTuple(genFactory)
    }

    aggregate(gen2gen: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<T> {
        return this.gen.aggregate(gen2gen, minSize, maxSize)
    }

    accumulate(gen2gen: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<Array<T>> {
        return this.gen.accumulate(gen2gen, minSize, maxSize)
    }

    filter(filterer: (value: T) => boolean): Generator<T> {
        return this.gen.filter(filterer)
    }
}

function isWeighted<T>(gen: Weighted<T> | Generator<T>): gen is Weighted<T> {
    return (gen as Weighted<T>).weight !== undefined
}

// Helper function to explicitly create a Weighted generator.
export function weightedGen<T>(gen: Generator<T>, weight: number) {
    return new Weighted(gen, weight)
}

/**
 * Creates a generator that randomly selects one of the provided generators
 * based on their assigned weights. If some generators are not explicitly
 * weighted (using `weightedGen`), the remaining probability mass (1.0 - sum of weights)
 * is distributed equally among them.
 * @param generators A list of generators, optionally wrapped with `weightedGen`.
 */
export function oneOf<T>(...generators: Generator<T>[]): Generator<T> {
    let sum = 0.0
    let numUnassigned = 0
    // Initial pass to sum weights of explicitly weighted generators
    // and count unassigned ones.
    let weightedGenerators = generators.map(generator => {
        if (isWeighted(generator)) {
            sum += generator.weight
            return generator
        } else {
            numUnassigned++
            // Temporarily assign 0 weight to unweighted generators
            return new Weighted(generator, 0.0)
        }
    })

    // Validate the sum of explicitly assigned weights.
    if (sum < 0.0 || sum >= 1.0) throw Error('invalid weights: sum must be between 0.0 and < 1.0')

    // Distribute remaining probability mass among unweighted generators if any exist.
    if (numUnassigned > 0) {
        const rest = 1.0 - sum
        const perUnassigned = rest / numUnassigned
        weightedGenerators = weightedGenerators.map(weightedGenerator => {
            if (weightedGenerator.weight === 0.0) return new Weighted(weightedGenerator.gen, perUnassigned)
            else return weightedGenerator
        })
    }
    return new Arbitrary<T>((rand: Random) => {
        // Selection loop: repeatedly pick a generator index and check against its weight.
        // This probabilistic check ensures generators are selected according to their weights.
        while (true) {
            const dice = rand.inRange(0, weightedGenerators.length)
            if (rand.nextBoolean(weightedGenerators[dice].weight)) {
                return weightedGenerators[dice].gen.generate(rand)
            }
        }
    })
}
