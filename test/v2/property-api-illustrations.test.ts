/**
 * Contract: the Property example and generated-run APIs should support both
 * boolean-returning predicates and assertion/void callbacks. These are
 * illustrative API witnesses, not broad runner stress tests.
 *
 * Scope: this subsumes the basic return/void examples from `property.test.ts`.
 *
 * Helpers: examples are deterministic and generated runs use tiny explicit
 * domains so the API behavior is easy to read.
 */

import { Gen, Property } from '../../src'
import { RUNS } from './run-config'

describe('v2 property API illustrations', () => {
    it('example and forAll execute boolean-returning property callbacks', () => {
        const seen: Array<[number, number]> = []
        const property = new Property((left: number, right: number) => {
            seen.push([left, right])
            return left + right >= 0
        })

        expect(property.example(6, 7)).toBe(true)
        expect(seen).toEqual([[6, 7]])

        property
            .setConfig({ numRuns: RUNS.smoke })
            .forAll(Gen.interval(0, 3), Gen.interval(0, 3))

        expect(seen.length).toBe(RUNS.smoke + 1)
    })

    it('example and forAll treat assertion-only callbacks as successful when no assertion fails', () => {
        const seen: Array<[number, number]> = []
        const property = new Property((left: number, right: number) => {
            seen.push([left, right])
            expect(left).toBeGreaterThanOrEqual(0)
            expect(right).toBeGreaterThanOrEqual(0)
        })

        expect(property.example(6, 7)).toBe(true)
        expect(seen).toEqual([[6, 7]])

        property
            .setConfig({ numRuns: RUNS.smoke })
            .forAll(Gen.interval(0, 3), Gen.interval(0, 3))

        expect(seen.length).toBe(RUNS.smoke + 1)
    })
})
