import { forAll, Gen } from '../src'

// function print<T>(rand: Random, generator: Generator<T>, num: number = 50) {
//     const arr: string[] = []
//     for (let i = 0; i < num; i++) arr.push('{' + generator.generate(rand).value + '}')

//     console.log(arr.toString())
// }

describe('combinator', () => {
    it('oneOf', () => {
        const numGen1 = Gen.interval(1, 3)
        const numGen2 = Gen.interval(6, 8)
        const gen1 = Gen.oneOf(numGen1, numGen2)
        let countGen1 = 0
        let countGen2 = 0
        forAll((num: number) => {
            expect(num).toBeGreaterThanOrEqual(1)
            expect(num).toBeLessThanOrEqual(8)
            expect(num > 3 && num < 6).toBe(false)
            if (num >= 1 && num <= 3) countGen1++
            else countGen2++
        }, gen1)
        expect(countGen1 / (countGen1 + countGen2)).toBeGreaterThan(0.4)
        expect(countGen1 / (countGen1 + countGen2)).toBeLessThan(0.6)
    })

    it('oneOf weighted', () => {
        const numGen1 = Gen.interval(1, 3)
        const numGen2 = Gen.interval(6, 8)
        const gen2 = Gen.oneOf(Gen.weightedGen(numGen1, 0.8), numGen2)
        let countGen1 = 0
        let countGen2 = 0
        forAll((num: number) => {
            expect(num).toBeGreaterThanOrEqual(1)
            expect(num).toBeLessThanOrEqual(8)
            expect(num > 3 && num < 6).toBe(false)
            if (num >= 1 && num <= 3) countGen1++
            else countGen2++
        }, gen2)
        expect(countGen1 / (countGen1 + countGen2)).toBeGreaterThan(0.7)
        expect(countGen1 / (countGen1 + countGen2)).toBeLessThan(0.9)
    })

    it('elementOf', () => {
        const gen1 = Gen.elementOf<number>(2, 10, -1, 7)
        let count2 = 0
        let countAll = 0
        forAll((num: number) => {
            expect([2, 10, -1, 7]).toContain(num)
            if (num === 2) count2++
            countAll++
        }, gen1)
        expect(count2 / countAll).toBeGreaterThan(0.1)
        expect(count2 / countAll).toBeLessThan(0.3)
    })

    it('elementOf weighted', () => {
        const gen2 = Gen.elementOf<number>(Gen.weightedValue(1, 0.8), 10)
        let count1 = 0
        let count10 = 0
        forAll((num: number) => {
            expect([1, 10]).toContain(num)
            if (num === 1) count1++
            else count10++
        }, gen2)
        expect(count1 / (count1 + count10)).toBeGreaterThan(0.7)
        expect(count1 / (count1 + count10)).toBeLessThan(0.9)
    })

    class Cat {
        constructor(readonly a: number, readonly b: string) {}

        toString(): string {
            return `a: ${this.a}, b: ${this.b}`
        }
    }

    it('construct', () => {
        const catGen = Gen.construct(Cat, Gen.interval(1, 3), Gen.elementOf<string>('Cat', 'Kitten'))

        forAll((cat: Cat) => {
            expect(cat.a).toBeGreaterThanOrEqual(1)
            expect(cat.a).toBeLessThanOrEqual(3)
            expect(['Cat', 'Kitten']).toContain(cat.b)
        }, catGen)
    })

    it('chainTuple', () => {
        const numGen1 = Gen.interval(1, 3)
        const pairGen = numGen1.chain(num => Gen.interval(0, num))
        const tripleGen = Gen.chainTuple(pairGen, pair => Gen.interval(0, pair[1]))
        const quadGen = Gen.chainTuple(tripleGen, triple => Gen.interval(0, triple[2]))
        forAll((quad: [number, number, number, number]) => {
            expect(quad[0]).toBeGreaterThanOrEqual(1)
            expect(quad[0]).toBeLessThanOrEqual(3)
            expect(quad[1]).toBeGreaterThanOrEqual(0)
            expect(quad[1]).toBeLessThanOrEqual(quad[0])
            expect(quad[2]).toBeGreaterThanOrEqual(0)
            expect(quad[2]).toBeLessThanOrEqual(quad[1])
            expect(quad[3]).toBeGreaterThanOrEqual(0)
            expect(quad[3]).toBeLessThanOrEqual(quad[2])
        }, quadGen)
    })

    it('chainAsTuple', () => {
        const numGen1 = Gen.interval(1, 3)
        const quadGen = numGen1
            .chain(num => Gen.interval(0, num))
            .chainAsTuple((pair: [number, number]) => Gen.interval(0, pair[1]))
            .chainAsTuple((triple: [number, number, number]) => Gen.interval(0, triple[2]))

        forAll((quad: [number, number, number, number]) => {
            expect(quad[0]).toBeGreaterThanOrEqual(1)
            expect(quad[0]).toBeLessThanOrEqual(3)
            expect(quad[1]).toBeGreaterThanOrEqual(0)
            expect(quad[1]).toBeLessThanOrEqual(quad[0])
            expect(quad[2]).toBeGreaterThanOrEqual(0)
            expect(quad[2]).toBeLessThanOrEqual(quad[1])
            expect(quad[3]).toBeGreaterThanOrEqual(0)
            expect(quad[3]).toBeLessThanOrEqual(quad[2])
        }, quadGen)
    })
})
