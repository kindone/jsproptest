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

import { Gen, type Generator, Property, Random } from '../../src'
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

type ContainerCompatibilityCase = {
    name: string
    gen: Generator<unknown>
    minSize: number
    maxSize: number
    assertValue?: (value: unknown) => void
}

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

const containerCompatibilityCases: ContainerCompatibilityCase[] = [
    { name: 'array max-only config', gen: Gen.array({ elemGen: Gen.interval(0, 9), maxSize: 4 }), minSize: 0, maxSize: 4 },
    { name: 'array min-only config', gen: Gen.array({ elemGen: Gen.interval(0, 9), minSize: 3 }), minSize: 3, maxSize: 20 },
    { name: 'array default-size config', gen: Gen.array({ elemGen: Gen.boolean() }), minSize: 0, maxSize: 20 },
    { name: 'array positional form', gen: Gen.array(Gen.interval(0, 9), 1, 6), minSize: 1, maxSize: 6 },
    { name: 'set max-only config', gen: Gen.set({ elemGen: Gen.interval(0, 99), maxSize: 3 }), minSize: 0, maxSize: 3 },
    { name: 'set positional form', gen: Gen.set(Gen.interval(0, 99), 0, 5), minSize: 0, maxSize: 5 },
    { name: 'string default-size config', gen: Gen.string({}), minSize: 0, maxSize: 20 },
    {
        name: 'string custom-char config',
        gen: Gen.string({ minSize: 1, maxSize: 5, charGen: Gen.printableAscii }),
        minSize: 1,
        maxSize: 5,
        assertValue: value => {
            for (const ch of value as string) {
                expect(ch.charCodeAt(0)).toBeGreaterThanOrEqual(0x20)
                expect(ch.charCodeAt(0)).toBeLessThanOrEqual(0x7f)
            }
        },
    },
    { name: 'string positional form', gen: Gen.string(0, 8), minSize: 0, maxSize: 8 },
    {
        name: 'dict default-size config',
        gen: Gen.dict({ keyGen: Gen.asciiString(1, 4), elemGen: Gen.boolean() }),
        minSize: 0,
        maxSize: 20,
    },
    {
        name: 'dict max-only config',
        gen: Gen.dict({ keyGen: Gen.asciiString(1, 4), elemGen: Gen.interval(0, 9), maxSize: 3 }),
        minSize: 0,
        maxSize: 3,
    },
    { name: 'dict positional form', gen: Gen.dict(Gen.asciiString(1, 4), Gen.interval(0, 99), 0, 6), minSize: 0, maxSize: 6 },
    {
        name: 'uniqueArray positional form',
        gen: Gen.uniqueArray(Gen.interval(0, 99), 1, 8),
        minSize: 1,
        maxSize: 8,
        assertValue: value => {
            const values = value as number[]
            expect(values.length).toBe(new Set(values).size)
            expect(values).toEqual([...values].sort((a, b) => a - b))
        },
    },
]

function containerSize(value: unknown): number {
    if (Array.isArray(value) || typeof value === 'string') return value.length
    if (value instanceof Set) return value.size
    return Object.keys(value as Record<string, unknown>).length
}

class ConstructedRecord {
    constructor(readonly count: number, readonly label: string) {}
}

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

    it('container config defaults and positional forms preserve public size contracts', () => {
        const property = new Property((testCase: ContainerCompatibilityCase) => {
            const values = collectGeneratedValues(testCase.gen, SAMPLES.containerValues)

            values.forEach(value => {
                expect(containerSize(value)).toBeGreaterThanOrEqual(testCase.minSize)
                expect(containerSize(value)).toBeLessThanOrEqual(testCase.maxSize)
                testCase.assertValue?.(value)
            })
        })

        property.matrix(containerCompatibilityCases)
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

    it('construct and tuple-chain combinators preserve constructor and dependency contracts', () => {
        const constructed = collectGeneratedValues(
            Gen.construct(
                ConstructedRecord,
                Gen.interval(DOMAINS.weightedChoiceLow.min, DOMAINS.weightedChoiceLow.max),
                Gen.elementOf('record', 'fixture')
            ),
            SAMPLES.containerValues
        )

        constructed.forEach(value => {
            expect(value).toBeInstanceOf(ConstructedRecord)
            assertIntegerInRange(value.count, DOMAINS.weightedChoiceLow.min, DOMAINS.weightedChoiceLow.max)
            expect(['record', 'fixture']).toContain(value.label)
        })

        const pairGen = Gen.interval(DOMAINS.dependentOuter.min, DOMAINS.dependentOuter.max)
            .chain(value => Gen.interval(DOMAINS.dependentBase.min, value)) as Generator<[number, number]>
        const chainedTuple = Gen.chainTuple(
            pairGen,
            ([_outer, inner]: [number, number]) => Gen.interval(DOMAINS.dependentBase.min, inner)
        )
            .chainAsTuple(([_outer, _inner, third]: [number, number, number]) =>
                Gen.interval(DOMAINS.dependentBase.min, third)
            ) as Generator<[number, number, number, number]>

        collectGeneratedValues(chainedTuple, SAMPLES.dependentValues).forEach(([outer, inner, third, fourth]) => {
            assertIntegerInRange(outer, DOMAINS.dependentOuter.min, DOMAINS.dependentOuter.max)
            assertIntegerInRange(inner, DOMAINS.dependentBase.min, outer)
            assertIntegerInRange(third, DOMAINS.dependentBase.min, inner)
            assertIntegerInRange(fourth, DOMAINS.dependentBase.min, third)
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
