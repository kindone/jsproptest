/**
 * Contract: public generator and combinator APIs should generate values inside
 * their declared domains while preserving dependent constraints. Distribution
 * checks are loose smoke contracts, not exact probability proofs.
 *
 * Scope: this file promotes the strongest domain and combinator checks from
 * `generator.test.ts`, `generator.config.test.ts`, and `combinator.test.ts`.
 * Legacy dependent-shrink regressions live in `generator-shrink-reachability`.
 *
 * Helpers: sampling helpers use the public `Generator.generate` API with fresh
 * randomness for ordinary exploration and generated no-shrink seeds when seed is
 * the hyperparameter being checked. Assertions inspect generated values and
 * public shrink streams, not private generator internals.
 */

import { Gen, Property, Random } from '../../src'
import { collectGeneratedValues, seedGen } from './helpers'
import { DOMAINS, RUNS, SAMPLES, SIZES } from './run-config'

function assertIntegerInRange(value: number, min: number, max: number): void {
    expect(Number.isInteger(value)).toBe(true)
    expect(value).toBeGreaterThanOrEqual(min)
    expect(value).toBeLessThanOrEqual(max)
}

type ContainerProfile =
    | { kind: 'array'; minSize: number; maxSize: number }
    | { kind: 'set'; minSize: number; maxSize: number }
    | { kind: 'string'; minSize: number; maxSize: number }
    | { kind: 'dict'; minSize: number; maxSize: number }
    | { kind: 'uniqueArray'; minSize: number; maxSize: number }

const containerProfileGen = Gen.elementOf<ContainerProfile>(
    { kind: 'array', minSize: SIZES.emptyToSmall.min, maxSize: SIZES.emptyToSmall.max },
    { kind: 'array', minSize: SIZES.fixedPair.min, maxSize: SIZES.fixedPair.max },
    { kind: 'set', minSize: SIZES.emptyToSmall.min, maxSize: SIZES.emptyToSmall.max },
    { kind: 'string', minSize: SIZES.emptyToSmall.min, maxSize: 8 },
    { kind: 'dict', minSize: 1, maxSize: 4 },
    { kind: 'uniqueArray', minSize: SIZES.nonEmptySmallTrace.min, maxSize: SIZES.nonEmptySmallTrace.max }
)

const containerProfiles: ContainerProfile[] = [
    { kind: 'array', minSize: SIZES.emptyToSmall.min, maxSize: SIZES.emptyToSmall.max },
    { kind: 'array', minSize: SIZES.fixedPair.min, maxSize: SIZES.fixedPair.max },
    { kind: 'set', minSize: SIZES.emptyToSmall.min, maxSize: SIZES.emptyToSmall.max },
    { kind: 'string', minSize: SIZES.emptyToSmall.min, maxSize: 8 },
    { kind: 'dict', minSize: 1, maxSize: 4 },
    { kind: 'uniqueArray', minSize: SIZES.nonEmptySmallTrace.min, maxSize: SIZES.nonEmptySmallTrace.max },
]

describe('v2 generator behavior contracts', () => {
    it('integer, boolean, and finite-float generators stay inside their public domains', () => {
        const integers = collectGeneratedValues(
            Gen.interval(DOMAINS.smallSigned.min, DOMAINS.smallSigned.max),
            SAMPLES.integerValues
        )
        integers.forEach(value => assertIntegerInRange(value, DOMAINS.smallSigned.min, DOMAINS.smallSigned.max))
        expect(integers.some(value => value < 0)).toBe(true)
        expect(integers.some(value => value > 0)).toBe(true)

        const booleans = collectGeneratedValues(Gen.boolean(), SAMPLES.booleanValues)
        expect(booleans).toContain(true)
        expect(booleans).toContain(false)

        const floats = collectGeneratedValues(Gen.float(), SAMPLES.finiteFloatValues)
        expect(floats.every(Number.isFinite)).toBe(true)
        expect(floats.some(value => value < 0)).toBe(true)
        expect(floats.some(value => value > 0)).toBe(true)
    })

    it('container config profiles preserve size and element-domain contracts', () => {
        const property = new Property((profile: ContainerProfile) => {
            const values = (() => {
                switch (profile.kind) {
                    case 'array':
                        return collectGeneratedValues(
                            Gen.array({
                                elemGen: Gen.interval(DOMAINS.narrowElement.min, DOMAINS.narrowElement.max),
                                minSize: profile.minSize,
                                maxSize: profile.maxSize,
                            }),
                            SAMPLES.containerValues
                        )
                    case 'set':
                        return collectGeneratedValues(
                            Gen.set({
                                elemGen: Gen.interval(DOMAINS.smallNatural.min, DOMAINS.smallNatural.max),
                                minSize: profile.minSize,
                                maxSize: profile.maxSize,
                            }),
                            SAMPLES.containerValues
                        )
                    case 'string':
                        return collectGeneratedValues(
                            Gen.string({ minSize: profile.minSize, maxSize: profile.maxSize, charGen: Gen.printableAscii }),
                            SAMPLES.containerValues
                        )
                    case 'dict':
                        return collectGeneratedValues(
                            Gen.dict({
                                keyGen: Gen.asciiString(1, 4),
                                elemGen: Gen.interval(DOMAINS.smallNatural.min, DOMAINS.smallNatural.max),
                                minSize: profile.minSize,
                                maxSize: profile.maxSize,
                            }),
                            SAMPLES.containerValues
                        )
                    case 'uniqueArray':
                        return collectGeneratedValues(
                            Gen.uniqueArray({
                                elemGen: Gen.interval(DOMAINS.uniqueElement.min, DOMAINS.uniqueElement.max),
                                minSize: profile.minSize,
                                maxSize: profile.maxSize,
                            }),
                            SAMPLES.containerValues
                        )
                }
            })()

            for (const value of values) {
                if (Array.isArray(value)) {
                    expect(value.length).toBeGreaterThanOrEqual(profile.minSize)
                    expect(value.length).toBeLessThanOrEqual(profile.maxSize)
                    if (profile.kind === 'uniqueArray') {
                        expect(value).toEqual([...value].sort((a, b) => a - b))
                        expect(new Set(value).size).toBe(value.length)
                    }
                } else if (value instanceof Set) {
                    expect(value.size).toBeGreaterThanOrEqual(profile.minSize)
                    expect(value.size).toBeLessThanOrEqual(profile.maxSize)
                    Array.from(value).forEach(item =>
                        assertIntegerInRange(item, DOMAINS.smallNatural.min, DOMAINS.smallNatural.max)
                    )
                } else if (typeof value === 'string') {
                    expect(value.length).toBeGreaterThanOrEqual(profile.minSize)
                    expect(value.length).toBeLessThanOrEqual(profile.maxSize)
                    for (const ch of value) {
                        expect(ch.charCodeAt(0)).toBeGreaterThanOrEqual(0x20)
                        expect(ch.charCodeAt(0)).toBeLessThanOrEqual(0x7f)
                    }
                } else {
                    const keys = Object.keys(value)
                    expect(keys.length).toBeGreaterThanOrEqual(profile.minSize)
                    expect(keys.length).toBeLessThanOrEqual(profile.maxSize)
                    keys.forEach(key => {
                        expect(key.length).toBeGreaterThanOrEqual(1)
                        expect(key.length).toBeLessThanOrEqual(4)
                    })
                    Object.values(value).forEach(item =>
                        assertIntegerInRange(item, DOMAINS.smallNatural.min, DOMAINS.smallNatural.max)
                    )
                }
            }
        })

        property.matrix(containerProfiles)

        property
            .setConfig({ numRuns: RUNS.profile })
            .forAll(containerProfileGen)
    })

    it('dependent combinators preserve generated constraints across chains and accumulated traces', () => {
        const chained = Gen.interval(DOMAINS.dependentOuter.min, DOMAINS.dependentOuter.max)
            .chain(n => Gen.interval(DOMAINS.dependentBase.min, n))
            .chainAsTuple(([outer, inner]: [number, number]) => Gen.interval(inner, outer))

        collectGeneratedValues(chained, SAMPLES.dependentValues).forEach(([outer, inner, third]) => {
            assertIntegerInRange(outer, DOMAINS.dependentOuter.min, DOMAINS.dependentOuter.max)
            assertIntegerInRange(inner, DOMAINS.dependentBase.min, outer)
            assertIntegerInRange(third, inner, outer)
        })

        const accumulated = Gen.interval(DOMAINS.dependentBase.min, DOMAINS.dependentBase.max)
            .accumulate(last => Gen.interval(last, last + 2), SIZES.filteredContainer.min, SIZES.emptyToSmall.max)
        collectGeneratedValues(accumulated, SAMPLES.dependentValues).forEach(values => {
            expect(values.length).toBeGreaterThanOrEqual(2)
            expect(values.length).toBeLessThanOrEqual(5)
            values.forEach((value, index) => {
                if (index > 0) expect(value).toBeGreaterThanOrEqual(values[index - 1])
            })
        })

        const aggregated = Gen.just([0]).aggregate(values => {
            const last = values[values.length - 1]
            return Gen.interval(last, last + 2).map(value => [...values, value])
        }, 2, 5)
        collectGeneratedValues(aggregated, SAMPLES.dependentValues).forEach(values => {
            expect(values.length).toBeGreaterThanOrEqual(2)
            expect(values.length).toBeLessThanOrEqual(5)
            values.forEach((value, index) => {
                if (index > 0) expect(value).toBeGreaterThanOrEqual(values[index - 1])
            })
        })
    })

    it('weighted choice combinators keep all branches reachable with intended bias across generated seeds', () => {
        const oneOfProperty = new Property((seed: number) => {
            const values = collectGeneratedValues(
                Gen.oneOf(
                    Gen.weightedGen(
                        Gen.interval(DOMAINS.weightedChoiceLow.min, DOMAINS.weightedChoiceLow.max),
                        0.8
                    ),
                    Gen.interval(DOMAINS.weightedChoiceHigh.min, DOMAINS.weightedChoiceHigh.max)
                ),
                SAMPLES.distributionValues,
                seed
            )
            const lowRatio = values.filter(value =>
                value >= DOMAINS.weightedChoiceLow.min && value <= DOMAINS.weightedChoiceLow.max
            ).length / values.length
            values.forEach(value =>
                expect(
                    (value >= DOMAINS.weightedChoiceLow.min && value <= DOMAINS.weightedChoiceLow.max) ||
                    (value >= DOMAINS.weightedChoiceHigh.min && value <= DOMAINS.weightedChoiceHigh.max)
                ).toBe(true)
            )
            expect(lowRatio).toBeGreaterThan(0.7)
            expect(lowRatio).toBeLessThan(0.9)
        })

        expect(oneOfProperty.example(DOMAINS.seed.min)).toBe(true)

        oneOfProperty
            .setConfig({ numRuns: RUNS.smoke })
            .forAll(seedGen)

        const elementProperty = new Property((seed: number) => {
            const values = collectGeneratedValues(
                Gen.elementOf(
                    Gen.weightedValue(DOMAINS.weightedElement.preferred, 0.8),
                    DOMAINS.weightedElement.alternate
                ),
                SAMPLES.distributionValues,
                seed
            )
            const oneRatio = values.filter(value => value === DOMAINS.weightedElement.preferred).length / values.length
            values.forEach(value =>
                expect([DOMAINS.weightedElement.preferred, DOMAINS.weightedElement.alternate]).toContain(value)
            )
            expect(oneRatio).toBeGreaterThan(0.7)
            expect(oneRatio).toBeLessThan(0.9)
        })

        expect(elementProperty.example(DOMAINS.seed.min)).toBe(true)

        elementProperty
            .setConfig({ numRuns: RUNS.smoke })
            .forAll(seedGen)
    })

    it('noShrink suppresses shrink candidates without changing generated domain', () => {
        const generator = Gen.interval(DOMAINS.noShrinkValue.min, DOMAINS.noShrinkValue.max).noShrink()
        const random = new Random()

        for (let i = 0; i < SAMPLES.dependentValues; i++) {
            const shrinkable = generator.generate(random)
            assertIntegerInRange(shrinkable.value, DOMAINS.noShrinkValue.min, DOMAINS.noShrinkValue.max)
            expect(shrinkable.shrinks().isEmpty()).toBe(true)
        }
    })
})
