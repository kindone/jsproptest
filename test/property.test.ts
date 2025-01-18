import { Arbitrary } from '../src/Generator'
import { Gen } from '../src'
import { Property, forAll } from '../src/Property'
import { Random } from '../src/Random'
import { Shrinkable } from '../src/Shrinkable'

describe('property', () => {
    it('regression 1: no shrinking possible', () => {
        const prop = new Property((a: number, b: string) => {
            return a < 10 || b.length > 3
        })

        expect(() => prop.setNumRuns(1000).forAll(Gen.interval(0, 10), Gen.string(0, 10))).toThrow()
    })

    it('basic with return', () => {
        const genNumber = new Arbitrary((random: Random) => {
            return new Shrinkable<number>(random.nextInt())
        })

        const arr: Array<Array<number>> = []
        const prop = new Property((a: number, b: number) => {
            arr.push([a, b])
            return true
        })

        prop.forAll(genNumber, genNumber)
        prop.example(6, 7)

        console.log(arr.toString())
    })

    it('basic without return', () => {
        const genNumber = new Arbitrary((random: Random) => {
            return new Shrinkable<number>(random.nextInt())
        })

        const arr: Array<Array<number>> = []
        const prop = new Property((a: number, b: number) => {
            arr.push([a, b])
        })

        prop.forAll(genNumber, genNumber)
        prop.example(6, 7)

        console.log(arr.toString())
    })

    it('shrink', () => {
        const numGen = Gen.interval(0, 1000)
        const prop = new Property((a: number, b: number) => {
            return a > 80 || b < 40
        })

        expect(() => prop.forAll(numGen, numGen)).toThrow()
    })

    it('shrink2', () => {
        const numGen = Gen.interval(0, 1000)
        const prop = new Property((a: number, b: number) => {
            expect(a > 80 || b < 40).toBe(true)
        })

        expect(() => prop.forAll(numGen, numGen)).toThrow()
    })

    it('shrink3', () => {
        const prop = new Property((arg: [number, number]) => arg[1] - arg[0] <= 5)
        const numGen = Gen.interval(-1000000, 1000000)
        const tupleGen = numGen.flatMap(num => Gen.tuple(numGen, Gen.just(num)))
        expect(() => prop.forAll(tupleGen)).toThrow()
    })

    it('nested shrink 1', () => {
        expect(() =>
            forAll((a: number) => {
                forAll((a: number) => {
                    return a > 80
                }, Gen.just(a))
            }, Gen.interval(0, 1000))
        ).toThrow()
    })

    it('nested shrink 2', () => {
        expect(() =>
            forAll((a: number) => {
                forAll((_: number) => {
                    throw new Error('error!')
                }, Gen.just(a))
            }, Gen.interval(0, 1000))
        ).toThrow()
    })

    it('fastcheck shrink scenario 1', () => {

        expect(() =>
            forAll((tup:[number, number]) => {
                return tup[1] - tup[0] <= 5
            }, Gen.tuple(Gen.interval(0, 100000), Gen.interval(0, 100000)).map(([v1, v2]) => ([v1 < v2 ? v1 : v2, v1 < v2 ? v2 : v1])))
        ).toThrow()
    })

    it('fastcheck shrink scenario 2', () => {
        expect(() =>
            forAll((tup:[number, number]) => {
                return tup[1] - tup[0] <= 5
            }, Gen.interval(0, 100000).flatMap((a:number) => Gen.tuple(Gen.interval(0, a), Gen.just(a))))
        ).toThrow()
    })
})
