import { Random } from '../src/Random'
import { Gen } from '../src'
import { Generator } from '../src/Generator'
import { forAll } from '../src/Property'
import { JSONStringify } from '../src/util/JSON'
import { exhaustive } from './testutil'
import { Shrinkable } from '../src/Shrinkable'

function print<T>(rand: Random, generator: Generator<T>, num: number = 20) {
    const arr: string[] = []
    for (let i = 0; i < num; i++) arr.push('{' + JSONStringify(generator.generate(rand).value) + '}')

    console.log(arr.toString())
}

describe('generator', () => {
    const rand = new Random()

    it('boolean', () => {
        // make sure it generates almost 50:50 of true and false
        const gen = Gen.boolean()
        const numGenerations = 1000
        let numTrue = 0
        let numFalse = 0
        for (let i = 0; i < numGenerations; i++) {
            const value = gen.generate(rand).value
            if (value) numTrue++
            else numFalse++
        }
        expect(numTrue).toBeGreaterThan(numGenerations * 0.45)
        expect(numFalse).toBeGreaterThan(numGenerations * 0.45)
    })

    it('floating', () => {
        const gen = Gen.float()
        print(rand, gen)
    })

    it('integer small', () => {
        const gen = Gen.interval(0, 1)
        // make sure it generates almost 50:50 of 0 and 1
        const numGenerations = 1000
        let num0 = 0
        let num1 = 0
        for (let i = 0; i < numGenerations; i++) {
            const value = gen.generate(rand).value
            if (value === 0) num0++
            else if (value === 1) num1++
            else throw new Error('unexpected value: ' + value)
        }
        expect(num0).toBeGreaterThan(numGenerations * 0.45)
        expect(num1).toBeGreaterThan(numGenerations * 0.45)
    })

    it('integer', () => {
        const gen = Gen.interval(-10, 10)
        // make sure it generates all values
        const numGenerations = 1000
        const set: Set<number> = new Set([])
        for (let i = 0; i < numGenerations; i++) {
            const value = gen.generate(rand).value
            expect(value).toBeGreaterThanOrEqual(-10)
            expect(value).toBeLessThanOrEqual(10)
            set.add(value)
        }
        expect(set.size).toBe(21)
    })

    it('string', () => {
        const gen1 = Gen.string(0, 5)
        print(rand, gen1)
        // make sure it generates values of all lengths from 0 to 5 and only ASCII
        const set: Set<number> = new Set([])
        for (let i = 0; i < 1000; i++) {
            const value = gen1.generate(rand).value
            expect(value.length).toBeLessThanOrEqual(5)
            for (let j = 0; j < value.length; j++) {
                const code = value.charCodeAt(j)
                expect(code).toBeGreaterThanOrEqual(0)
                expect(code).toBeLessThanOrEqual(127)
            }
            set.add(value.length)
        }
        expect(set.size).toBe(6)

        const gen2 = Gen.unicodeString(0, 10)
        // make sure it generates values of all lengths from 0 to 10 and includes non-ASCII
        const set2: Set<number> = new Set([])
        for (let i = 0; i < 1000; i++) {
            const value = gen2.generate(rand).value
            expect(value.length).toBeLessThanOrEqual(10)
            set2.add(value.length)
        }
        expect(set2.size).toBe(11)
    })

    it('array', () => {
        const elemGen = Gen.interval(0, 99)
        const gen = Gen.array(elemGen, 5, 6)
        print(rand, gen)
        for (let i = 0; i < 3; i++) {
            const set: Set<string> = new Set([])
            let exhaustiveStr = ''
            // let numTotal = 0
            exhaustive(gen.generate(rand), 0, (shrinkable: Shrinkable<number[]>, _level: number) => {
                exhaustiveStr += '\n'
                for (let i = 0; i < _level; i++) exhaustiveStr += '  '
                exhaustiveStr += JSONStringify(shrinkable.value)

                const str = JSONStringify(shrinkable.value)
                if (set.has(str)) {
                    exhaustiveStr += ' (already exists)'
                }
                set.add(str)
            })
            console.log('exhaustive: ' + exhaustiveStr)
        }
    })

    const combination = (n: number, r: number) => {
        let result = 1
        for (let i = 1; i <= r; i++) {
            result *= n--
            result /= i
        }
        return result
    }

    it('util.combination', () => {
        // can fail with n >= 67
        const pairGen = Gen.interval(1, 30).chain((n: number) => Gen.interval(0, n))
        forAll((n_and_r: [number, number]) => {
            const n = n_and_r[0]
            const r = n_and_r[1]
            const result = combination(n, r)
            expect(Math.floor(result)).toBe(result)
        }, pairGen)
    })

    it('set_shrink', () => {
        // test if set/array shrinking is thorough and unique
        // it must cover all combinations and never repeated

        const sumCombinations = (n: number, maxR: number) => {
            if (maxR < 0) return 0
            let result = 0
            for (let r = 0; r <= maxR; r++) result += combination(n, r)
            return result
        }

        const minAndMaxSizeGen = Gen.interval(0, 10).chain((n: number) => Gen.interval(n, 10))
        forAll((minAndMaxSize: [number, number]) => {
            const elemGen = Gen.interval(0, 99)
            const minSize = minAndMaxSize[0]
            const maxSize = minAndMaxSize[1]
            const gen = Gen.set(elemGen, minSize, maxSize)
            // print(rand, gen);
            for (let i = 0; i < 3; i++) {
                const set: Set<string> = new Set([])
                let exhaustiveStr = ''
                let numTotal = 0
                const root = gen.generate(rand)
                exhaustive(root, 0, (shrinkable: Shrinkable<Set<number>>, _level: number) => {
                    exhaustiveStr += '\n'
                    for (let i = 0; i < _level; i++) exhaustiveStr += '  '
                    exhaustiveStr += JSONStringify(shrinkable.value)
                    numTotal++

                    const str = JSONStringify(shrinkable.value)
                    if (set.has(str)) {
                        throw new Error(str + ' already exists in: ' + exhaustiveStr)
                    }
                    set.add(str)
                })
                const size = root.value.size
                // console.log('rootSize: ' + size + ", minSize: " + minSize + ", total: " + numTotal + ", pow: " + Math.pow(2, size) + ", minus: " + sumCombinations(size, minSize-1))
                // console.log("exhaustive: " + exhaustiveStr)
                expect(numTotal).toBe(Math.pow(2, size) - sumCombinations(size, minSize - 1))
            }
        }, minAndMaxSizeGen)
    })

    it('set', () => {
        const elemGen = Gen.integers(0, 8)
        const gen = Gen.set(elemGen, 4, 8)
        print(rand, gen)
        forAll((set: Set<number>) => {
            return set.size >= 4 && set.size <= 8
        }, gen)
        exhaustive(gen.generate(rand))
    })

    it('dictionary', () => {
        const elemGen = Gen.interval(0, 4)
        const gen = Gen.dictionary(elemGen, 4, 8)
        print(
            rand,
            gen.map(dict => JSON.stringify(dict))
        )
        exhaustive(gen.generate(rand).map(dict => JSON.stringify(dict)))
    })

    it('tuple', () => {
        const numGen = Gen.interval(0, 3)
        const boolGen = Gen.boolean()
        const gen = Gen.tuple(numGen, boolGen)
        const [num, bool] = gen.generate(new Random('0')).value
        console.log(num, bool)
    })

    it('tuple2', () => {
        const numGen = Gen.interval(0, 3)
        const gen = Gen.tuple(numGen, numGen)
        const shr = gen.generate(new Random('0'))
        exhaustive(shr)
    })

    it('big tuple', () => {
        const numGen = Gen.interval(0, 3)
        const gens: Generator<number>[] = []
        for (let i = 0; i < 800; i++) gens.push(numGen)
        const gen = Gen.tuple(...gens)
        console.log(JSONStringify(gen.generate(new Random('0')).value))
    })

    it('Generator::filter', () => {
        const numGen = Gen.interval(0, 3)
        const tupleGen = numGen.filter(n => n === 3)
        for (let i = 0; i < 3; i++) exhaustive(tupleGen.generate(rand))
    })

    it('Generator::flatMap', () => {
        const numGen = Gen.interval(0, 3)
        const tupleGen = numGen.flatMap(n =>
            Gen.tuple(
                Gen.just(n),
                Gen.just(2).map(v => v * n)
            )
        )
        for (let i = 0; i < 3; i++) exhaustive(tupleGen.generate(rand))
    })

    it('Generator::flatMap dependent sequence with array', () => {
        const gengen = (n: number) => Gen.interval(n, n + 1)
        let gen1 = gengen(0) //.map(num => [num])

        for (let i = 1; i < 20; i++) gen1 = gen1.flatMap(num => gengen(num))

        print(rand, gen1)
    })

    it('Generator::aggregate', () => {
        // const gengen = (n:number) => interval(n, n+1)
        let gen1 = Gen.interval(0, 1).map(num => [num])

        const gen = gen1.aggregate(
            nums => {
                const last = nums[nums.length - 1]
                return Gen.interval(last, last + 1).map(num => [...nums, num])
            },
            2,
            4
        )
        print(rand, gen)
        exhaustive(gen.generate(rand))
    })

    it('Generator::accumulate', () => {
        let gen1: Generator<number> = Gen.interval(0, 0 + 2)

        const gen: Generator<number[]> = gen1.accumulate(num => Gen.interval(num, num + 2), 2, 4)
        print(rand, gen)
        for (let i = 0; i < 10; i++) exhaustive(gen.generate(rand))
    })

    it('Generator::accumulate many', () => {
        let gen1: Generator<number> = Gen.interval(0, 0 + 2)

        const gen: Generator<number[]> = gen1.accumulate(num => Gen.interval(num, num + 2), 2, 4)
        print(rand, gen)
        forAll((_nums: number[]): void => {}, gen)
    })
})
