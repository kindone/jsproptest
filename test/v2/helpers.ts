import { Gen, type Generator, Random, Shrinkable, Stream } from '../../src'
import { DOMAINS } from './run-config'

export type GeneratedTrace<T> = {
    values: T[]
    shrinkPrefixes: T[][]
}

export type CapturedOutput = {
    write(message: string): void
    text(): string
}

export const seedGen = Gen.interval(DOMAINS.seed.min, DOMAINS.seed.max).noShrink()

export const distinctSeedPairGen = seedGen.chain(firstSeed =>
    Gen.interval(DOMAINS.seed.min, DOMAINS.seed.max)
        .filter(secondSeed => secondSeed !== firstSeed)
        .noShrink()
)

export function seededRandom(seed: number): Random {
    return new Random(String(seed))
}

export function collectGeneratedValues<T>(gen: Generator<T>, runs: number, seed?: number): T[] {
    const random = typeof seed === 'number' ? seededRandom(seed) : new Random()
    const values: T[] = []
    for (let i = 0; i < runs; i++) values.push(gen.generate(random).value)
    return values
}

export function streamFromValues<T>(values: T[]): Stream<T> {
    return values.reduce((stream, value) => stream.concat(Stream.one(value)), Stream.empty<T>())
}

export function streamToValues<T>(stream: Stream<T>): T[] {
    const values: T[] = []
    const iter = stream.iterator()
    while (iter.hasNext()) values.push(iter.next())
    return values
}

export function directShrinkChildren<T>(shrinkable: Shrinkable<T>, limit = 32): Shrinkable<T>[] {
    const children: Shrinkable<T>[] = []
    const iter = shrinkable.shrinks().iterator()
    while (iter.hasNext() && children.length < limit) children.push(iter.next())
    return children
}

export function directShrinkValues<T>(shrinkable: Shrinkable<T>): T[] {
    return streamToValues(shrinkable.shrinks()).map(child => child.value)
}

export function traverseShrinkTree<T>(root: Shrinkable<T>, visit: (node: Shrinkable<T>) => void): void {
    const queue = [root]
    while (queue.length > 0) {
        const current = queue.shift()!
        visit(current)
        queue.push(...directShrinkChildren(current))
    }
}

export function collectSeededTrace<T>(gen: Generator<T>, seed: number, runs: number): GeneratedTrace<T> {
    const random = seededRandom(seed)
    const values: T[] = []
    const shrinkPrefixes: T[][] = []
    for (let i = 0; i < runs; i++) {
        const shrinkable = gen.generate(random)
        values.push(shrinkable.value)
        shrinkPrefixes.push(shrinkPrefixValues(shrinkable))
    }
    return { values, shrinkPrefixes }
}

export function expectShrinkTreeValues<T>(
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
        queue.push(...directShrinkChildren(current))
    }
    return visited
}

export function capturePropertyOutput(): CapturedOutput {
    const chunks: string[] = []
    return {
        write: message => chunks.push(message),
        text: () => chunks.join(''),
    }
}

export function expectThrownMessage(action: () => unknown): string {
    try {
        action()
    } catch (error) {
        return (error as Error).message
    }
    throw new Error('expected action to throw')
}

function shrinkPrefixValues<T>(root: Shrinkable<T>, limit = 32): T[] {
    const values: T[] = []
    const queue = [root]
    while (queue.length > 0 && values.length < limit) {
        const current = queue.shift()!
        values.push(current.value)
        queue.push(...directShrinkChildren(current, limit - values.length))
    }
    return values
}
