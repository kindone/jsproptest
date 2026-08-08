/**
 * Contract: config-form dictionary generators should preserve useful shrinking
 * behavior for keys, values, and membership size.
 *
 * Scope: this preserves the dict shrink regressions from `generator.config.test.ts`
 * with clearer names and failure parsing.
 *
 * Helpers: these are named regressions because they depend on shrink result
 * reporting, not only value-domain correctness.
 */

import { Gen, Property } from '../../src'
import { expectThrownMessage } from './helpers'
import { RUNS } from './run-config'

function parseFirstObjectCounterexample(message: string): Record<string, number> {
    const match = message.match(/\[(\{.*?\})\]/)
    return JSON.parse(match?.[1] ?? '{}') as Record<string, number>
}

describe('v2 generator config regressions', () => {
    it('dict key shrinking reaches one entry with minimum failing key length', () => {
        const property = new Property((dict: Record<string, number>) =>
            Object.keys(dict).every(key => key.length <= 1)
        )

        const message = expectThrownMessage(() => {
            property
                .setConfig({ numRuns: RUNS.shrinkDomain, seed: 'dict-key-shrink-regression' })
                .forAll(Gen.dict(Gen.asciiString(2, 6), Gen.interval(0, 9), 1, 3))
        })

        expect(message).toContain('simplest args found by shrinking')
        const shrunk = parseFirstObjectCounterexample(message)
        expect(Object.keys(shrunk)).toHaveLength(1)
        expect(Object.keys(shrunk).every(key => key.length === 2)).toBe(true)
    })

    it('dict value shrinking keeps a one-entry failing value counterexample', () => {
        const property = new Property((dict: Record<string, number>) =>
            Object.values(dict).every(value => value < 5)
        )

        const message = expectThrownMessage(() => {
            property
                .setConfig({ numRuns: RUNS.shrinkDomain, seed: 'dict-value-shrink-regression' })
                .forAll(Gen.dict(Gen.asciiString(1, 3), Gen.interval(0, 9), 1, 3))
        })

        expect(message).toContain('simplest args found by shrinking')
        const values = Object.values(parseFirstObjectCounterexample(message))
        expect(values).toHaveLength(1)
        expect(values.every(value => value >= 5)).toBe(true)
    })

    it('dict membership shrinking respects minSize for object counterexamples', () => {
        const property = new Property((dict: Record<string, number>) =>
            Object.keys(dict).length <= 1
        )

        const message = expectThrownMessage(() => {
            property
                .setConfig({ numRuns: RUNS.shrinkDomain, seed: 'dict-membership-shrink-regression' })
                .forAll(Gen.dict(Gen.asciiString(1, 4), Gen.interval(0, 5), 2, 5))
        })

        expect(message).toContain('simplest args found by shrinking')
        expect(Object.keys(parseFirstObjectCounterexample(message))).toHaveLength(2)
    })
})
