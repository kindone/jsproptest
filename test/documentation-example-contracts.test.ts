/**
 * Contract: documentation examples should remain executable API promises. These
 * checks are intentionally illustrative; broader behavior belongs in the
 * contract-focused files.
 *
 * Scope: this file covers curated documentation-style API examples without
 * trying to absorb every README snippet into behavioral property tests.
 *
 * Helpers: examples use public API entry points only.
 */

import { Gen, Property, forAll } from '../src'
import { DOMAINS, RUNS, SIZES } from './run-config'

describe('documentation example contracts', () => {
    it('illustrates a round-trip property with generated query strings', () => {
        const pairGen = Gen.tuple(Gen.asciiString(1, 6), Gen.asciiString(0, 8))
        const queryGen = Gen.array(pairGen, SIZES.docsQueryPairs.min, SIZES.docsQueryPairs.max)

        const property = new Property((pairs: [string, string][]) => {
            const encoded = new URLSearchParams(pairs).toString()
            const decoded = Array.from(new URLSearchParams(encoded).entries())

            expect(decoded).toEqual(pairs)
        })

        property.matrix([
            [],
            [['q', 'steward']],
            [['tag', 'one'], ['tag', 'two']],
        ])

        property
            .setConfig({ numRuns: RUNS.contract })
            .forAll(queryGen)
    })

    it('illustrates forAll shorthand with an array reversal property', () => {
        new Property((values: number[]) => {
            expect([...values].reverse().reverse()).toEqual(values)
        }).matrix([
            [],
            [1],
            [1, 2, 3],
        ])

        forAll((values: number[]) => {
            expect([...values].reverse().reverse()).toEqual(values)
        }, Gen.array(
            Gen.interval(DOMAINS.replayElement.min, DOMAINS.replayElement.max),
            SIZES.emptyToMedium.min,
            SIZES.emptyToMedium.max
        ))
    })

    it('keeps exact illustrative examples in matrix form', () => {
        new Property((values: number[]) => {
            expect([...values].reverse().reverse()).toEqual(values)
        }).matrix([
            [],
            [1],
            [1, 2, 3],
        ])
    })
})
