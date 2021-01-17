import { Generator,Arbitrary } from "../Generator";
import { Random } from "../Random";
import { Shrinkable } from "../Shrinkable";
class Weighted<T> implements Generator<T> {
    constructor(readonly gen:Generator<T>, readonly weight:number) {
    }

    generate(rand:Random):Shrinkable<T> {
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

    aggregate(gen2gen:(arg:T) => Generator<T>, minSize:number, maxSize:number):Generator<T> {
        return this.gen.aggregate(gen2gen, minSize, maxSize)
    }

    accumulate(gen2gen:(arg:T) => Generator<T>, minSize:number, maxSize:number):Generator<Array<T>> {
        return this.gen.accumulate(gen2gen, minSize, maxSize)
    }

    filter(filterer: (value: T) => boolean): Generator<T> {
        return this.gen.filter(filterer)
    }
}

function isWeighted<T>(gen: Weighted<T> | Generator<T>): gen is Weighted<T> {
    return (gen as Weighted<T>).weight !== undefined;
}

export function weightedGen<T>(gen:Generator<T>, weight:number) {
    return new Weighted(gen, weight)
}

export function oneOf<T>(...generators:Generator<T>[]):Generator<T> {
    let sum = 0.0
    let numUnassigned = 0
    let weightedGenerators = generators.map(generator => {
        if(isWeighted(generator)) {
            sum += generator.weight
            return generator
        }
        else {
            numUnassigned ++
            return new Weighted(generator, 0.0)
        }
    })

    if(sum < 0.0 || sum >= 1.0)
        throw Error('invalid weights')

    if(numUnassigned > 0) {
        let rest = 1.0 - sum
        const perUnassigned = rest / numUnassigned
        weightedGenerators = weightedGenerators.map(weightedGenerator => {
            if(weightedGenerator.weight == 0.0)
                return new Weighted(weightedGenerator.gen, perUnassigned)
            else
                return weightedGenerator
        })
    }
    return new Arbitrary<T>((rand:Random) => {
        while(true) {
            const dice = rand.inRange(0, weightedGenerators.length)
            if(rand.nextBoolean(weightedGenerators[dice].weight)) {
                return weightedGenerators[dice].gen.generate(rand)
            }
        }
    })
}
