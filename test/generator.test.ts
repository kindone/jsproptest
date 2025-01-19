import { Random } from '../src/Random'
import { Gen } from '../src'
import { Generator } from '../src/Generator'
import { forAll } from '../src/Property'
import { JSONStringify } from '../src/util/JSON'
import { exhaustive } from './testutil'
import { Shrinkable } from '../src/Shrinkable'

describe('primitive generators', () => {
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
        const numGenerations = 10000
        const generatedValues: number[] = []

        for (let i = 0; i < numGenerations; i++) {
            const value = gen.generate(rand).value
            generatedValues.push(value)
        }

        // Check that the generated values cover a reasonable range
        const minValue = Math.min(...generatedValues)
        const maxValue = Math.max(...generatedValues)

        // Assert that the minimum and maximum values are within a reasonable range
        expect(minValue).toBeGreaterThanOrEqual(-Number.MAX_VALUE)
        expect(maxValue).toBeLessThanOrEqual(Number.MAX_VALUE)

        // Define regions for checking distribution
        const regions = [
            { range: [-Number.MAX_VALUE, -1], count: 0 },
            { range: [-1, 0], count: 0 },
            { range: [0, 1], count: 0 },
            { range: [1, 10], count: 0 },
            { range: [10, 100], count: 0 },
            { range: [100, 1000], count: 0 },
            { range: [1000, Number.MAX_VALUE], count: 0 },
        ]

        // Count the number of generated values in each region
        generatedValues.forEach(value => {
            for (const region of regions) {
                if (value > region.range[0] && value <= region.range[1]) {
                    region.count++
                    break
                }
            }
        })
        // Check that the upper regions have more values than lower regions
        expect(regions[6].count).toBeGreaterThanOrEqual(regions[5].count) // More in (1000, MAX_VALUE] than in [100, 1000]
        expect(regions[5].count).toBeGreaterThanOrEqual(regions[4].count) // More in (100, 1000] than in [10, 100]
        expect(regions[4].count).toBeGreaterThanOrEqual(regions[3].count) // More in (10, 100] than in [1, 10]
        expect(regions[3].count).toBeGreaterThanOrEqual(regions[2].count) // More in (1, 10] than in [0, 1]
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
})

describe('container generators', () => {
    const rand = new Random()

    it('array', () => {
        const elemGen = Gen.interval(0, 5)
        const gen = Gen.array(elemGen, 5, 6)

        const numGenerations = 1000
        const set: Set<number> = new Set()

        for (let i = 0; i < numGenerations; i++) {
            const generatedArray = gen.generate(rand).value
            expect(generatedArray.length).toBeGreaterThanOrEqual(5)
            expect(generatedArray.length).toBeLessThanOrEqual(6)

            generatedArray.forEach(value => {
                expect(value).toBeGreaterThanOrEqual(0)
                expect(value).toBeLessThanOrEqual(5)
                set.add(value)
            })
        }

        // Check that all values from 0 to 5 are present
        for (let i = 0; i <= 5; i++) {
            expect(set.has(i)).toBe(true)
        }

        // TODO: check shrinking
    })

    it('set', () => {
        const elemGen = Gen.integers(0, 8)
        const gen = Gen.set(elemGen, 4, 8)

        // Use forAll to ensure the generated set meets the size requirements
        forAll((set: Set<number>) => {
            expect(set.size).toBeGreaterThanOrEqual(4)
            expect(set.size).toBeLessThanOrEqual(8)
            expect(Array.from(set).every(num => num >= 0 && num <= 8)).toBe(true) // Check element constraints
        }, gen)
    })

    it('dictionary', () => {
        const elemGen = Gen.interval(0, 4)
        const gen = Gen.dictionary(elemGen, 4, 8)

        // Use forAll to ensure the generated dictionary meets the size requirements
        forAll((dict: Record<string, number>) => {
            const size = Object.keys(dict).length
            expect(size).toBeGreaterThanOrEqual(4)
            expect(size).toBeLessThanOrEqual(8)
            expect(Object.values(dict).every(value => value >= 0 && value <= 4)).toBe(true) // Check value constraints
        }, gen)
    })

    it('tuple', () => {
        const numGen = Gen.interval(0, 3)
        const boolGen = Gen.boolean()
        const gen = Gen.tuple(numGen, boolGen)

        forAll(([num, bool]: [number, boolean]) => {
            expect(num).toBeGreaterThanOrEqual(0)
            expect(num).toBeLessThanOrEqual(3)
            expect(typeof bool).toBe('boolean')
        }, gen)
    })

    it('big tuple', () => {
        const numGen = Gen.interval(0, 3)
        const gens: Generator<number>[] = []
        for (let i = 0; i < 800; i++) gens.push(numGen)
        const gen = Gen.tuple(...gens)

        forAll((bigTuple: number[]) => {
            expect(bigTuple.length).toBe(800)
            expect(bigTuple.every(num => num >= 0 && num <= 3)).toBe(true) // Check element constraints
        }, gen)
    })

})

describe('combinators', () => {
    const rand = new Random()

    // Function to calculate the number of combinations of n items taken r at a time.
    // This is based on the combinatorial formula C(n, r) = n! / (r! * (n - r)!).
    // It returns the total number of unique ways to choose r items from a set of n items.
    const combination = (n: number, r: number) => {
        let result = 1
        for (let i = 1; i <= r; i++) {
            result *= n--
            result /= i
        }
        return result
    }

    // Function to calculate the total number of combinations for a given n and all possible r values
    // from 0 to maxR. This function sums the results of the combination function for each r.
    // It is useful for determining the total number of unique subsets that can be formed from a set
    // of size n, considering subsets of varying sizes up to maxR.
    const sumCombinations = (n: number, maxR: number) => {
        if (maxR < 0) return 0
        let result = 0
        for (let r = 0; r <= maxR; r++) result += combination(n, r)
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

        const upperBound = 10
        const minAndMaxSizeGen = Gen.interval(0, upperBound).chain((n: number) => Gen.interval(n, upperBound))

        forAll((minAndMaxSize: [number, number]) => {
            const elemGen = Gen.interval(0, 99)
            const [minSize, maxSize] = minAndMaxSize
            const gen = Gen.set(elemGen, minSize, maxSize)

            for (let i = 0; i < 3; i++) {
                const set: Set<string> = new Set([])
                let numTotal = 0
                const root = gen.generate(rand)
                exhaustive(root, 0, (shrinkable: Shrinkable<Set<number>>, _level: number) => {
                    numTotal++

                    // Check that the shrunk value adheres to the original constraints
                    expect(shrinkable.value.size).toBeGreaterThanOrEqual(minSize)
                    expect(shrinkable.value.size).toBeLessThanOrEqual(maxSize)
                    expect(Array.from(shrinkable.value).every(num => num >= 0 && num <= 99)).toBe(true) // Check element constraints

                    const str = JSONStringify(shrinkable.value)
                    if (set.has(str)) {
                        throw new Error(str + ' already exists in the shrinks')
                    }
                    set.add(str)
                })

                const size = root.value.size
                // Assert that the total number of unique shrinks generated matches the expected number of combinations.
                expect(numTotal).toBe(Math.pow(2, size) - sumCombinations(size, minSize - 1))
            }
        }, minAndMaxSizeGen)
    })

    it('Generator::filter', () => {
        const numGen = Gen.interval(0, 3)
        const tupleGen = numGen.filter(n => n === 3)

        forAll((value: number) => {
            expect(value).toBe(3)
        }, tupleGen)
    })

    it('Generator::flatMap', () => {
        const numGen = Gen.interval(0, 3)
        const tupleGen = numGen.flatMap(n =>
            Gen.tuple(
                Gen.just(n),
                Gen.just(2).map(v => v * n)
            )
        )

        forAll(([num, product]: [number, number]) => {
            expect(num).toBeGreaterThanOrEqual(0)
            expect(num).toBeLessThanOrEqual(3)
            expect(product).toBe(num * 2)
        }, tupleGen)
    })

    it('Generator::flatMap dependent sequence with array', () => {
        const gengen = (n: number) => Gen.interval(n, n + 1)
        let gen1 = gengen(0)

        for (let i = 1; i < 20; i++) {
            gen1 = gen1.flatMap(num => gengen(num))
        }

        forAll((value: number) => {
            expect(value).toBeGreaterThanOrEqual(0)
            expect(value).toBeLessThanOrEqual(20) // Adjust based on the expected range
        }, gen1)
    })

    it('Generator::aggregate', () => {
        let gen1 = Gen.interval(0, 1).map(num => [num])
        const gen = gen1.aggregate(
            nums => {
                const last = nums[nums.length - 1]
                return Gen.interval(last, last + 1).map(num => [...nums, num])
            },
            2,
            4
        )

        forAll((generatedArray: number[]) => {
            expect(generatedArray.length).toBeGreaterThanOrEqual(2)
            expect(generatedArray.length).toBeLessThanOrEqual(4)
            expect(generatedArray.every((num, index) => index === 0 || num >= generatedArray[index - 1])).toBe(true) // Ensure non-decreasing order
        }, gen)
    })

    it('Generator::accumulate', () => {
        let gen1: Generator<number> = Gen.interval(0, 0 + 2)
        const gen: Generator<number[]> = gen1.accumulate(num => Gen.interval(num, num + 2), 2, 4)

        forAll((generatedArray: number[]) => {
            expect(generatedArray.length).toBeGreaterThanOrEqual(2)
            expect(generatedArray.length).toBeLessThanOrEqual(4)
            expect(generatedArray.every((num, index) => index === 0 || num >= generatedArray[index - 1])).toBe(true) // Ensure non-decreasing order
        }, gen)
    })

    it('Generator::accumulate many', () => {
        let gen1: Generator<number> = Gen.interval(0, 0 + 2)
        const gen: Generator<number[]> = gen1.accumulate(num => Gen.interval(num, num + 2), 2, 4)

        // Use forAll to ensure the generated arrays meet the size requirements
        forAll((_nums: number[]): void => {
            expect(_nums.length).toBeGreaterThanOrEqual(2)
            expect(_nums.length).toBeLessThanOrEqual(4)
            expect(_nums.every((num, index) => index === 0 || num >= _nums[index - 1])).toBe(true) // Ensure non-decreasing order
        }, gen)
    })
})
