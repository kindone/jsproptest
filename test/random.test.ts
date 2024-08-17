import { Random } from '../src/Random'

describe('random', () => {
    it('nextBoolean', () => {
        // test trueProb
        const numTries = 100
        const numCollections = 1000
        const rand: Random = new Random()
        let maxDiff = 0
        for (let i = 0; i < numTries; i++) {
            for (let trueProb of [0.1, 0.2, 0.5, 0.9, 1.0]) {
                const ratio =
                    Array.from({ length: numCollections }, () => rand.nextBoolean(trueProb)).reduce(
                        (acc, val) => acc + (val ? 1 : 0),
                        0
                    ) / numCollections
                expect(Math.abs(ratio - trueProb)).toBeLessThan(0.1)
                maxDiff = Math.max(maxDiff, Math.abs(ratio - trueProb))
            }
        }
        console.log('nextBoolean true/false generation diff w/ trueProb maxDiff:', maxDiff)
    })

    it('nextLong', () => {
        // test boundary probability
        const numTries = 100
        const numCollections = 1000
        const rand: Random = new Random()
        let maxDiff = 0
        const longBoundSet = new Set(Random.LONG_BOUNDS)
        for (let i = 0; i < numTries; i++) {
            for (let boundaryProb of [0.1, 0.2, 0.5, 0.9, 1.0]) {
                const ratio =
                    Array.from({ length: numCollections }, () => rand.nextLong(boundaryProb)).reduce(
                        (acc, val) => acc + (longBoundSet.has(val) ? 1 : 0),
                        0
                    ) / numCollections
                expect(Math.abs(ratio - boundaryProb)).toBeLessThan(0.1)
                maxDiff = Math.max(maxDiff, Math.abs(ratio - boundaryProb))
            }
        }
        console.log('nextLong boundary generation w/ prob maxDiff:', maxDiff)
    })

    it('nextInt', () => {
        // test boundary probability
        const numTries = 100
        const numCollections = 1000
        const rand: Random = new Random()
        let maxDiff = 0
        const intBoundSet = new Set(Random.INT_BOUNDS)
        for (let i = 0; i < numTries; i++) {
            for (let boundaryProb of [0.1, 0.2, 0.5, 0.9, 1.0]) {
                const ratio =
                    Array.from({ length: numCollections }, () => rand.nextInt(boundaryProb)).reduce(
                        (acc, val) => acc + (intBoundSet.has(val) ? 1 : 0),
                        0
                    ) / numCollections
                expect(Math.abs(ratio - boundaryProb)).toBeLessThan(0.1)
                maxDiff = Math.max(maxDiff, Math.abs(ratio - boundaryProb))
            }
        }
        console.log('nextInt boundary generation w/ prob maxDiff:', maxDiff)
    })

    it('inRange', () => {
        // test inRange and check even distribution
        const rand: Random = new Random()
        const numCollections = 1000
        const numTries = 100
        let maxDiff = 0
        for (let i = 0; i < numTries; i++) {
            for (let [min, max] of [
                [0, 2],
                [0, 3],
                [0, 4],
                [0, 8],
                [0, 20],
            ]) {
                // count the number of occurrence of generation and check if it is evenly distributed
                const count = Array.from({ length: numCollections }, () => rand.inRange(min, max)).reduce(
                    (acc: Map<number, number>, val) => {
                        if (acc.has(val)) acc.set(val, acc.get(val)! + 1)
                        else acc.set(val, 1)
                        return acc
                    },
                    new Map<number, number>()
                )
                const ratio = Array.from(count.values()).map(val => val / numCollections)
                // sum of ratio should be 1
                expect(ratio.reduce((acc, val) => acc + val)).toBeCloseTo(1)
                const diff = Math.max(...ratio) - Math.min(...ratio)
                expect(Math.min(...ratio)).toBeGreaterThan(0)
                expect(diff).toBeLessThan(0.4) // 0.4 is arbitrary
                maxDiff = Math.max(maxDiff, diff)
            }
        }
        console.log('inRange value generation ratio min-max maxDiff:', maxDiff)
    })

    it('clone', () => {
        const rand: Random = new Random('0')
        rand.nextBoolean()
        rand.nextInt()
        const copy1 = rand.clone()
        expect(JSON.stringify(rand)).toBe(JSON.stringify(copy1))
        const val1 = rand.nextNumber()
        rand.nextProb()
        const copy2 = rand.clone()
        const val2 = rand.nextLong()
        const copy1val1 = copy1.nextNumber()
        const copy2val2 = copy2.nextLong()
        expect(val1 === copy1val1).toBe(true)
        expect(val2 === copy2val2).toBe(true)
    })
})
