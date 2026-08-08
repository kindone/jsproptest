/**
 * Contract: property execution configuration, lifecycle hooks, classification,
 * statistics, and reporting should behave as public runner contracts. Reporting
 * state must be scoped to one `forAll` execution.
 *
 * Scope: this promotes the strongest checks from `property.config.test.ts` and
 * `property.classification.test.ts`, while leaving specific failure-message
 * shrink regressions in `property-runner-contracts.test.ts`.
 *
 * Helpers: local streams collect only public outputStream writes. The tests use
 * public `Property` configuration APIs rather than reading runner internals.
 */

import { Gen, Property, classify, stat, tag } from '../../src'
import { capturePropertyOutput, seedGen } from './helpers'
import { DOMAINS, RUNS, SAMPLES } from './run-config'

describe('v2 property reporting contracts', () => {
    it('setConfig reproduces generated seed traces and lifecycle hooks run around each successful case', () => {
        const property = new Property((seed: number) => {
            const firstTrace: number[] = []
            const secondTrace: number[] = []
            const lifecycle: string[] = []

            const firstRun = new Property((value: number) => {
                firstTrace.push(value)
                lifecycle.push('run')
                return true
            })

            expect(firstRun.example(DOMAINS.noShrinkValue.min)).toBe(true)
            firstTrace.length = 0
            lifecycle.length = 0

            firstRun
                .setConfig({
                    seed: String(seed),
                    numRuns: SAMPLES.lifecycleRuns,
                    onStartup: () => lifecycle.push('startup'),
                    onCleanup: () => lifecycle.push('cleanup'),
                })
                .forAll(Gen.interval(DOMAINS.noShrinkValue.min - 5, DOMAINS.noShrinkValue.max))

            const secondRun = new Property((value: number) => {
                secondTrace.push(value)
                return true
            })

            expect(secondRun.example(DOMAINS.noShrinkValue.min)).toBe(true)
            secondTrace.length = 0

            secondRun
                .setConfig({ seed: String(seed), numRuns: SAMPLES.lifecycleRuns })
                .forAll(Gen.interval(DOMAINS.noShrinkValue.min - 5, DOMAINS.noShrinkValue.max))

            expect(secondTrace).toEqual(firstTrace)
            expect(lifecycle).toEqual(Array.from({ length: SAMPLES.lifecycleRuns }).flatMap(() => ['startup', 'run', 'cleanup']))
        })

        expect(property.example(DOMAINS.seed.min)).toBe(true)

        property
            .setConfig({ numRuns: RUNS.smoke })
            .forAll(seedGen)
    })

    it('tag, classify, and stat summaries describe successful runs only', () => {
        const output = capturePropertyOutput()

        const property = new Property((value: number) => {
            tag('parity', value % 2 === 0 ? 'even' : 'odd')
            classify(value < 0, 'sign', 'negative')
            classify(value >= 0, 'sign', 'non-negative')
            stat('positive', value > 0)
            return true
        })

        property.matrix([-1, 0, 1])

        property
            .setConfig({ numRuns: SAMPLES.integerValues, outputStream: output })
            .assertStatInRange('positive', 0.35, 0.65)
            .forAll(Gen.interval(DOMAINS.reportingMixed.min, DOMAINS.reportingMixed.max))

        const summary = output.text()
        expect(summary).toContain('parity:')
        expect(summary).toContain('even')
        expect(summary).toContain('odd')
        expect(summary).toContain('sign:')
        expect(summary).toContain('negative')
        expect(summary).toContain('non-negative')
        expect(summary).toContain('positive:')
    })

    it('stat assertion failures report every failed assertion and still write the summary', () => {
        const output = capturePropertyOutput()
        const property = new Property((value: number) => {
            stat('big', value > 1000)
            stat('huge', value > 9000)
            return true
        })

        property.matrix([DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max])

        try {
            property
                .setConfig({ numRuns: RUNS.coreSeedReplay, outputStream: output })
                .assertStatGe('big', 0.9)
                .assertStatGe('huge', 0.5)
                .forAll(Gen.interval(DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max))
            fail('Expected stat assertions to fail')
        } catch (error) {
            const message = (error as Error).message
            expect(message).toContain('big')
            expect(message).toContain('huge')
        }

        expect(output.text()).toContain('big:')
        expect(output.text()).toContain('huge:')
    })

    it('classification contexts do not leak between separate forAll executions', () => {
        const firstOutput = capturePropertyOutput()
        const secondOutput = capturePropertyOutput()

        const firstProperty = new Property((value: number) => {
            tag('first-run-only', value > 5)
            return true
        })

        firstProperty.matrix([DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max])

        firstProperty
            .setConfig({ numRuns: RUNS.smoke, outputStream: firstOutput })
            .forAll(Gen.interval(DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max))

        const secondProperty = new Property((_value: number) => true)
        secondProperty.matrix([DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max])

        secondProperty
            .setConfig({ numRuns: RUNS.smoke, outputStream: secondOutput })
            .forAll(Gen.interval(DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max))

        expect(firstOutput.text()).toContain('first-run-only:')
        expect(secondOutput.text()).not.toContain('first-run-only:')
    })

    it('generated failures suppress success summaries and report shrink output separately', () => {
        const output = capturePropertyOutput()
        const property = new Property((value: number) => {
            tag('will-not-print-on-failure', value)
            return value < 5
        })

        expect(property.example(DOMAINS.reportingFailure.min)).toBe(false)

        expect(() => {
            property
                .setConfig({ numRuns: RUNS.tiny, outputStream: output })
                .forAll(Gen.interval(DOMAINS.reportingFailure.min, DOMAINS.reportingFailure.max))
        }).toThrow()

        expect(output.text()).not.toContain('will-not-print-on-failure:')
    })
})
