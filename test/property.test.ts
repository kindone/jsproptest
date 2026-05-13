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

        prop.example(6, 7)
        expect(arr.length).toBe(1)
        expect(arr[0]).toEqual([6, 7])

        prop.forAll(genNumber, genNumber)
    })

    it('basic without return', () => {
        const genNumber = new Arbitrary((random: Random) => {
            return new Shrinkable<number>(random.nextInt())
        })

        const arr: Array<Array<number>> = []
        const prop = new Property((a: number, b: number) => {
            arr.push([a, b])
        })

        prop.example(6, 7)
        expect(arr.length).toBe(1)
        expect(arr[0]).toEqual([6, 7])

        prop.forAll(genNumber, genNumber)

    })

    it('maxDurationMs stops before starting runs when the time budget is exhausted', () => {
        let runs = 0
        const prop = new Property((value: number) => {
            runs++
            expect(value).toBe(1)
        })

        expect(prop.setNumRuns(100).setMaxDurationMs(0).forAll(Gen.just(1))).toBe(true)
        expect(runs).toBe(0)
    })

    it('maxDurationMs stops starting new runs after the wall-clock budget', () => {
        let runs = 0
        const prop = new Property((value: number) => {
            runs++
            expect(value).toBe(1)
            const startedAt = Date.now()
            while (Date.now() - startedAt < 5) {
                // Consume enough wall-clock time for the runner to observe the budget.
            }
        })

        expect(prop.setNumRuns(100).setMaxDurationMs(20).forAll(Gen.just(1))).toBe(true)
        expect(runs).toBeGreaterThan(0)
        expect(runs).toBeLessThan(100)
    })

    it('maxDurationMs validates the configured budget', () => {
        const prop = new Property((_value: number) => true)

        expect(() => prop.setMaxDurationMs(-1)).toThrow(/finite non-negative/)
        expect(() => prop.setMaxDurationMs(Number.NaN)).toThrow(/finite non-negative/)
    })

    it('shrink retry options collect reproduction stats and write shrink output', () => {
        const stats: Array<{ numReproduced: number; totalRuns: number; elapsedSec: number; argsAsString: string }> = []
        const output: string[] = []
        const prop = new Property((value: number) => {
            return value < 6
        })

        expect(() =>
            prop
                .setNumRuns(1)
                .setSeed('42')
                .setShrinkMaxRetries(2)
                .setShrinkTimeoutMs(1000)
                .setShrinkRetryTimeoutMs(1000)
                .setOutputStream({ write: message => output.push(message) })
                .setOnReproductionStats(item => stats.push(item))
                .forAll(Gen.interval(6, 10))
        ).toThrow()

        expect(stats.length).toBeGreaterThan(0)
        expect(stats.every(item => item.totalRuns === 3)).toBe(true)
        expect(stats.some(item => item.numReproduced > 0)).toBe(true)
        expect(output.join('')).toContain('shrinking found simpler failing arg')
    })

    it('shrink parity options validate configured values', () => {
        const prop = new Property((_value: number) => true)

        expect(() => prop.setShrinkMaxRetries(-1)).toThrow(/non-negative integer/)
        expect(() => prop.setShrinkMaxRetries(1.5)).toThrow(/non-negative integer/)
        expect(() => prop.setShrinkTimeoutMs(-1)).toThrow(/finite non-negative/)
        expect(() => prop.setShrinkRetryTimeoutMs(Number.NaN)).toThrow(/finite non-negative/)
        expect(() => prop.setOutputStream({} as { write(message: string): void })).toThrow(/write/)
        expect(() => prop.setErrorStream({} as { write(message: string): void })).toThrow(/write/)
    })

    it('shrink 1', () => {
        const numGen = Gen.interval(0, 1000)
        const prop = new Property((a: number, b: number) => {
            return a > 80 || b < 40
        })

        expect(() => prop.forAll(numGen, numGen)).toThrow()
    })

    it('shrink 2', () => {
        const numGen = Gen.interval(0, 1000)
        const prop = new Property((a: number, b: number) => {
            expect(a > 80 || b < 40).toBe(true)
        })

        expect(() => prop.forAll(numGen, numGen)).toThrow()
    })

    it('shrink 3', () => {
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
            forAll(
                (tup: [number, number]) => {
                    return tup[1] - tup[0] <= 5
                },
                Gen.tuple(Gen.interval(0, 100000), Gen.interval(0, 100000)).map(([v1, v2]) => [
                    v1 < v2 ? v1 : v2,
                    v1 < v2 ? v2 : v1,
                ])
            )
        ).toThrow()
    })

    it('fastcheck shrink scenario 2', () => {
        expect(() =>
            forAll(
                (tup: [number, number]) => {
                    return tup[1] - tup[0] <= 5
                },
                Gen.interval(0, 100000).flatMap((a: number) => Gen.tuple(Gen.interval(0, a), Gen.just(a)))
            )
        ).toThrow()
    })
})
