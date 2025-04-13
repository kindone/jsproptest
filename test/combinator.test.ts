import { forAll, Gen } from '../src'

describe('combinator', () => {
    // Tests the oneOf combinator which randomly selects between two generators
    // Verifies that values are correctly chosen from either range and maintains roughly equal distribution
    it('Gen.oneOf', () => {
        // Create two generators: one for numbers 1-3 and another for numbers 6-8
        const numGen1 = Gen.interval(1, 3)
        const numGen2 = Gen.interval(6, 8)
        // Combine them into a single generator that randomly chooses between the two
        const gen1 = Gen.oneOf(numGen1, numGen2)
        let countGen1 = 0
        let countGen2 = 0
        // Test that generated numbers are within expected ranges and maintain roughly equal distribution
        forAll((num: number) => {
            // Verify the number is within the combined range of both generators
            expect(num).toBeGreaterThanOrEqual(1)
            expect(num).toBeLessThanOrEqual(8)
            // Verify the number isn't in the gap between the two ranges
            expect(num > 3 && num < 6).toBe(false)
            // Track which generator produced the number
            if (num >= 1 && num <= 3) countGen1++
            else countGen2++
        }, gen1)
        // Verify the distribution is roughly equal (35-65% split)
        expect(countGen1 / (countGen1 + countGen2)).toBeGreaterThan(0.35)
        expect(countGen1 / (countGen1 + countGen2)).toBeLessThan(0.65)
    })

    // Tests the oneOf combinator with weighted selection
    // Verifies that the first generator is chosen more frequently (80% of the time) than the second
    it('Gen.oneOf weighted', () => {
        // Create the same two generators as before
        const numGen1 = Gen.interval(1, 3)
        const numGen2 = Gen.interval(6, 8)
        // Create a weighted generator where numGen1 has 80% chance of being selected
        const gen2 = Gen.oneOf(Gen.weightedGen(numGen1, 0.8), numGen2)
        let countGen1 = 0
        let countGen2 = 0
        // Test that generated numbers follow the weighted distribution
        forAll((num: number) => {
            // Verify the number is within the combined range
            expect(num).toBeGreaterThanOrEqual(1)
            expect(num).toBeLessThanOrEqual(8)
            // Verify the number isn't in the gap between ranges
            expect(num > 3 && num < 6).toBe(false)
            // Track which generator produced the number
            if (num >= 1 && num <= 3) countGen1++
            else countGen2++
        }, gen2)
        // Verify the distribution matches the weights (70-90% for the weighted generator)
        expect(countGen1 / (countGen1 + countGen2)).toBeGreaterThan(0.7)
        expect(countGen1 / (countGen1 + countGen2)).toBeLessThan(0.9)
    })

    // Tests the elementOf combinator which randomly selects from a list of values
    // Verifies that all possible values are generated and distribution is roughly equal
    it('Gen.elementOf', () => {
        // Create a generator that randomly selects from these four numbers
        const gen1 = Gen.elementOf<number>(2, 10, -1, 7)
        let count2 = 0
        let countAll = 0
        // Test that all possible values are generated with roughly equal probability
        forAll((num: number) => {
            // Verify the number is one of the allowed values
            expect([2, 10, -1, 7]).toContain(num)
            // Track how often we get the number 2
            if (num === 2) count2++
            countAll++
        }, gen1)
        // Verify that number 2 appears roughly 25% of the time (10-30% to account for randomness)
        expect(count2 / countAll).toBeGreaterThan(0.1)
        expect(count2 / countAll).toBeLessThan(0.3)
    })

    // Tests the elementOf combinator with weighted selection
    // Verifies that the first value (1) is chosen more frequently (80% of the time) than the second value (10)
    it('Gen.elementOf weighted', () => {
        // Create a generator that selects between 1 and 10, with 1 having 80% probability
        const gen2 = Gen.elementOf<number>(Gen.weightedValue(1, 0.8), 10)
        let count1 = 0
        let count10 = 0
        // Test that the weighted distribution is maintained
        forAll((num: number) => {
            // Verify the number is either 1 or 10
            expect([1, 10]).toContain(num)
            // Track how often we get each number
            if (num === 1) count1++
            else count10++
        }, gen2)
        // Verify that 1 appears roughly 80% of the time (70-90% to account for randomness)
        expect(count1 / (count1 + count10)).toBeGreaterThan(0.7)
        expect(count1 / (count1 + count10)).toBeLessThan(0.9)
    })

    class Cat {
        constructor(readonly a: number, readonly b: string) {}

        toString(): string {
            return `a: ${this.a}, b: ${this.b}`
        }
    }

    // Tests the construct combinator which creates instances of a class
    // Verifies that Cat objects are created with valid property values
    it('Gen.construct', () => {
        // Create a generator for Cat objects with:
        // - a: random number between 1 and 3
        // - b: randomly either 'Cat' or 'Kitten'
        const catGen = Gen.construct(Cat, Gen.interval(1, 3), Gen.elementOf<string>('Cat', 'Kitten'))

        // Test that all generated Cat objects have valid properties
        forAll((cat: Cat) => {
            // Verify the number property is within range
            expect(cat.a).toBeGreaterThanOrEqual(1)
            expect(cat.a).toBeLessThanOrEqual(3)
            // Verify the string property is one of the allowed values
            expect(['Cat', 'Kitten']).toContain(cat.b)
        }, catGen)
    })

    // Tests the chainTuple combinator which creates nested tuples
    // Verifies that each element in the tuple is properly constrained by the previous elements
    it('Gen.chainTuple', () => {
        // Start with a generator for numbers 1-3
        const numGen1 = Gen.interval(1, 3)
        // Create a pair where second number is between 0 and first number
        const pairGen = numGen1.chain(num => Gen.interval(0, num))
        // Create a triple where third number is between 0 and second number
        const tripleGen = Gen.chainTuple(pairGen, pair => Gen.interval(0, pair[1]))
        // Create a quadruple where fourth number is between 0 and third number
        const quadGen = Gen.chainTuple(tripleGen, triple => Gen.interval(0, triple[2]))
        // Test that all numbers in the tuple follow the decreasing constraint
        forAll((quad: [number, number, number, number]) => {
            // First number must be 1-3
            expect(quad[0]).toBeGreaterThanOrEqual(1)
            expect(quad[0]).toBeLessThanOrEqual(3)
            // Second number must be 0 to first number
            expect(quad[1]).toBeGreaterThanOrEqual(0)
            expect(quad[1]).toBeLessThanOrEqual(quad[0])
            // Third number must be 0 to second number
            expect(quad[2]).toBeGreaterThanOrEqual(0)
            expect(quad[2]).toBeLessThanOrEqual(quad[1])
            // Fourth number must be 0 to third number
            expect(quad[3]).toBeGreaterThanOrEqual(0)
            expect(quad[3]).toBeLessThanOrEqual(quad[2])
        }, quadGen)
    })

    // Tests the chainAsTuple combinator which is an alternative syntax for creating nested tuples
    // Verifies the same constraints as chainTuple but using a different method chaining approach
    it('Gen.chainAsTuple', () => {
        // Start with the same base generator
        const numGen1 = Gen.interval(1, 3)
        // Create the same nested structure using method chaining
        const quadGen = numGen1
            // First chain: second number between 0 and first number
            .chain(num => Gen.interval(0, num))
            // Second chain: third number between 0 and second number
            .chainAsTuple((pair: [number, number]) => Gen.interval(0, pair[1]))
            // Third chain: fourth number between 0 and third number
            .chainAsTuple((triple: [number, number, number]) => Gen.interval(0, triple[2]))

        // Test the same constraints as in chainTuple
        forAll((quad: [number, number, number, number]) => {
            // First number must be 1-3
            expect(quad[0]).toBeGreaterThanOrEqual(1)
            expect(quad[0]).toBeLessThanOrEqual(3)
            // Second number must be 0 to first number
            expect(quad[1]).toBeGreaterThanOrEqual(0)
            expect(quad[1]).toBeLessThanOrEqual(quad[0])
            // Third number must be 0 to second number
            expect(quad[2]).toBeGreaterThanOrEqual(0)
            expect(quad[2]).toBeLessThanOrEqual(quad[1])
            // Fourth number must be 0 to third number
            expect(quad[3]).toBeGreaterThanOrEqual(0)
            expect(quad[3]).toBeLessThanOrEqual(quad[2])
        }, quadGen)
    })
})
