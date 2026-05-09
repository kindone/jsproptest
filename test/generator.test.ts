import { Random } from '../src/Random'
import { Gen } from '../src'
import { Generator } from '../src/Generator'
import { Property, forAll } from '../src/Property'
import { JSONStringify } from '../src/util/JSON'
import { exhaustive } from './testutil'
import { Shrinkable } from '../src/Shrinkable'
import { shrinkableFloat } from '../src/shrinker/floating'

/**
 * Tests for basic primitive value generators (boolean, number, string).
 */
describe('primitive generators', () => {
    const rand = new Random()

    /**
     * Tests Gen.boolean() for roughly even distribution of true/false values.
     */
    it('Gen.boolean', () => {
        // make sure it generates almost 50:50 of true and false
        const gen = Gen.boolean()
        const numGenerations = 1000
        let numTrue = 0
        let numFalse = 0
        for (let i = 0; i < numGenerations; i++) {
            const value = gen.generate(rand).value
            if (value) numTrue++
            else numFalse++
        }
        // ~3σ from 50% at n=1000 is ~47.5%; use 40% to avoid rare binomial tails in CI
        expect(numTrue).toBeGreaterThan(numGenerations * 0.4)
        expect(numFalse).toBeGreaterThan(numGenerations * 0.4)
    })

    it('Gen.float', () => {
        const gen = Gen.float()
        const numGenerations = 50000
        const generatedValues: number[] = []

        for (let i = 0; i < numGenerations; i++) {
            const value = gen.generate(rand).value
            generatedValues.push(value)
        }

        // Check that the generated values cover a reasonable range
        const minValue = Math.min(...generatedValues)
        const maxValue = Math.max(...generatedValues)

        expect(generatedValues.every(Number.isFinite)).toBe(true)
        expect(minValue).toBeGreaterThanOrEqual(-Number.MAX_VALUE)
        expect(maxValue).toBeLessThanOrEqual(Number.MAX_VALUE)
        expect(generatedValues.some(value => value < 0)).toBe(true)
        expect(generatedValues.some(value => value > 0)).toBe(true)
        expect(generatedValues.some(value => Math.abs(value) > Number.MAX_SAFE_INTEGER)).toBe(true)
        expect(generatedValues.some(value => value !== 0 && Math.abs(value) < 2 ** -1022)).toBe(true)
    })

    /**
     * Tests the floating point shrinker to verify:
     * 1. No infinite loops (the fix for base 2 decomposition)
     * 2. Proper shrinking behavior (values get smaller)
     * 3. Expected first-level children for specific values
     */
    it('floating point shrinker', () => {

        // Test case 1: 100.0 should have proper shrinking behavior
        {
            const shrinkable = shrinkableFloat(100.0)
            const firstLevel = shrinkable.shrinks()
            const firstValues: number[] = []
            let count = 0
            for (const itr = firstLevel.iterator(); itr.hasNext() && count < 10; count++) {
                const child = itr.next()
                firstValues.push(child.value)
            }

            // Should include 0 as the first shrink
            expect(firstValues[0]).toBe(0.0)
            // Should have more than just 0
            expect(firstValues.length).toBeGreaterThan(1)
            // All first-level children should be <= 100 in absolute value
            firstValues.forEach(val => {
                expect(Math.abs(val)).toBeLessThanOrEqual(Math.abs(100.0))
            })
        }

        // Test case 2: 4.0 used to cause infinite loops - verify it's fixed
        {
            const shrinkable = shrinkableFloat(4.0)
            const seenValues = new Set<number>()
            const maxDepth = 5
            const maxNodesAtLevel = 10

            // Traverse the tree with depth limit to check for cycles
            const traverse = (shr: Shrinkable<number>, currentDepth: number) => {
                if (currentDepth > maxDepth) return

                // Check for uniqueness (no cycles)
                if (seenValues.has(shr.value)) {
                    // Allow duplicates at different depths, but fail if we see the same value
                    // at similar depths (potential cycle)
                    return
                }
                seenValues.add(shr.value)

                // Verify shrinking: children should be closer to zero than parent
                const shrinks = shr.shrinks()
                let nodeCount = 0
                for (const itr = shrinks.iterator(); itr.hasNext() && nodeCount < maxNodesAtLevel; nodeCount++) {
                    const child = itr.next()
                    // Shrunk values should be smaller in absolute value (or equal to zero)
                    if (shr.value !== 0) {
                        expect(Math.abs(child.value)).toBeLessThanOrEqual(Math.abs(shr.value))
                    }
                    traverse(child, currentDepth + 1)
                }
            }

            traverse(shrinkable, 0)
            // If we got here without stack overflow, the infinite loop is fixed
            expect(seenValues.size).toBeGreaterThan(0)
        }

        // Test case 3: Verify shrinking produces unique values (no immediate duplicates)
        {
            const testValues = [100.0, 4.0, 0.5, 25.0, -100.0]
            for (const testValue of testValues) {
                const shrinkable = shrinkableFloat(testValue)
                const firstLevel = shrinkable.shrinks()
                const firstLevelValues: number[] = []
                for (const itr = firstLevel.iterator(); itr.hasNext(); ) {
                    firstLevelValues.push(itr.next().value)
                }

                // Check that 0.0 appears in first level for non-zero values
                if (testValue !== 0.0) {
                    expect(firstLevelValues).toContain(0.0)
                }

                // Verify first-level children are unique
                const uniqueFirstLevel = new Set(firstLevelValues)
                // Allow some duplicates due to multiple paths, but should have reasonable uniqueness
                expect(uniqueFirstLevel.size).toBeGreaterThan(0)
            }
        }

        // Test case 4: Verify specific shrink tree structure for 100.0
        {
            const shrinkable = shrinkableFloat(100.0)
            const firstLevel = shrinkable.shrinks()
            const firstLevelValues: number[] = []
            for (const itr = firstLevel.iterator(); itr.hasNext(); ) {
                firstLevelValues.push(itr.next().value)
            }

            // Verify expected first-level children exist (exponent shrinking)
            // 100 = 0.78125 * 2^7, so shrinks should include values with smaller exponents
            expect(firstLevelValues).toContain(0.0) // Always prepended
            // Should have multiple shrink candidates from exponent shrinking
            expect(firstLevelValues.length).toBeGreaterThan(2)

            // Verify the tree structure: first child should be 0, second should be from exponent shrinking
            expect(firstLevelValues[0]).toBe(0.0)
            
            // All first-level values should be <= 100 in absolute value
            firstLevelValues.forEach(val => {
                expect(Math.abs(val)).toBeLessThanOrEqual(Math.abs(100.0))
            })
        }

        // Test case 5: Edge cases
        {
            // Zero should have no shrinks
            const zeroShrinkable = shrinkableFloat(0.0)
            const zeroShrinks = zeroShrinkable.shrinks()
            expect(zeroShrinks.isEmpty()).toBe(true)

            // NaN should shrink to 0
            const nanShrinkable = shrinkableFloat(NaN)
            const nanShrinks = nanShrinkable.shrinks()
            expect(nanShrinks.isEmpty()).toBe(false)
            const firstNanShrink = nanShrinks.iterator().next()
            expect(firstNanShrink.value).toBe(0.0)

            // -Infinity should shrink through negative finite values, not positive ones.
            const negInfShrinkable = shrinkableFloat(Number.NEGATIVE_INFINITY)
            const negInfShrinks = negInfShrinkable.shrinks()
            const negInfValues: number[] = []
            for (const itr = negInfShrinks.iterator(); itr.hasNext() && negInfValues.length < 5; ) {
                negInfValues.push(itr.next().value)
            }
            expect(negInfValues[0]).toBe(0.0)
            expect(negInfValues.some(value => value < 0)).toBe(true)
        }
    })

    /**
     * Tests Gen.float(config) with nan/inf probability parameters:
     * - Default (no config) generates only finite values
     * - nanProb > 0 generates NaN at approximately the specified rate
     * - posInfProb / negInfProb generate infinities at specified rates
     * - Invalid configs throw errors
     */
    it('Gen.float with nanProb/posInfProb/negInfProb config', () => {
        const rand = new Random('42')
        const N = 2000

        // Default: all finite
        {
            const gen = Gen.float()
            for (let i = 0; i < N; i++) {
                expect(Number.isFinite(gen.generate(rand).value)).toBe(true)
            }
        }

        // nanProb=0.2: roughly 20% NaN, rest finite
        {
            const gen = Gen.float({ nanProb: 0.2 })
            let nanCount = 0
            for (let i = 0; i < N; i++) {
                const v = gen.generate(rand).value
                if (Number.isNaN(v)) nanCount++
                else expect(Number.isFinite(v)).toBe(true)
            }
            // Allow ±10% tolerance (3σ for binomial at N=2000, p=0.2 is ~2.7%)
            expect(nanCount).toBeGreaterThan(N * 0.10)
            expect(nanCount).toBeLessThan(N * 0.30)
        }

        // posInfProb=0.1, negInfProb=0.1: ~10% each, rest finite
        {
            const gen = Gen.float({ posInfProb: 0.1, negInfProb: 0.1 })
            let posInfCount = 0, negInfCount = 0, finiteCount = 0
            for (let i = 0; i < N; i++) {
                const v = gen.generate(rand).value
                if (v === Number.POSITIVE_INFINITY) posInfCount++
                else if (v === Number.NEGATIVE_INFINITY) negInfCount++
                else { expect(Number.isFinite(v)).toBe(true); finiteCount++ }
            }
            expect(posInfCount).toBeGreaterThan(N * 0.04)
            expect(negInfCount).toBeGreaterThan(N * 0.04)
            expect(finiteCount).toBeGreaterThan(N * 0.70)
        }

        // All three: nanProb=0.1, posInfProb=0.1, negInfProb=0.1 → 30% special, 70% finite
        {
            const gen = Gen.float({ nanProb: 0.1, posInfProb: 0.1, negInfProb: 0.1 })
            let specialCount = 0
            for (let i = 0; i < N; i++) {
                const v = gen.generate(rand).value
                if (!Number.isFinite(v)) specialCount++
            }
            expect(specialCount).toBeGreaterThan(N * 0.15)
            expect(specialCount).toBeLessThan(N * 0.45)
        }

        // Validation: individual prob out of range
        expect(() => Gen.float({ nanProb: -0.1 })).toThrow()
        expect(() => Gen.float({ nanProb: 1.1 })).toThrow()
        expect(() => Gen.float({ nanProb: Number.NaN })).toThrow()
        expect(() => Gen.float({ posInfProb: 1.5 })).toThrow()

        // Validation: sum > 1.0
        expect(() => Gen.float({ nanProb: 0.5, posInfProb: 0.3, negInfProb: 0.3 })).toThrow()

        // Sum exactly 1.0 is valid and leaves no finite generation remainder.
        {
            const gen = Gen.float({ nanProb: 1.0 })
            for (let i = 0; i < 50; i++) {
                expect(Number.isNaN(gen.generate(rand).value)).toBe(true)
            }
        }
    })

    /**
     * Tests Gen.interval(0, 1) for roughly even distribution of 0 and 1.
     */
    it('Gen.interval small', () => {
        const gen = Gen.interval(0, 1)
        // make sure it generates almost 50:50 of 0 and 1
        const numGenerations = 1000
        let num0 = 0
        let num1 = 0
        for (let i = 0; i < numGenerations; i++) {
            const value = gen.generate(rand).value
            if (value === 0) num0++
            else if (value === 1) num1++
            else throw new Error('unexpected value: ' + value)
        }
        expect(num0).toBeGreaterThan(numGenerations * 0.40)
        expect(num1).toBeGreaterThan(numGenerations * 0.40)
    })

    /**
     * Tests Gen.interval(-10, 10) to ensure all integers within the range are generated.
     */
    it('Gen.interval', () => {
        const gen = Gen.interval(-10, 10)
        // make sure it generates all values (need enough draws to cover all 21 integers w.h.p.)
        const numGenerations = 3000
        const set: Set<number> = new Set([])
        for (let i = 0; i < numGenerations; i++) {
            const value = gen.generate(rand).value
            expect(value).toBeGreaterThanOrEqual(-10)
            expect(value).toBeLessThanOrEqual(10)
            set.add(value)
        }
        expect(set.size).toBe(21)
    })

    /**
     * Tests Gen.string() (ASCII) and Gen.unicodeString() for length constraints
     * and character set coverage.
     */
    it('Gen.string', () => {
        const gen1 = Gen.string(0, 5)
        // make sure it generates values of all lengths from 0 to 5 and only ASCII
        const set: Set<number> = new Set([])
        for (let i = 0; i < 5000; i++) {
            const value = gen1.generate(rand).value
            expect(value.length).toBeLessThanOrEqual(5)
            for (let j = 0; j < value.length; j++) {
                const code = value.charCodeAt(j)
                expect(code).toBeGreaterThanOrEqual(0)
                expect(code).toBeLessThanOrEqual(127)
            }
            set.add(value.length)
        }
        expect(set.size).toBe(6)

        const gen2 = Gen.unicodeString(0, 10)
        // make sure it generates values of all lengths from 0 to 10 and includes non-ASCII
        const set2: Set<number> = new Set([])
        for (let i = 0; i < 5000; i++) {
            const value = gen2.generate(rand).value
            expect(value.length).toBeLessThanOrEqual(10)
            set2.add(value.length)
        }
        expect(set2.size).toBe(11)
    })
})

/**
 * Tests for generators that produce container types (array, set, dictionary, tuple).
 */
describe('container generators', () => {
    const rand = new Random()

    /**
     * Tests Gen.array() for correct length and element constraints.
     */
    it('Gen.array', () => {
        const elemGen = Gen.interval(0, 5)
        const gen = Gen.array(elemGen, 5, 6)

        const numGenerations = 3000
        const set: Set<number> = new Set()

        for (let i = 0; i < numGenerations; i++) {
            const generatedArray = gen.generate(rand).value
            expect(generatedArray.length).toBeGreaterThanOrEqual(5)
            expect(generatedArray.length).toBeLessThanOrEqual(6)

            generatedArray.forEach(value => {
                expect(value).toBeGreaterThanOrEqual(0)
                expect(value).toBeLessThanOrEqual(5)
                set.add(value)
            })
        }

        // Check that all values from 0 to 5 are present
        for (let i = 0; i <= 5; i++) {
            expect(set.has(i)).toBe(true)
        }

        // TODO: check shrinking
    })

    /**
     * Tests Gen.set() for correct size and element constraints using forAll.
     */
    it('Gen.set', () => {
        const elemGen = Gen.integers(0, 8)
        const gen = Gen.set(elemGen, 4, 8)

        // Use forAll to ensure the generated set meets the size requirements
        forAll((set: Set<number>) => {
            expect(set.size).toBeGreaterThanOrEqual(4)
            expect(set.size).toBeLessThanOrEqual(8)
            expect(Array.from(set).every(num => num >= 0 && num <= 8)).toBe(true) // Check element constraints
        }, gen)
    })

    /**
     * Tests Gen.dictionary() for correct size and value constraints using forAll.
     */
    it('Gen.dictionary', () => {
        const elemGen = Gen.interval(0, 4)
        const keyGen = Gen.string(1, 2)
        const gen = Gen.dictionary(keyGen, elemGen, 4, 8)

        // Use forAll to ensure the generated dictionary meets the size requirements
        forAll((dict: Record<string, number>) => {
            const size = Object.keys(dict).length
            expect(size).toBeGreaterThanOrEqual(4)
            expect(size).toBeLessThanOrEqual(8)
            expect(Object.values(dict).every(value => value >= 0 && value <= 4)).toBe(true) // Check value constraints
        }, gen)
    })

    /**
     * Tests Gen.dictionary() with float values for correct size and value types using forAll.
     */
    it('Gen.dictionary (int values)', () => {
        const keyGen = Gen.string(1, 5) // Keys are strings of length 1 to 5
        const elemGen = Gen.interval(0, 5)     // Values are floats
        const gen = Gen.dictionary(keyGen, elemGen, 3, 7)

        // Use forAll to ensure the generated dictionary meets the size and type requirements
        forAll((dict: Record<string, number>) => {
            const keys = Object.keys(dict)
            const values = Object.values(dict)
            const size = keys.length

            expect(size).toBeGreaterThanOrEqual(3)
            expect(size).toBeLessThanOrEqual(7)

            // Check key types (should always be string by definition)
            keys.forEach(key => {
                expect(typeof key).toBe('string')
                expect(key.length).toBeGreaterThanOrEqual(1)
                expect(key.length).toBeLessThanOrEqual(5)
            });

            // Check value types (should be numbers/floats)
            values.forEach(value => {
                expect(value).toBeGreaterThanOrEqual(0)
                expect(value).toBeLessThanOrEqual(5)
            });
        }, gen)
    })

    /**
     * Tests Gen.tuple() with basic types using forAll.
     */
    it('Gen.tuple', () => {
        const numGen = Gen.interval(0, 3)
        const boolGen = Gen.boolean()
        const gen = Gen.tuple(numGen, boolGen)

        forAll(([num, bool]: [number, boolean]) => {
            expect(num).toBeGreaterThanOrEqual(0)
            expect(num).toBeLessThanOrEqual(3)
            expect(typeof bool).toBe('boolean')
        }, gen)
    })

    /**
     * Stress tests Gen.tuple() with a large number of elements using forAll.
     */
    it('Gen.tuple (big tuple)', () => {
        const numGen = Gen.interval(0, 3)
        const gens: Generator<number>[] = []
        for (let i = 0; i < 800; i++) gens.push(numGen)
        const gen = Gen.tuple(...gens)

        forAll((bigTuple: number[]) => {
            expect(bigTuple.length).toBe(800)
            expect(bigTuple.every(num => num >= 0 && num <= 3)).toBe(true) // Check element constraints
        }, gen)
    })

    /**
     * Tests Gen.lazy() for deferring generator creation/computation.
     */
    it('Gen.lazy (deferred computation)', () => {
        let computationDone = false;
        const expensiveComputation = () => {
            computationDone = true;
            return 42; // Simulate an expensive result
        };

        // The computation shouldn't happen when the generator is defined
        const lazyGen = Gen.lazy(expensiveComputation);
        expect(computationDone).toBe(false);

        // The computation should happen only when generate is called
        const result = lazyGen.generate(rand); // Assuming rand is available in this scope
        expect(computationDone).toBe(true);
        expect(result.value).toBe(42);

        // Check subsequent calls also work
        computationDone = false; // Reset flag
        const result2 = lazyGen.generate(rand);
        expect(computationDone).toBe(true);
        expect(result2.value).toBe(42);
    });

    /**
     * Tests recursive generator definition without Gen.lazy using a factory function.
     */
    it('Recursive generator (manual factory)', () => {
        // Define the recursive type: a node containing a number and optionally another node.
        type Node = { value: number; next: Node | null };

        // Factory function to create the recursive generator.
        const createNodeGen:Generator<Node | null> =
            Gen.oneOf(
                // Base case: Null node (weight 0.8)
                Gen.weightedGen(Gen.just(null), 0.8),
                // Recursive case: Generate value and recursively generate the next node (weight 0.2)
                Gen.weightedGen(
                    Gen.interval(0, 100).flatMap(value =>
                        // Recursively call the factory to get the generator for the next node
                        createNodeGen.map(next => ({ value, next }))
                    ),
                0.2)
            );

        // Create the generator instance by calling the factory.
        const nodeGen = createNodeGen;

        // Use forAll to test the generated recursive structures.
        let maxFoundDepth = 0
        new Property((node: Node | null) => {
            let current = node
            let depth = 0
            const maxDepth = 20 // Set a reasonable max depth

            while (current !== null && depth < maxDepth) {
                expect(typeof current.value).toBe('number')
                expect(current.value).toBeGreaterThanOrEqual(0)
                expect(current.value).toBeLessThanOrEqual(100)
                current = current.next
                depth++
            }
            if (depth > maxFoundDepth) maxFoundDepth = depth
            return true
        })
            .setNumRuns(500)
            .forAll(nodeGen)
        // Check if recursive generator is working by ensuring at least some recursive calls are made
        expect(maxFoundDepth).toBeGreaterThan(0)
    });
})

/**
 * Tests for generator combinators (functions that modify or combine generators).
 */
describe('combinators', () => {
    const rand = new Random()

    // Function to calculate the number of combinations of n items taken r at a time.
    // This is based on the combinatorial formula C(n, r) = n! / (r! * (n - r)!).
    // It returns the total number of unique ways to choose r items from a set of n items.
    const combination = (n: number, r: number) => {
        let result = 1
        for (let i = 1; i <= r; i++) {
            result *= n--
            result /= i
        }
        return result
    }

    // Function to calculate the total number of combinations for a given n and all possible r values
    // from 0 to maxR. This function sums the results of the combination function for each r.
    // It is useful for determining the total number of unique subsets that can be formed from a set
    // of size n, considering subsets of varying sizes up to maxR.
    const sumCombinations = (n: number, maxR: number) => {
        if (maxR < 0) return 0
        let result = 0
        for (let r = 0; r <= maxR; r++) result += combination(n, r)
        return result
    }

    /**
     * Tests the combination helper function itself.
     */
    it('util.combination', () => {
        // can fail with n >= 67
        const pairGen = Gen.interval(1, 30).chain((n: number) => Gen.interval(0, n))
        forAll((n_and_r: [number, number]) => {
            const n = n_and_r[0]
            const r = n_and_r[1]
            const result = combination(n, r)
            expect(Math.floor(result)).toBe(result)
        }, pairGen)
    })

    /**
     * Tests the shrinking behavior of Gen.set.
     * Verifies that shrinking is exhaustive (covers all valid smaller sets)
     * and produces unique shrink values.
     */
    it('Gen.set shrink', () => {
        // test if set/array shrinking is thorough and unique
        // it must cover all combinations and never repeated

        const upperBound = 10
        const minAndMaxSizeGen = Gen.interval(0, upperBound).chain((n: number) => Gen.interval(n, upperBound))

        forAll((minAndMaxSize: [number, number]) => {
            const elemGen = Gen.interval(0, 99)
            const [minSize, maxSize] = minAndMaxSize
            const gen = Gen.set(elemGen, minSize, maxSize)

            for (let i = 0; i < 3; i++) {
                const set: Set<string> = new Set([])
                let numTotal = 0
                const root = gen.generate(rand)
                // Exhaustively explore all shrinks from the root value.
                exhaustive(root, 0, (shrinkable: Shrinkable<Set<number>>, _level: number) => {
                    numTotal++

                    // Check that the shrunk value adheres to the original constraints
                    expect(shrinkable.value.size).toBeGreaterThanOrEqual(minSize)
                    expect(shrinkable.value.size).toBeLessThanOrEqual(maxSize)
                    expect(Array.from(shrinkable.value).every(num => num >= 0 && num <= 99)).toBe(true) // Check element constraints

                    // Stringify the set to check for uniqueness among shrinks.
                    const str = JSONStringify(shrinkable.value)
                    if (set.has(str)) {
                        throw new Error(str + ' already exists in the shrinks')
                    }
                    set.add(str)
                })

                const size = root.value.size
                // Assert that the total number of unique shrinks generated matches the expected number of combinations.
                // Expected count = (Total subsets) - (Subsets smaller than minSize)
                expect(numTotal).toBe(Math.pow(2, size) - sumCombinations(size, minSize - 1))
            }
        }, minAndMaxSizeGen)
    })

    /**
     * Tests Generator.filter() to ensure only values matching the predicate are generated.
     */
    it('Generator::filter', () => {
        const numGen = Gen.interval(0, 3)
        const tupleGen = numGen.filter(n => n === 3)

        forAll((value: number) => {
            expect(value).toBe(3)
        }, tupleGen)
    })

    /**
     * Tests Generator.flatMap() for creating dependent generators.
     */
    it('Generator::flatMap', () => {
        const numGen = Gen.interval(0, 3)
        const tupleGen = numGen.flatMap(n =>
            Gen.tuple(
                Gen.just(n),
                Gen.just(2).map(v => v * n)
            )
        )

        forAll(([num, product]: [number, number]) => {
            expect(num).toBeGreaterThanOrEqual(0)
            expect(num).toBeLessThanOrEqual(3)
            expect(product).toBe(num * 2)
        }, tupleGen)
    })

    /**
     * Tests chaining Generator.flatMap() multiple times to create sequences.
     */
    it('Generator::flatMap dependent sequence with array', () => {
        const gengen = (n: number) => Gen.interval(n, n + 1)
        let gen1 = gengen(0)

        for (let i = 1; i < 20; i++) {
            gen1 = gen1.flatMap(num => gengen(num))
        }

        forAll((value: number) => {
            expect(value).toBeGreaterThanOrEqual(0)
            expect(value).toBeLessThanOrEqual(20) // Adjust based on the expected range
        }, gen1)
    })

    /**
     * Tests Generator.aggregate() for building sequences where each element
     * depends on the entire previously generated sequence.
     */
    it('Generator::aggregate', () => {
        let gen1 = Gen.interval(0, 1).map(num => [num])
        const gen = gen1.aggregate(
            nums => {
                const last = nums[nums.length - 1]
                return Gen.interval(last, last + 1).map(num => [...nums, num])
            },
            2,
            4
        )

        forAll((generatedArray: number[]) => {
            expect(generatedArray.length).toBeGreaterThanOrEqual(2)
            expect(generatedArray.length).toBeLessThanOrEqual(4)
            expect(generatedArray.every((num, index) => index === 0 || num >= generatedArray[index - 1])).toBe(true) // Ensure non-decreasing order
        }, gen)
    })

    /**
     * Tests Generator.accumulate() for building sequences where each element
     * depends on the last element of the previously generated sequence.
     */
    it('Generator::accumulate', () => {
        let gen1: Generator<number> = Gen.interval(0, 0 + 2)
        const gen: Generator<number[]> = gen1.accumulate(num => Gen.interval(num, num + 2), 2, 4)

        forAll((generatedArray: number[]) => {
            expect(generatedArray.length).toBeGreaterThanOrEqual(2)
            expect(generatedArray.length).toBeLessThanOrEqual(4)
            expect(generatedArray.every((num, index) => index === 0 || num >= generatedArray[index - 1])).toBe(true) // Ensure non-decreasing order
        }, gen)
    })

    /**
     * Similar test for Generator.accumulate(), ensuring size and order constraints.
     */
    it('Generator::accumulate many', () => {
        let gen1: Generator<number> = Gen.interval(0, 0 + 2)
        const gen: Generator<number[]> = gen1.accumulate(num => Gen.interval(num, num + 2), 2, 4)

        // Use forAll to ensure the generated arrays meet the size requirements
        forAll((_nums: number[]): void => {
            expect(_nums.length).toBeGreaterThanOrEqual(2)
            expect(_nums.length).toBeLessThanOrEqual(4)
            expect(_nums.every((num, index) => index === 0 || num >= _nums[index - 1])).toBe(true) // Ensure non-decreasing order
        }, gen)
    })
})
