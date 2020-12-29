import { Random } from "../src/Random"
import { floatingGen } from "../src/generator/floating"
import { interval } from "../src/generator/integer"
import { booleanGen } from "../src/generator/boolean"
import { stringGen, UnicodeStringGen } from "../src/generator/string"
import { ArrayGen } from "../src/generator/array"
import { setGen } from "../src/generator/set"
import { TupleGen } from "../src/generator/tuple"
import { Generator } from "../src/Generator"
import { exhaustive } from "./testutil"


function print<T>(rand:Random, generator:Generator<T>, num:number = 20) {
    const arr = []
    for(let i = 0; i < num; i++)
        arr.push('{' + generator.generate(rand).value + '}')

    console.log(arr.toString())
}

describe('generator', () => {
    const rand = new Random('0')
    it('floating', () => {
        const gen = floatingGen()
        print(rand, gen)
    })

    it('integer', () => {
        const gen = interval(-10, 10)
        print(rand, gen)
    })

    it('string', () => {
        const gen1 = stringGen(0, 10)
        print(rand, gen1)

        const gen2 = UnicodeStringGen(0, 10)
        print(rand, gen2)
    })

    it('boolean', () => {
        const gen = booleanGen()
        print(rand, gen)
    })

    it('array', () => {
        const elemGen = interval(-10, 10)
        const gen = ArrayGen(elemGen, 0, 3)
        print(rand, gen)
    })

    it('set', () => {
        const elemGen = interval(0, 3)
        const gen = setGen(elemGen, 0, 3)
        print(rand, gen)
    })

    it('tuple', () => {
        const numGen = interval(0, 3)
        const boolGen = booleanGen()
        const gen = TupleGen(numGen, boolGen)
        const [num, bool] = gen.generate(new Random('0')).value
        console.log(num, bool)
    })

    it('tuple2', () => {
        const numGen = interval(0, 3)
        const gen = TupleGen(numGen, numGen)
        const shr = gen.generate(new Random('0'))
        exhaustive(shr)
    })
})