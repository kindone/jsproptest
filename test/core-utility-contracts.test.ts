/**
 * Contract: low-level utility types used by the runner should preserve their
 * public algebra: streams are lazy ordered sequences, shrinkables transform
 * shrink trees coherently, seeded randomness replays, and Option/Either/Try
 * preserve success/failure branches through map and flatMap.
 *
 * Scope: this file covers public behavior for Random, Stream, Shrinkable,
 * Option, Either, and Try. Exact serialized shrink-tree composition examples
 * live in `shrinkable-composition-compatibility.test.ts`.
 *
 * Helpers: stream and shrink helpers observe public iterators and shrink streams
 * only. Seed behavior is tested with generated no-shrink seeds.
 */

import { Gen, Property, Random, Shrinkable, Stream } from '../src'
import { None, Some } from '../src/Option'
import { Left, Right } from '../src/Either'
import { Try } from '../src/Try'
import { directShrinkValues, seedGen, seededRandom, streamFromValues, streamToValues } from './helpers'
import { DOMAINS, RUNS, SAMPLES, SIZES } from './run-config'

const probabilitySmoke = {
    cases: [0.1, 0.5, 0.9],
    margin: 0.18,
}

describe('core utility contracts', () => {
    it('Random clone and same-seed construction replay the same generated sequence', () => {
        const property = new Property((seed: number) => {
            const first = seededRandom(seed)
            const second = seededRandom(seed)

            expect(Array.from({ length: SAMPLES.integerValues }, () => second.nextInt()))
                .toEqual(Array.from({ length: SAMPLES.integerValues }, () => first.nextInt()))

            const random = seededRandom(seed)
            random.nextBoolean()
            random.nextInt()
            const clone = random.clone()

            expect(clone.nextNumber()).toBe(random.nextNumber())
            expect(clone.nextLong()).toBe(random.nextLong())
        })

        expect(property.example(DOMAINS.seed.min)).toBe(true)

        property
            .setConfig({ numRuns: RUNS.coreSeedReplay })
            .forAll(seedGen)
    })

    it('Random inRange stays inside the half-open interval for generated bounds', () => {
        const boundsGen = Gen.interval(DOMAINS.wideSigned.min, DOMAINS.wideSigned.max)
            .chain(min => Gen.interval(min + 1, min + 50))

        const property = new Property(([min, max]: [number, number]) => {
            const random = new Random()
            const values = Array.from({ length: SAMPLES.integerValues }, () => random.inRange(min, max))

            expect(values.every(value => Number.isInteger(value))).toBe(true)
            expect(values.every(value => value >= min && value < max)).toBe(true)
            expect(new Set(values).size).toBeGreaterThan(0)
        })

        expect(property.example([0, 10])).toBe(true)

        property
            .setConfig({ numRuns: RUNS.seedReplay })
            .forAll(boundsGen)
    })

    it('Random boundary-probability APIs stay near their requested ratios', () => {
        const property = new Property((probability: number) => {
            const random = new Random()
            const longBounds = new Set(Random.LONG_BOUNDS)
            const intBounds = new Set(Random.INT_BOUNDS)

            const booleanRatio = Array.from(
                { length: SAMPLES.distributionValues },
                () => random.nextBoolean(probability)
            ).filter(Boolean).length / SAMPLES.distributionValues
            expect(Math.abs(booleanRatio - probability)).toBeLessThan(probabilitySmoke.margin)

            const longRatio = Array.from(
                { length: SAMPLES.distributionValues },
                () => random.nextLong(probability)
            ).filter(value => longBounds.has(value)).length / SAMPLES.distributionValues
            expect(Math.abs(longRatio - probability)).toBeLessThan(probabilitySmoke.margin)

            const intRatio = Array.from(
                { length: SAMPLES.distributionValues },
                () => random.nextInt(probability)
            ).filter(value => intBounds.has(value)).length / SAMPLES.distributionValues
            expect(Math.abs(intRatio - probability)).toBeLessThan(probabilitySmoke.margin)
        })

        property.matrix(probabilitySmoke.cases)
    })

    it('Stream preserves ordered sequence semantics for concat, filter, take, and transform', () => {
        const property = new Property((values: number[]) => {
            const stream = streamFromValues(values)

            expect(streamToValues(stream)).toEqual(values)
            expect(streamToValues(stream.filter(value => value % 2 === 0))).toEqual(values.filter(value => value % 2 === 0))
            expect(streamToValues(stream.take(SIZES.emptyToSmall.max))).toEqual(values.slice(0, SIZES.emptyToSmall.max))
            expect(streamToValues(stream.transform(value => value * 2))).toEqual(values.map(value => value * 2))
        })

        property.matrix([
            [],
            [1],
            [1, 2, 3, 4, 5, 6],
        ])

        property
            .setConfig({ numRuns: RUNS.contract })
            .forAll(
                Gen.array(
                    Gen.interval(DOMAINS.replayElement.min, DOMAINS.replayElement.max),
                    SIZES.emptyToMedium.min,
                    SIZES.emptyToMedium.max
                )
            )
    })

    it('Stream string representations remain stable for simple public constructors and limits', () => {
        const many = streamFromValues(Array.from({ length: 20 }, (_, index) => index))
        const transformed = streamFromValues(Array.from({ length: 5 }, (_, index) => index)).transform(value => value * 2)

        expect(Stream.empty<number>().toString()).toBe('Stream()')
        expect(Stream.one(1).toString()).toBe('Stream(1)')
        expect(Stream.two(1, 2).toString()).toBe('Stream(1, 2)')
        expect(Stream.three(1, 2, 3).toString()).toBe('Stream(1, 2, 3)')
        expect(many.toString(10)).toBe('Stream(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ...)')
        expect(many.take(5).toString()).toBe('Stream(0, 1, 2, 3, 4)')
        expect(transformed.toString()).toBe('Stream(0, 2, 4, 6, 8)')
    })

    it('Shrinkable map, filter, and flatMap transform direct shrink candidates coherently', () => {
        const property = new Property((root: number) => {
            const shrinkable = new Shrinkable(root, () =>
                Stream.two(new Shrinkable(root - 1), new Shrinkable(root - 2))
            )

            expect(directShrinkValues(shrinkable.map(value => value + 10)))
                .toEqual([root + 9, root + 8])

            expect(directShrinkValues(shrinkable.filter(value => value >= root - 1)))
                .toEqual([root - 1])

            expect(directShrinkValues(shrinkable.flatMap(value => new Shrinkable(value * 2))))
                .toEqual([(root - 1) * 2, (root - 2) * 2])
        })

        property.matrix([-1, 0, 7])

        property
            .setConfig({ numRuns: RUNS.contract })
            .forAll(Gen.interval(DOMAINS.wideSigned.min, DOMAINS.wideSigned.max))
    })

    it('Shrinkable child lookup and path retrieval expose public shrink navigation', () => {
        const shrinkable = new Shrinkable(4, () =>
            Stream.three(
                new Shrinkable(0),
                new Shrinkable(2, () => Stream.one(new Shrinkable(1))),
                new Shrinkable(3)
            )
        )

        expect(directShrinkValues(shrinkable)).toEqual([0, 2, 3])
        expect(shrinkable.getNthChild(0).value).toBe(0)
        expect(shrinkable.getNthChild(1).value).toBe(2)
        expect(shrinkable.getNthChild(2).value).toBe(3)
        expect(() => shrinkable.getNthChild(-1)).toThrow()
        expect(() => shrinkable.getNthChild(3)).toThrow()

        expect(shrinkable.retrieve([])).toBe(shrinkable)
        expect(shrinkable.retrieve([1]).value).toBe(2)
        expect(shrinkable.retrieve([1, 0]).value).toBe(1)
        expect(() => shrinkable.retrieve([-1])).toThrow()
        expect(() => shrinkable.retrieve([1, 1])).toThrow()
        expect(() => shrinkable.filter(value => value > 10)).toThrow()
    })

    it('Option, Either, and Try preserve branch semantics through map and flatMap', () => {
        const property = new Property((value: number) => {
            const some = Some(value)
            const none = None<number>()

            expect(some.isEmpty()).toBe(false)
            expect(none.isEmpty()).toBe(true)
            expect(some.map(v => v + 1).get()).toBe(value + 1)
            expect(none.map(v => v + 1).isEmpty()).toBe(true)
            expect(some.flatMap(v => Some(v * 2)).get()).toBe(value * 2)
            expect(some.flatMap(_ => None()).isEmpty()).toBe(true)
            expect(some.filter(v => v === value).isEmpty()).toBe(false)
            expect(some.filter(v => v !== value).isEmpty()).toBe(true)
            expect(none.filter(_ => true).isEmpty()).toBe(true)

            const right = Right<number, Error>(value)
            const left = Left<Error, number>(new Error('left'))

            expect(right.isRight()).toBe(true)
            expect(right.isLeft()).toBe(false)
            expect(left.isLeft()).toBe(true)
            expect(left.isRight()).toBe(false)
            expect(right.getRight()).toBe(value)
            expect(left.getLeft().message).toBe('left')
            expect(() => right.getLeft()).toThrow()
            expect(() => left.getRight()).toThrow()
            expect(right.map(v => v + 1).getRight()).toBe(value + 1)
            expect(left.map(v => v + 1).isLeft()).toBe(true)
            expect(right.flatMap(v => Right<number, Error>(v * 2)).getRight()).toBe(value * 2)
            expect(left.flatMap(v => Right<number, Error>(v * 2)).isLeft()).toBe(true)
            expect(right.filterOrElse(v => v === value, new Error('filtered')).getRight()).toBe(value)
            expect(right.filterOrElse(v => v !== value, new Error('filtered')).isLeft()).toBe(true)
            expect(left.filterOrElse(_ => true, new Error('filtered')).isLeft()).toBe(true)

            const success = Try(() => value)
            const failure = Try<number>(() => {
                throw new Error('failure')
            })

            expect(success.isSuccessful()).toBe(true)
            expect(success.isFailure()).toBe(false)
            expect(failure.isFailure()).toBe(true)
            expect(failure.isSuccessful()).toBe(false)
            expect(success.map(v => v + 1).get()).toBe(value + 1)
            expect(failure.map(v => v + 1).isFailure()).toBe(true)
            expect(success.flatMap(v => Try(() => v * 2)).get()).toBe(value * 2)
            expect(failure.flatMap(v => Try(() => v * 2)).isFailure()).toBe(true)
        })

        property.matrix([-1, 0, 7])

        property
            .setConfig({ numRuns: RUNS.contract })
            .forAll(Gen.interval(DOMAINS.wideSigned.min, DOMAINS.wideSigned.max))
    })
})
