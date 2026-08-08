/**
 * Contract: known property-shrinking scenarios should continue to fail and
 * report useful shrinking behavior. These are named regressions, not general
 * property runner contracts.
 *
 * Scope: this file covers no-useful-shrink failures, multi-argument shrinking,
 * dependent tuple shrinking, nested property failures, and fastcheck-style
 * sorted tuple regressions.
 *
 * Helpers: each regression names the bug shape directly and uses bounded domains
 * so failures remain fast and diagnosable.
 */

import { Gen, Property, forAll } from '../src'
import { expectThrownMessage } from './helpers'
import { DOMAINS, RUNS } from './run-config'

describe('property shrink regressions', () => {
    it('reports a generated failure even when no useful shrink exists', () => {
        const property = new Property((count: number, label: string) => count < 10 || label.length > 3)

        expect(property.example(10, '')).toBe(false)

        const message = expectThrownMessage(() => {
            property
                .setConfig({ numRuns: RUNS.regressionReplay, seed: 'no-useful-shrink-regression' })
                .forAll(Gen.interval(0, 10), Gen.string(0, 10))
        })

        expect(message).toContain('args found')
    })

    it('shrinks multi-argument predicate failures for boolean and assertion callbacks', () => {
        const booleanProperty = new Property((left: number, right: number) => left > 80 || right < 40)
        const assertionProperty = new Property((left: number, right: number) => {
            expect(left > 80 || right < 40).toBe(true)
        })

        expect(booleanProperty.example(80, 40)).toBe(false)
        expect(assertionProperty.example(80, 40)).toBe(false)

        expectThrownMessage(() => {
            booleanProperty
                .setConfig({ numRuns: RUNS.shrinkDomain, seed: 'multi-arg-boolean-shrink' })
                .forAll(Gen.interval(0, 1000), Gen.interval(0, 1000))
        })
        expectThrownMessage(() => {
            assertionProperty
                .setConfig({ numRuns: RUNS.shrinkDomain, seed: 'multi-arg-assertion-shrink' })
                .forAll(Gen.interval(0, 1000), Gen.interval(0, 1000))
        })
    })

    it('shrinks tuple order-difference counterexamples through dependent generators', () => {
        const property = new Property((tuple: [number, number]) => tuple[1] - tuple[0] <= 5)
        const signed = Gen.interval(DOMAINS.wideSigned.min * 10_000, DOMAINS.wideSigned.max * 10_000)
        const tupleGen = signed.flatMap(value => Gen.tuple(signed, Gen.just(value)))

        expect(property.example([0, 6])).toBe(false)

        expectThrownMessage(() => {
            property
                .setConfig({ numRuns: RUNS.shrinkDomain, seed: 'tuple-order-difference-shrink' })
                .forAll(tupleGen)
        })
    })

    it('preserves nested property failures raised by inner generated checks', () => {
        expect(() =>
            forAll((outer: number) => {
                forAll((inner: number) => inner > 80, Gen.just(outer))
            }, Gen.interval(0, 1000))
        ).toThrow()

        const nestedThrownMessage = expectThrownMessage(() =>
            forAll((outer: number) => {
                forAll((_inner: number) => {
                    throw new Error('nested regression failure')
                }, Gen.just(outer))
            }, Gen.interval(0, 1000))
        )
        expect(nestedThrownMessage).toContain('property failed')
    })

    it('preserves fastcheck-style sorted tuple shrink regressions', () => {
        expect(() =>
            forAll(
                (tuple: [number, number]) => tuple[1] - tuple[0] <= 5,
                Gen.tuple(Gen.interval(0, 100000), Gen.interval(0, 100000)).map(([left, right]) => [
                    left < right ? left : right,
                    left < right ? right : left,
                ])
            )
        ).toThrow()

        expect(() =>
            forAll(
                (tuple: [number, number]) => tuple[1] - tuple[0] <= 5,
                Gen.interval(0, 100000).flatMap(upper => Gen.tuple(Gen.interval(0, upper), Gen.just(upper)))
            )
        ).toThrow()
    })
})
