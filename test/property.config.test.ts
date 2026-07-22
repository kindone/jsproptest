/**
 * Tests for Property.setConfig() — batch configuration.
 */
import { Gen } from '../src'
import { Property } from '../src/Property'

describe('Property.setConfig()', () => {
    it('applies seed via setConfig', () => {
        const runs1: number[] = []
        const runs2: number[] = []

        new Property((n: number) => { runs1.push(n); return true })
            .setConfig({ seed: 'abc', numRuns: 20 })
            .forAll(Gen.interval(0, 1000))

        new Property((n: number) => { runs2.push(n); return true })
            .setConfig({ seed: 'abc', numRuns: 20 })
            .forAll(Gen.interval(0, 1000))

        expect(runs1).toEqual(runs2)
    })

    it('applies numRuns via setConfig', () => {
        let count = 0
        new Property((_n: number) => { count++; return true })
            .setConfig({ numRuns: 37 })
            .forAll(Gen.interval(0, 10))
        expect(count).toBe(37)
    })

    it('applies maxDurationMs via setConfig — stops early', () => {
        let count = 0
        new Property((_n: number) => { count++; return true })
            .setConfig({ numRuns: 100_000, maxDurationMs: 50 })
            .forAll(Gen.interval(0, 10))
        expect(count).toBeLessThan(100_000)
    })

    it('applies onStartup / onCleanup via setConfig', () => {
        const log: string[] = []
        new Property((_n: number) => { log.push('run'); return true })
            .setConfig({
                numRuns: 3,
                onStartup: () => log.push('up'),
                onCleanup: () => log.push('down'),
            })
            .forAll(Gen.interval(0, 10))
        expect(log).toEqual(['up', 'run', 'down', 'up', 'run', 'down', 'up', 'run', 'down'])
    })

    it('setConfig is equivalent to individual setters', () => {
        const runs1: number[] = []
        const runs2: number[] = []

        new Property((n: number) => { runs1.push(n); return true })
            .setSeed('xyz').setNumRuns(15)
            .forAll(Gen.interval(0, 100))

        new Property((n: number) => { runs2.push(n); return true })
            .setConfig({ seed: 'xyz', numRuns: 15 })
            .forAll(Gen.interval(0, 100))

        expect(runs1).toEqual(runs2)
    })

    it('setConfig only applies supplied keys — unsupplied keys keep defaults', () => {
        let count = 0
        // Only numRuns is supplied — seed stays as default (random, but we just check count)
        new Property((_n: number) => { count++; return true })
            .setConfig({ numRuns: 5 })
            .forAll(Gen.interval(0, 10))
        expect(count).toBe(5)
    })

    it('setConfig with outputStream / errorStream does not throw', () => {
        const out: string[] = []
        const err: string[] = []
        expect(() => {
            new Property((n: number) => n >= 0)
                .setConfig({
                    numRuns: 10,
                    outputStream: { write: (m: string) => { out.push(m) } },
                    errorStream: { write: (m: string) => { err.push(m) } },
                })
                .forAll(Gen.interval(0, 100))
        }).not.toThrow()
    })

    it('setConfig with shrinkMaxRetries is accepted', () => {
        expect(() => {
            new Property((n: number) => n >= 0)
                .setConfig({ numRuns: 10, shrinkMaxRetries: 2 })
                .forAll(Gen.interval(0, 100))
        }).not.toThrow()
    })
})
