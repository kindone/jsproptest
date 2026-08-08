/**
 * Contract: v2 property-law tests should assert reusable behavioral laws, not only
 * that examples run. A passing test must say something concrete about generation,
 * shrinking, replay, reporting, or statistical classification.
 *
 * Scope: this file covers cross-cutting runner/generator laws that subsume weaker
 * seed, shrink, and frontier-profile smoke tests from the v1 suite. Seed replay
 * checks generate no-shrink seeds as part of the property domain instead of
 * pinning named seed constants.
 *
 * Helpers: local helpers intentionally capture observable traces and bounded shrink
 * tree prefixes. They avoid inspecting private runner state, so the tests remain
 * black-box checks over the public API surface.
 */

import { Arbitrary, Gen, Generator, Property, Random, Shrinkable, stat, Stream } from '../../src'

type Trace<T> = {
    values: T[]
    shrinkPrefixes: T[][]
}

function directChildren<T>(shrinkable: Shrinkable<T>, limit = 32): Shrinkable<T>[] {
    const children: Shrinkable<T>[] = []
    const iter = shrinkable.shrinks().iterator()
    while (iter.hasNext() && children.length < limit) {
        children.push(iter.next())
    }
    return children
}

function shrinkPrefix<T>(root: Shrinkable<T>, limit = 32): T[] {
    const values: T[] = []
    const queue = [root]
    while (queue.length > 0 && values.length < limit) {
        const current = queue.shift()!
        values.push(current.value)
        queue.push(...directChildren(current, limit - values.length))
    }
    return values
}

function collectTrace<T>(gen: Generator<T>, seed: number, runs: number): Trace<T> {
    const rand = new Random(String(seed))
    const values: T[] = []
    const shrinkPrefixes: T[][] = []
    for (let i = 0; i < runs; i++) {
        const shrinkable = gen.generate(rand)
        values.push(shrinkable.value)
        shrinkPrefixes.push(shrinkPrefix(shrinkable))
    }
    return { values, shrinkPrefixes }
}

function collectExploratoryTrace<T>(gen: Generator<T>, runs: number): Trace<T> {
    const rand = new Random()
    const values: T[] = []
    const shrinkPrefixes: T[][] = []
    for (let i = 0; i < runs; i++) {
        const shrinkable = gen.generate(rand)
        values.push(shrinkable.value)
        shrinkPrefixes.push(shrinkPrefix(shrinkable))
    }
    return { values, shrinkPrefixes }
}

function expectShrinkTreeDomain<T>(
    shrinkable: Shrinkable<T>,
    predicate: (value: T) => boolean,
    maxNodes = 500
): number {
    const queue = [shrinkable]
    let visited = 0
    while (queue.length > 0 && visited < maxNodes) {
        const current = queue.shift()!
        expect(predicate(current.value)).toBe(true)
        visited++
        queue.push(...directChildren(current))
    }
    return visited
}

function expectFailureMessage(prop: () => unknown): string {
    try {
        prop()
    } catch (error) {
        return (error as Error).message
    }
    throw new Error('expected property to fail')
}

describe('property-law v2 suite', () => {
    const seedGen = Gen.interval(1, 1_000_000).noShrink()

    it('same generated seed reproduces generated values and shrink-tree prefixes', () => {
        const gen = Gen.array({
            elemGen: Gen.interval(-20, 20).chain(n => Gen.interval(Math.min(0, n), Math.max(0, n))),
            minSize: 1,
            maxSize: 6,
        })

        new Property((seed: number) => {
            const first = collectTrace(gen, seed, 40)
            const second = collectTrace(gen, seed, 40)

            expect(second).toEqual(first)
        })
            .setConfig({ numRuns: 40 })
            .forAll(seedGen)
    })

    it('different generated seeds explore a different trace for a mixed generator', () => {
        const gen = Gen.oneOf(
            Gen.interval(-100, -1).map(n => ({ kind: 'negative', n })),
            Gen.interval(0, 100).map(n => ({ kind: 'nonnegative', n }))
        )
        const seedPairGen = seedGen.chain(firstSeed => Gen.interval(1, 1_000_000).filter(secondSeed => secondSeed !== firstSeed).noShrink())

        new Property(([firstSeed, secondSeed]: [number, number]) => {
            const first = collectTrace(gen, firstSeed, 50)
            const second = collectTrace(gen, secondSeed, 50)

            expect(second.values).not.toEqual(first.values)
        })
            .setConfig({ numRuns: 40 })
            .forAll(seedPairGen)
    })

    it('filtered container shrinks stay inside the promised domain', () => {
        const gen = Gen.array({
            elemGen: Gen.interval(-30, 30).filter(n => n % 3 === 0),
            minSize: 2,
            maxSize: 8,
        }).filter(values => values.reduce((sum, value) => sum + value, 0) % 3 === 0)

        const root = gen.generate(new Random())
        const visited = expectShrinkTreeDomain(
            root,
            values =>
                values.length >= 2 &&
                values.length <= 8 &&
                values.every(value => value % 3 === 0) &&
                values.reduce((sum, value) => sum + value, 0) % 3 === 0
        )

        expect(visited).toBeGreaterThan(1)
    })

    it('negative property reports a boundary counterexample after shrinking', () => {
        function boundaryShrinkable(value: number): Shrinkable<number> {
            if (value === 100) return new Shrinkable(100, () => Stream.one(boundaryShrinkable(10)))
            if (value === 10) return new Shrinkable(10, () => Stream.two(new Shrinkable(5), new Shrinkable(4)))
            return new Shrinkable(value)
        }
        const boundaryGen = new Arbitrary<number>(() => boundaryShrinkable(100))

        const message = expectFailureMessage(() => {
            new Property((n: number) => n < 5)
                .setConfig({ numRuns: 1 })
                .forAll(boundaryGen)
        })

        expect(message).toContain('simplest args found by shrinking')
        expect(message).toContain('[5]')
    })

    it('frontier profile drives nested subdomain checks without losing common coverage', () => {
        type Profile = {
            name: string
            minSize: number
            maxSize: number
            elemMin: number
            elemMax: number
            frontier: boolean
        }

        const common: Profile = {
            name: 'common-small',
            minSize: 0,
            maxSize: 3,
            elemMin: -5,
            elemMax: 5,
            frontier: false,
        }
        const edge: Profile = { name: 'edge-fixed', minSize: 4, maxSize: 4, elemMin: 0, elemMax: 1, frontier: true }
        const wide: Profile = {
            name: 'frontier-wide',
            minSize: 1,
            maxSize: 8,
            elemMin: -1000,
            elemMax: 1000,
            frontier: true,
        }
        const profileGen = Gen.elementOf(
            Gen.weightedValue(common, 0.15),
            Gen.weightedValue(edge, 0.35),
            Gen.weightedValue(wide, 0.5)
        )

        new Property((profile: Profile) => {
            stat('frontier-profile', profile.frontier)
            const gen = Gen.array({
                elemGen: Gen.interval(profile.elemMin, profile.elemMax),
                minSize: profile.minSize,
                maxSize: profile.maxSize,
            })
            const trace = collectExploratoryTrace(gen, 12)

            expect(trace.values.length).toBe(12)
            trace.values.forEach(values => {
                expect(values.length).toBeGreaterThanOrEqual(profile.minSize)
                expect(values.length).toBeLessThanOrEqual(profile.maxSize)
                values.forEach(value => {
                    expect(value).toBeGreaterThanOrEqual(profile.elemMin)
                    expect(value).toBeLessThanOrEqual(profile.elemMax)
                })
            })
        })
            .setConfig({ numRuns: 80 })
            .assertStatGe('frontier-profile', 0.7)
            .forAll(profileGen)
    })
})
