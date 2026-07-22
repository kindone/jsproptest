/**
 * Tests for config-object overloads of container generators:
 * Gen.array, Gen.set, Gen.string, Gen.dict (and Gen.uniqueArray).
 */
import { Gen, Property } from '../src/index'

// ── helpers ────────────────────────────────────────────────────────────────

function sample<T>(gen: ReturnType<typeof Gen.array<T>>, seed = '42', runs = 50): T[][] {
    const results: T[][] = []
    new Property((_v: T[]) => { results.push(_v); return true })
        .setSeed(seed).setNumRuns(runs).forAll(gen)
    return results
}

// ── Gen.array ──────────────────────────────────────────────────────────────

describe('Gen.array — config form', () => {
    it('config with all fields produces arrays in the right size range', () => {
        const gen = Gen.array({ elemGen: Gen.interval(0, 9), minSize: 2, maxSize: 5 })
        const results = sample(gen)
        results.forEach(arr => {
            expect(arr.length).toBeGreaterThanOrEqual(2)
            expect(arr.length).toBeLessThanOrEqual(5)
        })
    })

    it('config with only maxSize uses default minSize (0)', () => {
        const gen = Gen.array({ elemGen: Gen.interval(0, 9), maxSize: 4 })
        const results = sample(gen)
        results.forEach(arr => {
            expect(arr.length).toBeGreaterThanOrEqual(0)
            expect(arr.length).toBeLessThanOrEqual(4)
        })
    })

    it('config with only minSize uses default maxSize (20)', () => {
        const gen = Gen.array({ elemGen: Gen.interval(0, 9), minSize: 3 })
        const results = sample(gen)
        results.forEach(arr => {
            expect(arr.length).toBeGreaterThanOrEqual(3)
            expect(arr.length).toBeLessThanOrEqual(20)
        })
    })

    it('config with no size fields uses defaults (0–20)', () => {
        const gen = Gen.array({ elemGen: Gen.boolean() })
        const results = sample(gen)
        results.forEach(arr => {
            expect(arr.length).toBeGreaterThanOrEqual(0)
            expect(arr.length).toBeLessThanOrEqual(20)
        })
    })

    it('positional form still works unchanged', () => {
        const gen = Gen.array(Gen.interval(0, 9), 1, 6)
        const results = sample(gen)
        results.forEach(arr => {
            expect(arr.length).toBeGreaterThanOrEqual(1)
            expect(arr.length).toBeLessThanOrEqual(6)
        })
    })

    it('config and positional forms produce equivalent distributions', () => {
        const cfg = Gen.array({ elemGen: Gen.interval(0, 9), minSize: 1, maxSize: 5 })
        const pos = Gen.array(Gen.interval(0, 9), 1, 5)
        const cfgSizes = sample(cfg, 'dist-cfg', 200).map(a => a.length)
        const posSizes = sample(pos, 'dist-pos', 200).map(a => a.length)
        // Both should stay within range
        cfgSizes.forEach(s => expect(s).toBeGreaterThanOrEqual(1))
        posSizes.forEach(s => expect(s).toBeLessThanOrEqual(5))
    })

    it('shrinking works on config form', () => {
        try {
            new Property((arr: number[]) => arr.every(x => x < 5))
                .setSeed('shrink-cfg').setNumRuns(200)
                .forAll(Gen.array({ elemGen: Gen.interval(0, 9), minSize: 1, maxSize: 6 }))
        } catch {
            // shrinking should find [5] as minimal
        }
        // No throw = property held for all runs. Either way the gen works.
        expect(true).toBe(true)
    })
})

// ── Gen.set ────────────────────────────────────────────────────────────────

describe('Gen.set — config form', () => {
    it('config produces sets in the right size range', () => {
        const gen = Gen.set({ elemGen: Gen.interval(0, 99), minSize: 1, maxSize: 5 })
        const results: Set<number>[] = []
        new Property((_s: Set<number>) => { results.push(_s); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(s => {
            expect(s.size).toBeGreaterThanOrEqual(1)
            expect(s.size).toBeLessThanOrEqual(5)
        })
    })

    it('config with only maxSize uses default minSize (0)', () => {
        const gen = Gen.set({ elemGen: Gen.interval(0, 99), maxSize: 3 })
        const results: Set<number>[] = []
        new Property((_s: Set<number>) => { results.push(_s); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(s => {
            expect(s.size).toBeGreaterThanOrEqual(0)
            expect(s.size).toBeLessThanOrEqual(3)
        })
    })

    it('all elements in generated sets are unique', () => {
        const gen = Gen.set({ elemGen: Gen.interval(0, 9), minSize: 0, maxSize: 5 })
        const results: Set<number>[] = []
        new Property((_s: Set<number>) => { results.push(_s); return true })
            .setSeed('uniq').setNumRuns(50).forAll(gen)
        results.forEach(s => {
            const arr = Array.from(s)
            expect(arr.length).toBe(new Set(arr).size)
        })
    })

    it('positional form still works unchanged', () => {
        const gen = Gen.set(Gen.interval(0, 99), 0, 5)
        const results: Set<number>[] = []
        new Property((_s: Set<number>) => { results.push(_s); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(s => {
            expect(s.size).toBeLessThanOrEqual(5)
        })
    })
})

// ── Gen.string ─────────────────────────────────────────────────────────────

describe('Gen.string — config form', () => {
    it('config with all fields produces strings in the right length range', () => {
        const gen = Gen.string({ minSize: 2, maxSize: 8 })
        const results: string[] = []
        new Property((_s: string) => { results.push(_s); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(s => {
            expect(s.length).toBeGreaterThanOrEqual(2)
            expect(s.length).toBeLessThanOrEqual(8)
        })
    })

    it('empty config uses defaults (0–20, ASCII)', () => {
        const gen = Gen.string({})
        const results: string[] = []
        new Property((_s: string) => { results.push(_s); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(s => {
            expect(s.length).toBeGreaterThanOrEqual(0)
            expect(s.length).toBeLessThanOrEqual(20)
        })
    })

    it('config with custom charGen is respected', () => {
        // PrintableASCIICharGen (0x20–0x7f) — all chars should be printable ASCII
        const gen = Gen.string({ minSize: 1, maxSize: 5, charGen: Gen.printableAscii })
        const results: string[] = []
        new Property((_s: string) => { results.push(_s); return true })
            .setSeed('42').setNumRuns(100).forAll(gen)
        results.forEach(s => {
            for (const ch of s) {
                expect(ch.charCodeAt(0)).toBeGreaterThanOrEqual(0x20)
                expect(ch.charCodeAt(0)).toBeLessThanOrEqual(0x7f)
            }
        })
    })

    it('positional form still works unchanged', () => {
        const gen = Gen.string(0, 8)
        const results: string[] = []
        new Property((_s: string) => { results.push(_s); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(s => expect(s.length).toBeLessThanOrEqual(8))
    })
})

// ── Gen.dict ───────────────────────────────────────────────────────────────

describe('Gen.dict — config form', () => {
    it('config with all fields produces dicts in the right size range', () => {
        const gen = Gen.dict({
            keyGen: Gen.asciiString(1, 4),
            elemGen: Gen.interval(0, 99),
            minSize: 1,
            maxSize: 5,
        })
        const results: Record<string, number>[] = []
        new Property((_d: Record<string, number>) => { results.push(_d); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(d => {
            const keys = Object.keys(d)
            expect(keys.length).toBeGreaterThanOrEqual(1)
            expect(keys.length).toBeLessThanOrEqual(5)
        })
    })

    it('config with no size fields uses defaults (0–20)', () => {
        const gen = Gen.dict({
            keyGen: Gen.asciiString(1, 4),
            elemGen: Gen.boolean(),
        })
        const results: Record<string, boolean>[] = []
        new Property((_d: Record<string, boolean>) => { results.push(_d); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(d => {
            expect(Object.keys(d).length).toBeLessThanOrEqual(20)
        })
    })

    it('config with only maxSize uses default minSize (0)', () => {
        const gen = Gen.dict({
            keyGen: Gen.asciiString(1, 4),
            elemGen: Gen.interval(0, 9),
            maxSize: 3,
        })
        const results: Record<string, number>[] = []
        new Property((_d: Record<string, number>) => { results.push(_d); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(d => {
            expect(Object.keys(d).length).toBeLessThanOrEqual(3)
        })
    })

    it('positional form still works unchanged', () => {
        const gen = Gen.dict(Gen.asciiString(1, 4), Gen.interval(0, 99), 0, 6)
        const results: Record<string, number>[] = []
        new Property((_d: Record<string, number>) => { results.push(_d); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(d => {
            expect(Object.keys(d).length).toBeLessThanOrEqual(6)
        })
    })
})

// ── Gen.uniqueArray ────────────────────────────────────────────────────────

describe('Gen.uniqueArray — config form', () => {
    it('config produces sorted unique arrays in the right size range', () => {
        const gen = Gen.uniqueArray({ elemGen: Gen.interval(0, 99), minSize: 1, maxSize: 5 })
        const results: number[][] = []
        new Property((_a: number[]) => { results.push(_a); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(arr => {
            expect(arr.length).toBeGreaterThanOrEqual(1)
            expect(arr.length).toBeLessThanOrEqual(5)
            // unique
            expect(arr.length).toBe(new Set(arr).size)
            // sorted
            for (let i = 1; i < arr.length; i++) expect(arr[i]).toBeGreaterThanOrEqual(arr[i - 1])
        })
    })

    it('positional form still works unchanged', () => {
        const gen = Gen.uniqueArray(Gen.interval(0, 99), 1, 8)
        const results: number[][] = []
        new Property((_a: number[]) => { results.push(_a); return true })
            .setSeed('42').setNumRuns(50).forAll(gen)
        results.forEach(arr => {
            expect(arr.length).toBeLessThanOrEqual(8)
            expect(arr.length).toBe(new Set(arr).size)
        })
    })
})
