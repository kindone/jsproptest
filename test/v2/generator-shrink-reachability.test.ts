/**
 * Contract: shrink topology tests assert that important shrink axes are reachable
 * at the level where the runner needs them. They protect against regressions where
 * a combinator still produces valid values but hides useful shrinks too deep in the
 * tree to find practical counterexamples.
 *
 * Scope: this file starts by migrating the strongest v1 generator topology tests:
 * dependent `chain` U-axis shrinking and `accumulate` element-axis shrinking. The
 * original v1 tests remain in place until this v2 portfolio subsumes their coverage.
 *
 * Helpers: these checks inspect only direct child values from public Shrinkable
 * streams. They intentionally use fresh randomness; exact examples should be
 * covered separately through example or matrix tests.
 */

import { Gen, Property, Random } from '../../src'
import { directShrinkValues, seedGen, seededRandom, traverseShrinkTree } from './helpers'
import { DOMAINS, RUNS, SAMPLES, SIZES } from './run-config'

describe('v2 generator shrink reachability', () => {
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
})
