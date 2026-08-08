/**
 * Contract: property execution configuration, lifecycle hooks, classification,
 * statistics, and reporting should behave as public runner contracts. Reporting
 * state must be scoped to one `forAll` execution.
 *
 * Scope: this file covers setConfig equivalence, lifecycle hooks, output/error
 * streams, classification summaries, stat assertions, context isolation, and
 * failure-reporting boundaries.
 *
 * Helpers: local streams collect only public outputStream writes. The tests use
 * public `Property` configuration APIs rather than reading runner internals.
 */

import { Gen, Property, classify, stat, tag } from '../src'
import { capturePropertyOutput, seedGen } from './helpers'
import { DOMAINS, RUNS, SAMPLES } from './run-config'

describe('property reporting contracts', () => {
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

    it('setConfig matches individual setters and leaves unspecified options unchanged', () => {
        const individualTrace: number[] = []
        const configTrace: number[] = []

        const individualProperty = new Property((value: number) => {
            individualTrace.push(value)
            return true
        })
        const configProperty = new Property((value: number) => {
            configTrace.push(value)
            return true
        })

        expect(individualProperty.example(DOMAINS.reportingSmall.min)).toBe(true)
        expect(configProperty.example(DOMAINS.reportingSmall.min)).toBe(true)
        individualTrace.length = 0
        configTrace.length = 0

        individualProperty
            .setSeed('config-equivalence')
            .setNumRuns(SAMPLES.lifecycleRuns)
            .forAll(Gen.interval(DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max))

        configProperty
            .setConfig({ seed: 'config-equivalence', numRuns: SAMPLES.lifecycleRuns })
            .forAll(Gen.interval(DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max))

        expect(configTrace).toEqual(individualTrace)

        let partialConfigRuns = 0
        const partialConfigProperty = new Property((_value: number) => {
            partialConfigRuns++
            return true
        })

        expect(partialConfigProperty.example(DOMAINS.reportingSmall.min)).toBe(true)
        partialConfigRuns = 0

        partialConfigProperty
            .setConfig({ numRuns: SAMPLES.lifecycleRuns })
            .forAll(Gen.interval(DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max))

        expect(partialConfigRuns).toBe(SAMPLES.lifecycleRuns)
    })

    it('setConfig accepts output, error, and shrink retry options without changing successful execution', () => {
        const output = capturePropertyOutput()
        const error = capturePropertyOutput()
        let runs = 0

        const property = new Property((value: number) => {
            runs++
            return value >= DOMAINS.reportingSmall.min
        })

        expect(property.example(DOMAINS.reportingSmall.min)).toBe(true)
        runs = 0

        expect(() => {
            property
                .setConfig({
                    numRuns: SAMPLES.lifecycleRuns,
                    outputStream: output,
                    errorStream: error,
                    shrinkMaxRetries: 2,
                })
                .forAll(Gen.interval(DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max))
        }).not.toThrow()

        expect(runs).toBe(SAMPLES.lifecycleRuns)
        expect(error.text()).toBe('')
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

    it('classification helpers are safe outside active runs and without output streams', () => {
        expect(() => {
            tag('outside-run', 'value')
            classify(true, 'outside-run', 'classified')
            stat('outside-run', true)
        }).not.toThrow()

        expect(() => {
            new Property((value: number) => {
                tag('without-output', value)
                return true
            })
                .setConfig({ numRuns: RUNS.smoke })
                .forAll(Gen.interval(DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max))
        }).not.toThrow()
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

    it('stat assertion variants pass and fail at their public boundaries', () => {
        const property = new Property((value: number) => {
            stat('positive', value > 0)
            return true
        })

        property.matrix([DOMAINS.reportingSmall.min, DOMAINS.reportingSmall.max])

        expect(() => {
            property
                .setConfig({ numRuns: RUNS.coreSeedReplay })
                .assertStatLe('positive', 0.1)
                .forAll(Gen.interval(DOMAINS.reportingMixed.min, -1))
        }).not.toThrow()

        expect(() => {
            new Property((value: number) => {
                stat('positive', value > 0)
                return true
            })
                .setConfig({ numRuns: RUNS.coreSeedReplay })
                .assertStatLe('positive', 0.5)
                .forAll(Gen.interval(1, DOMAINS.reportingSmall.max))
        }).toThrow(/assertStatLe/)

        expect(() => {
            new Property((value: number) => {
                stat('positive', value > 0)
                return true
            })
                .setConfig({ numRuns: RUNS.coreSeedReplay })
                .assertStatInRange('positive', 0.1, 0.5)
                .forAll(Gen.interval(1, DOMAINS.reportingSmall.max))
        }).toThrow(/assertStatInRange/)
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
