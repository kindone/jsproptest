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

import { Gen, Shrinkable, Random } from '../../src'

function directValues<T>(shrinkable: Shrinkable<T>): T[] {
    const values: T[] = []
    for (let iter = shrinkable.shrinks().iterator(); iter.hasNext(); ) {
        values.push(iter.next().value)
    }
    return values
}

describe('v2 shrink topology laws', () => {
    it('chain exposes inner-generator shrinks as direct root children', () => {
        const rand = new Random()
        const gen = Gen.interval(2, 5).chain(n => Gen.interval(1, n))

        let checkedEligibleRoot = false
        let foundInnerAxisAtRoot = false

        for (let i = 0; i < 200 && !foundInnerAxisAtRoot; i++) {
            const root = gen.generate(rand)
            const [rootOuter, rootInner] = root.value

            if (rootOuter <= 2 || rootInner <= 1) continue
            checkedEligibleRoot = true

            foundInnerAxisAtRoot = directValues(root).some(([childOuter, childInner]) => {
                return childOuter === rootOuter && childInner < rootInner
            })
        }

        expect(checkedEligibleRoot).toBe(true)
        expect(foundInnerAxisAtRoot).toBe(true)
    })

    it('accumulate exposes last-element shrinks before length reaches its minimum', () => {
        const rand = new Random()
        const gen = Gen.interval(1, 3).accumulate(n => Gen.interval(n, n + 2), 2, 4)

        let checkedEligibleRoot = false
        let foundElementAxisAtNonMinimumLength = false

        for (let i = 0; i < 200 && !foundElementAxisAtNonMinimumLength; i++) {
            const root = gen.generate(rand)
            const values = root.value
            const last = values[values.length - 1]
            const previous = values[values.length - 2]

            if (values.length <= 2 || last <= previous) continue
            checkedEligibleRoot = true

            foundElementAxisAtNonMinimumLength = directValues(root).some(child => {
                const childLast = child[child.length - 1]
                return child.length === values.length && childLast < last
            })
        }

        expect(checkedEligibleRoot).toBe(true)
        expect(foundElementAxisAtNonMinimumLength).toBe(true)
    })
})
