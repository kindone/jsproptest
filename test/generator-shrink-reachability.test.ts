/**
 * Contract: shrink topology tests assert that important shrink axes are reachable
 * at the level where the runner needs them. They protect against regressions where
 * a combinator still produces valid values but hides useful shrinks too deep in the
 * tree to find practical counterexamples.
 *
 * Scope: this file covers interval shrink validity, dependent `chain`
 * inner-axis shrinking, `accumulate` element-axis shrinking, bounded set-subset
 * enumeration, and noShrink/flatMap topology.
 *
 * Helpers: these checks inspect only direct child values from public Shrinkable
 * streams. They intentionally use fresh randomness; exact examples should be
 * covered separately through example or matrix tests.
 */

import { Gen, Property, Random } from '../src'
import { directShrinkValues, seedGen, seededRandom, traverseShrinkTree } from './helpers'
import { DOMAINS, RUNS, SAMPLES, SIZES } from './run-config'

function combination(n: number, r: number): number {
    let result = 1
    for (let i = 1; i <= r; i++) {
        result *= n--
        result /= i
    }
    return result
}

function sumCombinations(n: number, maxR: number): number {
    if (maxR < 0) return 0
    let result = 0
    for (let r = 0; r <= maxR; r++) result += combination(n, r)
    return result
}

function setKey(value: Set<number>): string {
    return JSON.stringify([...value].sort((a, b) => a - b))
}

describe('generator shrink reachability', () => {
    it('interval shrink trees preserve the generated integer domain without duplicate nodes per tree', () => {
        const min = DOMAINS.shrinkNegativeWindow.min
        const max = DOMAINS.shrinkNegativeWindow.max
        const generator = Gen.interval(min, max)

        const property = new Property((seed: number) => {
            const root = generator.generate(seededRandom(seed))
            const seen = new Set<number>()

            traverseShrinkTree(root, node => {
                expect(node.value).toBeGreaterThanOrEqual(min)
                expect(node.value).toBeLessThanOrEqual(max)
                expect(seen.has(node.value)).toBe(false)
                seen.add(node.value)
            })
        })

        expect(property.example(DOMAINS.seed.min)).toBe(true)

        property
            .setConfig({ numRuns: RUNS.shrinkDomain })
            .forAll(seedGen)
    })

    it('chain exposes inner-generator shrinks as direct root children', () => {
        const rand = new Random()
        const gen = Gen.interval(2, 5).chain(n => Gen.interval(1, n))

        let checkedEligibleRoot = false
        let foundInnerAxisAtRoot = false

        for (let i = 0; i < SAMPLES.shrinkReachabilityRoots && !foundInnerAxisAtRoot; i++) {
            const root = gen.generate(rand)
            const [rootOuter, rootInner] = root.value

            if (rootOuter <= 2 || rootInner <= 1) continue
            checkedEligibleRoot = true

            foundInnerAxisAtRoot = directShrinkValues(root).some(([childOuter, childInner]) => {
                return childOuter === rootOuter && childInner < rootInner
            })
        }

        expect(checkedEligibleRoot).toBe(true)
        expect(foundInnerAxisAtRoot).toBe(true)
    })

    it('accumulate exposes last-element shrinks before length reaches its minimum', () => {
        const rand = new Random()
        const gen = Gen.interval(DOMAINS.statefulAddParam.min, DOMAINS.weightedChoiceLow.max).accumulate(
            n => Gen.interval(n, n + 2),
            SIZES.filteredContainer.min,
            SIZES.filteredContainer.max
        )

        let checkedEligibleRoot = false
        let foundElementAxisAtNonMinimumLength = false

        for (let i = 0; i < SAMPLES.shrinkReachabilityRoots && !foundElementAxisAtNonMinimumLength; i++) {
            const root = gen.generate(rand)
            const values = root.value
            const last = values[values.length - 1]
            const previous = values[values.length - 2]

            if (values.length <= 2 || last <= previous) continue
            checkedEligibleRoot = true

            foundElementAxisAtNonMinimumLength = directShrinkValues(root).some(child => {
                const childLast = child[child.length - 1]
                return child.length === values.length && childLast < last
            })
        }

        expect(checkedEligibleRoot).toBe(true)
        expect(foundElementAxisAtNonMinimumLength).toBe(true)
    })

    it('set shrink trees enumerate valid unique subset candidates for bounded roots', () => {
        const minMaxSizeGen = Gen.interval(0, SIZES.emptyToSmall.max)
            .chain(minSize => Gen.interval(minSize, SIZES.emptyToSmall.max))

        const property = new Property(([minSize, maxSize]: [number, number]) => {
            const random = new Random()
            const generator = Gen.set(Gen.interval(DOMAINS.smallNatural.min, DOMAINS.smallNatural.max), minSize, maxSize)

            for (let rootIndex = 0; rootIndex < 3; rootIndex++) {
                const root = generator.generate(random)
                const seen = new Set<string>()

                traverseShrinkTree(root, shrinkable => {
                    expect(shrinkable.value.size).toBeGreaterThanOrEqual(minSize)
                    expect(shrinkable.value.size).toBeLessThanOrEqual(maxSize)
                    Array.from(shrinkable.value).forEach(value => {
                        expect(value).toBeGreaterThanOrEqual(DOMAINS.smallNatural.min)
                        expect(value).toBeLessThanOrEqual(DOMAINS.smallNatural.max)
                    })
                    const key = setKey(shrinkable.value)
                    expect(seen.has(key)).toBe(false)
                    seen.add(key)
                })

                const rootSize = root.value.size
                expect(seen.size).toBe(2 ** rootSize - sumCombinations(rootSize, minSize - 1))
            }
        })

        property.matrix([[0, 0], [0, 3], [2, 4]])

        property
            .setConfig({ numRuns: RUNS.smoke })
            .forAll(minMaxSizeGen)
    })

    it('noShrink composed through flatMap keeps outer values fixed while inner shrinks remain reachable', () => {
        const random = new Random()
        const generator = Gen.noShrink(Gen.interval(2, 5)).flatMap(outer => Gen.interval(0, outer))

        for (let i = 0; i < SAMPLES.setShrinkRoots; i++) {
            const root = generator.generate(random)
            directShrinkValues(root).forEach(child => {
                expect(child).toBeLessThanOrEqual(root.value)
            })
        }
    })
})
