/**
 * Tests for tag() / classify() / stat() and Property.assertStat*() — classification API.
 */
import { Gen, tag, classify, stat } from '../src'
import { Property } from '../src/Property'

// Helper: collects lines written to a stream
function makeStream(): { write(m: string): void; lines: string[] } {
    const lines: string[] = []
    return { write: (m: string) => lines.push(m), lines }
}

describe('tag() / classify() / stat() — basic collection', () => {
    it('tag() records key/value counts in the summary', () => {
        const out = makeStream()
        new Property((n: number) => {
            tag('bucket', n > 50 ? 'high' : 'low')
            return true
        })
            .setNumRuns(100)
            .setSeed('tag-basic')
            .setOutputStream(out)
            .forAll(Gen.interval(0, 100))

        const summary = out.lines.join('')
        expect(summary).toContain('bucket:')
        expect(summary).toMatch(/high|low/)
    })

    it('tag() is a no-op outside a property run (no crash)', () => {
        expect(() => tag('k', 'v')).not.toThrow()
    })

    it('classify() records the label only when condition is true', () => {
        const out = makeStream()
        new Property((n: number) => {
            classify(n < 0, 'sign', 'negative')
            classify(n >= 0, 'sign', 'non-negative')
            return true
        })
            .setNumRuns(200)
            .setSeed('classify-test')
            .setOutputStream(out)
            .forAll(Gen.interval(-100, 100))

        const summary = out.lines.join('')
        expect(summary).toContain('sign:')
        expect(summary).toContain('negative')
        expect(summary).toContain('non-negative')
    })

    it('stat() records the stringified value under the label', () => {
        const out = makeStream()
        new Property((n: number) => {
            stat('is_positive', n > 0)
            return true
        })
            .setNumRuns(100)
            .setSeed('stat-test')
            .setOutputStream(out)
            .forAll(Gen.interval(-10, 10))

        const summary = out.lines.join('')
        expect(summary).toContain('is_positive:')
        expect(summary).toMatch(/true|false/)
    })

    it('no summary is printed when outputStream is not set', () => {
        // Should not throw even without outputStream
        expect(() => {
            new Property((n: number) => {
                tag('x', n)
                return true
            })
                .setNumRuns(20)
                .forAll(Gen.interval(0, 10))
        }).not.toThrow()
    })

    it('summary is not printed on property failure', () => {
        const out = makeStream()
        expect(() => {
            new Property((n: number) => {
                tag('v', n)
                return n < 5 // fails for n >= 5
            })
                .setNumRuns(100)
                .setOutputStream(out)
                .forAll(Gen.interval(0, 10))
        }).toThrow()
        // On failure, no summary should be printed
        expect(out.lines.join('')).not.toContain('v:')
    })

    it('multiple tag keys each appear in summary', () => {
        const out = makeStream()
        new Property((n: number) => {
            tag('parity', n % 2 === 0 ? 'even' : 'odd')
            tag('sign', n >= 0 ? 'non-neg' : 'neg')
            return true
        })
            .setNumRuns(50)
            .setSeed('multi-tag')
            .setOutputStream(out)
            .forAll(Gen.interval(-10, 10))

        const summary = out.lines.join('')
        expect(summary).toContain('parity:')
        expect(summary).toContain('sign:')
    })
})

describe('Property stat assertions', () => {
    it('assertStatGe passes when ratio meets the bound', () => {
        // interval(-10, 10): ~50% are positive → bound 0.2 should be safe
        expect(() => {
            new Property((n: number) => {
                stat('pos', n > 0)
                return true
            })
                .setNumRuns(200)
                .setSeed('assert-ge-pass')
                .assertStatGe('pos', 0.2)
                .forAll(Gen.interval(-10, 10))
        }).not.toThrow()
    })

    it('assertStatGe fails when ratio is below the bound', () => {
        // All values are non-positive so "pos" ratio = 0; bound = 0.5 must fail
        expect(() => {
            new Property((n: number) => {
                stat('pos', n > 0)
                return true
            })
                .setNumRuns(100)
                .setSeed('assert-ge-fail')
                .assertStatGe('pos', 0.5)
                .forAll(Gen.interval(-100, -1))
        }).toThrow(/assertStatGe/)
    })

    it('assertStatLe passes when ratio is at or below the bound', () => {
        // All values in [-100, -1] → "pos" ratio = 0 ≤ 0.1
        expect(() => {
            new Property((n: number) => {
                stat('pos', n > 0)
                return true
            })
                .setNumRuns(100)
                .setSeed('assert-le-pass')
                .assertStatLe('pos', 0.1)
                .forAll(Gen.interval(-100, -1))
        }).not.toThrow()
    })

    it('assertStatLe fails when ratio exceeds the bound', () => {
        // All values are positive → ratio = 1.0 > 0.5
        expect(() => {
            new Property((n: number) => {
                stat('pos', n > 0)
                return true
            })
                .setNumRuns(100)
                .setSeed('assert-le-fail')
                .assertStatLe('pos', 0.5)
                .forAll(Gen.interval(1, 100))
        }).toThrow(/assertStatLe/)
    })

    it('assertStatInRange passes when ratio is within bounds', () => {
        // interval(-10, 10): ~50% positive; [0.2, 0.8] should easily contain it
        expect(() => {
            new Property((n: number) => {
                stat('pos', n > 0)
                return true
            })
                .setNumRuns(300)
                .setSeed('assert-range-pass')
                .assertStatInRange('pos', 0.2, 0.8)
                .forAll(Gen.interval(-10, 10))
        }).not.toThrow()
    })

    it('assertStatInRange fails when ratio is outside bounds', () => {
        // All positive → ratio = 1.0, range [0.1, 0.5] fails
        expect(() => {
            new Property((n: number) => {
                stat('pos', n > 0)
                return true
            })
                .setNumRuns(100)
                .setSeed('assert-range-fail')
                .assertStatInRange('pos', 0.1, 0.5)
                .forAll(Gen.interval(1, 100))
        }).toThrow(/assertStatInRange/)
    })

    it('stat assertion failure message includes key name and ratio', () => {
        try {
            new Property((n: number) => {
                stat('is_big', n > 1000)
                return true
            })
                .setNumRuns(100)
                .setSeed('assert-msg')
                .assertStatGe('is_big', 0.9)
                .forAll(Gen.interval(0, 10))
            fail('Expected to throw')
        } catch (e) {
            expect((e as Error).message).toContain('is_big')
            expect((e as Error).message).toContain('0.9')
        }
    })

    it('multiple stat assertions — all checked, all failures reported', () => {
        try {
            new Property((n: number) => {
                stat('big', n > 1000)
                stat('huge', n > 9000)
                return true
            })
                .setNumRuns(100)
                .setSeed('multi-assert')
                .assertStatGe('big', 0.9)
                .assertStatGe('huge', 0.5)
                .forAll(Gen.interval(0, 10))
            fail('Expected to throw')
        } catch (e) {
            const msg = (e as Error).message
            expect(msg).toContain('big')
            expect(msg).toContain('huge')
        }
    })

    it('stat assertion prints summary to outputStream before throwing', () => {
        const out = makeStream()
        try {
            new Property((n: number) => {
                stat('pos', n > 0)
                return true
            })
                .setNumRuns(100)
                .setSeed('assert-summary')
                .setOutputStream(out)
                .assertStatGe('pos', 0.9)
                .forAll(Gen.interval(-100, -1))
        } catch {
            // expected to throw
        }
        expect(out.lines.join('')).toContain('pos:')
    })

    it('contexts are isolated: tags from one forAll do not bleed into another', () => {
        const out1 = makeStream()
        const out2 = makeStream()

        new Property((n: number) => {
            tag('run1', n > 5 ? 'yes' : 'no')
            return true
        })
            .setNumRuns(50).setSeed('iso1').setOutputStream(out1)
            .forAll(Gen.interval(0, 10))

        new Property((_n: number) => true)
            .setNumRuns(50).setSeed('iso2').setOutputStream(out2)
            .forAll(Gen.interval(0, 10))

        expect(out1.lines.join('')).toContain('run1:')
        expect(out2.lines.join('')).not.toContain('run1:')
    })
})
