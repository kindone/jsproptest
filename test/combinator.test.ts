import { Random } from '../src/Random'
import { Gen } from '../src'
import { Generator } from '../src/Generator'
import { exhaustive } from './testutil'

function print<T>(rand: Random, generator: Generator<T>, num: number = 50) {
    const arr: string[] = []
    for (let i = 0; i < num; i++) arr.push('{' + generator.generate(rand).value + '}')

    console.log(arr.toString())
}

describe('combinator', () => {
    const rand = new Random('1')
    it('oneOf', () => {
        const numGen1 = Gen.interval(1, 3)
        const numGen2 = Gen.interval(6, 8)
        const gen1 = Gen.oneOf(numGen1, numGen2)
        print(rand, gen1)

        const gen2 = Gen.oneOf(Gen.weightedGen(numGen1, 0.8), numGen2)
        print(rand, gen2)
    })

    it('elementOf', () => {
        const gen1 = Gen.elementOf<number>(2, 10, -1, 7)
        print(rand, gen1)

        const gen2 = Gen.elementOf<number>(Gen.weightedValue(1, 0.8), 10)
        print(rand, gen2)
    })

    class Cat {
        constructor(readonly a: number, readonly b: string) {}

        toString(): string {
            return `a: ${this.a}, b: ${this.b}`
        }
    }

    it('construct', () => {
        const catGen = Gen.construct(Cat, Gen.interval(1, 3), Gen.elementOf<string>('Cat', 'Kitten'))
        const cat = catGen.generate(rand).value
        console.log('cat:', cat.a, cat.b)
        const catShr = catGen.generate(rand)
        exhaustive(catShr)
    })

    it('chainTuple', () => {
        const numGen1 = Gen.interval(1, 3)
        const pairGen = numGen1.chain(num => Gen.interval(0, num))
        const tripleGen = Gen.chainTuple(pairGen, pair => Gen.interval(0, pair[1]))
        const quadGen = Gen.chainTuple(tripleGen, triple => Gen.interval(0, triple[2]))
        exhaustive(quadGen.generate(rand))
    })

    it('chainAsTuple', () => {
        const numGen1 = Gen.interval(1, 3)
        const quadGen = numGen1
            .chain(num => Gen.interval(0, num))
            .chainAsTuple((pair: [number, number]) => Gen.interval(0, pair[1]))
            .chainAsTuple((triple: [number, number, number]) => Gen.interval(0, triple[2]))
        exhaustive(quadGen.generate(rand))
    })
})
