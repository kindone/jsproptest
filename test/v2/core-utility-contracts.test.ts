/**
 * Contract: low-level utility types used by the runner should preserve their
 * public algebra: streams are lazy ordered sequences, shrinkables transform
 * shrink trees coherently, seeded randomness replays, and Option/Either/Try
 * preserve success/failure branches through map and flatMap.
 *
 * Scope: this file starts the replacement track for `random.test.ts`,
 * `stream.test.ts`, `shrinkable.test.ts`, and the stable Option/Either/Try
 * section of `lib.test.ts`. Exact serialized shrink-tree examples remain in the
 * legacy tests until a later review decides whether they are API promises or
 * implementation-sensitive regressions.
 *
 * Helpers: stream and shrink helpers observe public iterators and shrink streams
 * only. Seed behavior is tested with generated no-shrink seeds.
 */

import { Gen, Property, Random, Shrinkable, Stream } from '../../src'
import { None, Some } from '../../src/Option'
import { Left, Right } from '../../src/Either'
import { Try } from '../../src/Try'
import { directShrinkValues, seedGen, seededRandom, streamFromValues, streamToValues } from './helpers'
import { DOMAINS, RUNS, SAMPLES, SIZES } from './run-config'

describe('v2 core utility contracts', () => {
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

    it('Option, Either, and Try preserve branch semantics through map and flatMap', () => {
        const property = new Property((value: number) => {
            const some = Some(value)
            const none = None<number>()

            expect(some.map(v => v + 1).get()).toBe(value + 1)
            expect(none.map(v => v + 1).isEmpty()).toBe(true)
            expect(some.flatMap(v => Some(v * 2)).get()).toBe(value * 2)
            expect(some.flatMap(_ => None()).isEmpty()).toBe(true)

            const right = Right<number, Error>(value)
            const left = Left<Error, number>(new Error('left'))

            expect(right.map(v => v + 1).getRight()).toBe(value + 1)
            expect(left.map(v => v + 1).isLeft()).toBe(true)
            expect(right.flatMap(v => Right<number, Error>(v * 2)).getRight()).toBe(value * 2)
            expect(left.flatMap(v => Right<number, Error>(v * 2)).isLeft()).toBe(true)

            const success = Try(() => value)
            const failure = Try<number>(() => {
                throw new Error('failure')
            })

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
