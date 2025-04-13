import { Random } from '../src/Random'

describe('random', () => {
    const NUM_TRIES = 100
    const SAMPLE_SIZE = 1000

    /**
     * Tests the `nextBoolean` method, specifically checking if the generated
     * true/false values occur with the frequency specified by the `trueProb` argument.
     */
    it('nextBoolean', () => {
        // test trueProb
        const rand: Random = new Random()
        let maxDiff = 0
        for (let i = 0; i < NUM_TRIES; i++) {
            for (let trueProb of [0.1, 0.2, 0.5, 0.9, 1.0]) {
                const ratio =
                    Array.from({ length: SAMPLE_SIZE }, () => rand.nextBoolean(trueProb)).reduce(
                        // Count the number of `true` values generated
                        (acc, val) => acc + (val ? 1 : 0),
                        0
                    ) / SAMPLE_SIZE
                expect(Math.abs(ratio - trueProb)).toBeLessThan(0.1)
                maxDiff = Math.max(maxDiff, Math.abs(ratio - trueProb))
            }
        }
        // nextBoolean true/false generation diff w/ trueProb maxDiff:
        expect(maxDiff).toBeLessThan(0.1)
    })

    /**
     * Tests the `nextLong` method, focusing on whether the boundary long values
     * (like min/max safe integer, 0) are generated with the probability
     * specified by `boundaryProb`.
     */
    it('nextLong', () => {
        // test boundary probability
        const rand: Random = new Random()
        let maxDiff = 0
        const longBoundSet = new Set(Random.LONG_BOUNDS)
        for (let i = 0; i < NUM_TRIES; i++) {
            for (let boundaryProb of [0.1, 0.2, 0.5, 0.9, 1.0]) {
                const ratio =
                    Array.from({ length: SAMPLE_SIZE }, () => rand.nextLong(boundaryProb)).reduce(
                        // Count the number of times a boundary value is generated
                        (acc, val) => acc + (longBoundSet.has(val) ? 1 : 0),
                        0
                    ) / SAMPLE_SIZE
                expect(Math.abs(ratio - boundaryProb)).toBeLessThan(0.1)
                maxDiff = Math.max(maxDiff, Math.abs(ratio - boundaryProb))
            }
        }
        // nextLong boundary generation w/ prob maxDiff:
        expect(maxDiff).toBeLessThan(0.1)
    })

    /**
     * Tests the `nextInt` method, focusing on whether the boundary integer values
     * are generated with the probability specified by `boundaryProb`.
     */
    it('nextInt', () => {
        // test boundary probability
        const rand: Random = new Random()
        let maxDiff = 0
        const intBoundSet = new Set(Random.INT_BOUNDS)
        for (let i = 0; i < NUM_TRIES; i++) {
            for (let boundaryProb of [0.1, 0.2, 0.5, 0.9, 1.0]) {
                const ratio =
                    Array.from({ length: SAMPLE_SIZE }, () => rand.nextInt(boundaryProb)).reduce(
                        // Count the number of times a boundary value is generated
                        (acc, val) => acc + (intBoundSet.has(val) ? 1 : 0),
                        0
                    ) / SAMPLE_SIZE
                expect(Math.abs(ratio - boundaryProb)).toBeLessThan(0.1)
                maxDiff = Math.max(maxDiff, Math.abs(ratio - boundaryProb))
            }
        }
        // nextInt boundary generation w/ prob maxDiff:
        expect(maxDiff).toBeLessThan(0.1)
    })

    /**
     * Tests the `inRange` method. Verifies that generated numbers fall within the
     * specified range [min, max) and checks if the distribution is reasonably uniform.
     */
    it('inRange', () => {
        // test inRange and check even distribution
        const rand: Random = new Random()
        let maxDiff = 0
        for (let i = 0; i < NUM_TRIES; i++) {
            for (let [min, max] of [
                [0, 2],
                [0, 3],
                [0, 4],
                [0, 8],
                [0, 20],
            ]) {
                // count the number of occurrence of generation and check if it is evenly distributed
                const count = Array.from({ length: SAMPLE_SIZE }, () => rand.inRange(min, max)).reduce(
                    // Build a frequency map (number -> count)
                    (acc: Map<number, number>, val) => {
                        if (acc.has(val)) acc.set(val, acc.get(val)! + 1)
                        else acc.set(val, 1)
                        return acc
                    },
                    new Map<number, number>()
                )
                const ratio = Array.from(count.values()).map(val => val / SAMPLE_SIZE)
                // sum of ratio should be 1
                expect(ratio.reduce((acc, val) => acc + val)).toBeCloseTo(1)
                const diff = Math.max(...ratio) - Math.min(...ratio)
                expect(Math.min(...ratio)).toBeGreaterThan(0)
                expect(diff).toBeLessThan(0.4) // 0.4 is arbitrary
                maxDiff = Math.max(maxDiff, diff)
            }
        }
        // inRange value generation ratio min-max maxDiff:
        expect(maxDiff).toBeLessThan(0.4)
    })

    /**
     * Tests the `clone` method. Checks if cloning creates an independent copy
     * with the same internal state, ensuring consistent subsequent random number
     * generation between the original and the clone.
     */
    it('clone', () => {
        const rand: Random = new Random()
        rand.nextBoolean() // 1
        rand.nextInt() // 2
        const copy1 = rand.clone() // copied at 2
        expect(JSON.stringify(rand)).toBe(JSON.stringify(copy1))
        const val1 = rand.nextNumber() // 3
        rand.nextProb() // 4
        const copy2 = rand.clone() // copied at 4
        const val2 = rand.nextLong() // 5
        const copy1val1 = copy1.nextNumber() // 3
        const copy2val2 = copy2.nextLong() // 5
        expect(val1 === copy1val1).toBe(true)
        expect(val2 === copy2val2).toBe(true)

        copy1.nextProb() // 4
        copy1.nextLong() // 5
        const copy1val2 = copy1.interval(0, 10) // 6
        const copy2val3 = copy2.interval(0, 10) // 6
        expect(copy1val2 === copy2val3).toBe(true)
    })
})
