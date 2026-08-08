/**
 * Contract: property runner tests should assert reusable behavior, not only
 * that examples run. A passing test must say something concrete about generation,
 * shrinking, replay, reporting, or statistical classification.
 *
 * Scope: this file covers cross-cutting runner/generator laws for seed replay,
 * shrink-domain preservation, failure reporting, time budgets, option
 * validation, and frontier-profile execution. Seed replay checks generate
 * no-shrink seeds as part of the property domain instead of pinning named seed
 * constants.
 *
 * Helpers: local helpers intentionally capture observable traces and bounded shrink
 * tree prefixes. They avoid inspecting private runner state, so the tests remain
 * black-box checks over the public API surface.
 */

import { Arbitrary, Gen, Property, Random, Shrinkable, stat, Stream } from '../src'
import {
    collectSeededTrace,
    expectShrinkTreeValues,
    expectThrownMessage,
    distinctSeedPairGen,
    seedGen,
} from './helpers'
import { DOMAINS, RUNS, SAMPLES, SIZES, TIME_BUDGETS } from './run-config'

describe('property runner contracts', () => {
    it('same generated seed reproduces generated values and shrink-tree prefixes', () => {
        const gen = Gen.array({
            elemGen: Gen.interval(DOMAINS.replayElement.min, DOMAINS.replayElement.max).chain(n =>
                Gen.interval(Math.min(0, n), Math.max(0, n))
            ),
            minSize: SIZES.nonEmptySmallTrace.min,
            maxSize: SIZES.nonEmptySmallTrace.max,
        })

        const property = new Property((seed: number) => {
            const first = collectSeededTrace(gen, seed, SAMPLES.replayTrace)
            const second = collectSeededTrace(gen, seed, SAMPLES.replayTrace)

            expect(second).toEqual(first)
        })

        expect(property.example(DOMAINS.seed.min)).toBe(true)

        property
            .setConfig({ numRuns: RUNS.seedReplay })
            .forAll(seedGen)
    })

    it('different generated seeds explore a different trace for a mixed generator', () => {
        const gen = Gen.oneOf(
            Gen.interval(DOMAINS.wideSigned.min, -1).map(n => ({ kind: 'negative', n })),
            Gen.interval(0, DOMAINS.wideSigned.max).map(n => ({ kind: 'nonnegative', n }))
        )
        const property = new Property(([firstSeed, secondSeed]: [number, number]) => {
            const first = collectSeededTrace(gen, firstSeed, SAMPLES.mixedSeedTrace)
            const second = collectSeededTrace(gen, secondSeed, SAMPLES.mixedSeedTrace)

            expect(second.values).not.toEqual(first.values)
        })

        expect(property.example([DOMAINS.seed.min, DOMAINS.seed.min + 1])).toBe(true)

        property
            .setConfig({ numRuns: RUNS.seedReplay })
            .forAll(distinctSeedPairGen)
    })

    it('filtered container shrinks stay inside the promised domain', () => {
        const gen = Gen.array({
            elemGen: Gen.interval(DOMAINS.filteredMultiple.min, DOMAINS.filteredMultiple.max)
                .filter(n => n % DOMAINS.filteredMultiple.divisor === 0),
            minSize: SIZES.filteredContainer.min,
            maxSize: SIZES.filteredContainer.max,
        }).filter(values => values.reduce((sum, value) => sum + value, 0) % 3 === 0)

        const root = gen.generate(new Random())
        const visited = expectShrinkTreeValues(
            root,
            values =>
                values.length >= SIZES.filteredContainer.min &&
                values.length <= SIZES.filteredContainer.max &&
                values.every(value => value % DOMAINS.filteredMultiple.divisor === 0) &&
                values.reduce((sum, value) => sum + value, 0) % DOMAINS.filteredMultiple.divisor === 0
        )

        expect(visited).toBeGreaterThan(1)
    })

    it('negative property reports a boundary counterexample after shrinking', () => {
        function boundaryShrinkable(value: number): Shrinkable<number> {
            if (value === 100) return new Shrinkable(100, () => Stream.one(boundaryShrinkable(10)))
            if (value === 10) return new Shrinkable(10, () => Stream.two(new Shrinkable(5), new Shrinkable(4)))
            return new Shrinkable(value)
        }
        const boundaryGen = new Arbitrary<number>(() => boundaryShrinkable(100))

        const property = new Property((n: number) => n < 5)
        expect(property.example(100)).toBe(false)

        const message = expectThrownMessage(() => {
            property
                .setConfig({ numRuns: RUNS.tiny })
                .forAll(boundaryGen)
        })

        expect(message).toContain('simplest args found by shrinking')
        expect(message).toContain('[5]')
    })

    it('time budgets stop before starting or before the configured run count is exhausted', () => {
        let exhaustedRuns = 0
        const exhaustedProperty = new Property((value: number) => {
            exhaustedRuns++
            expect(value).toBe(1)
        })

        expect(exhaustedProperty.example(1)).toBe(true)
        exhaustedRuns = 0

        expect(
            exhaustedProperty
                .setConfig({ numRuns: RUNS.contract, maxDurationMs: TIME_BUDGETS.exhaustedMs })
                .forAll(Gen.just(1))
        ).toBe(true)
        expect(exhaustedRuns).toBe(0)

        let boundedRuns = 0
        const boundedProperty = new Property((value: number) => {
            boundedRuns++
            expect(value).toBe(1)
            const startedAt = Date.now()
            while (Date.now() - startedAt < TIME_BUDGETS.busyWaitPerRunMs) {
                // Consume wall-clock time so the runner can observe the budget.
            }
        })

        expect(boundedProperty.example(1)).toBe(true)
        boundedRuns = 0

        expect(
            boundedProperty
                .setConfig({ numRuns: RUNS.contract, maxDurationMs: TIME_BUDGETS.shortMs })
                .forAll(Gen.just(1))
        ).toBe(true)
        expect(boundedRuns).toBeGreaterThan(0)
        expect(boundedRuns).toBeLessThan(RUNS.contract)
    })

    it('runner option validators reject invalid time, retry, and stream settings', () => {
        const property = new Property((_value: number) => true)
        expect(property.example(1)).toBe(true)

        expect(() => property.setMaxDurationMs(-1)).toThrow(/finite non-negative/)
        expect(() => property.setMaxDurationMs(Number.NaN)).toThrow(/finite non-negative/)
        expect(() => property.setShrinkMaxRetries(-1)).toThrow(/non-negative integer/)
        expect(() => property.setShrinkMaxRetries(1.5)).toThrow(/non-negative integer/)
        expect(() => property.setShrinkTimeoutMs(-1)).toThrow(/finite non-negative/)
        expect(() => property.setShrinkRetryTimeoutMs(Number.NaN)).toThrow(/finite non-negative/)
        expect(() => property.setOutputStream({} as { write(message: string): void })).toThrow(/write/)
        expect(() => property.setErrorStream({} as { write(message: string): void })).toThrow(/write/)
    })

    type Profile = {
        name: string
        minSize: number
        maxSize: number
        elemMin: number
        elemMax: number
        frontier: boolean
    }

    const common: Profile = {
        name: 'common-small',
        minSize: 0,
        maxSize: 3,
        elemMin: -5,
        elemMax: 5,
        frontier: false,
    }
    const edge: Profile = { name: 'edge-fixed', minSize: 4, maxSize: 4, elemMin: 0, elemMax: 1, frontier: true }
    const wide: Profile = {
        name: 'frontier-wide',
        minSize: 1,
        maxSize: 8,
        elemMin: -1000,
        elemMax: 1000,
        frontier: true,
    }
    const profileGen = Gen.elementOf(
        Gen.weightedValue(common, 0.15),
        Gen.weightedValue(edge, 0.35),
        Gen.weightedValue(wide, 0.5)
    )

    it('frontier profile generation spends most runs outside the common-valid control group', () => {
        const property = new Property((profile: Profile) => {
            stat('frontier-profile', profile.frontier)
            expect([common.name, edge.name, wide.name]).toContain(profile.name)
        })

        property.matrix([common, edge, wide])

        property
            .setConfig({ numRuns: RUNS.contract })
            .assertStatGe('frontier-profile', 0.7)
            .forAll(profileGen)
    })

    it('frontier profiles shape nested trace exploration for every named profile', () => {
        new Property((profile: Profile) => {
            const gen = Gen.array({
                elemGen: Gen.interval(profile.elemMin, profile.elemMax),
                minSize: profile.minSize,
                maxSize: profile.maxSize,
            })

            const property = new Property((seed: number) => {
                const trace = collectSeededTrace(gen, seed, SAMPLES.nestedTrace)

                expect(trace.values.length).toBe(SAMPLES.nestedTrace)
                trace.values.forEach(values => {
                    expect(values.length).toBeGreaterThanOrEqual(profile.minSize)
                    expect(values.length).toBeLessThanOrEqual(profile.maxSize)
                    values.forEach(value => {
                        expect(value).toBeGreaterThanOrEqual(profile.elemMin)
                        expect(value).toBeLessThanOrEqual(profile.elemMax)
                    })
                })
            })

            expect(property.example(DOMAINS.seed.min)).toBe(true)

            property
                .setConfig({ numRuns: RUNS.frontierInner })
                .forAll(seedGen)
        })
            .matrix([common, edge, wide])
    })
})
