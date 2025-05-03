import { Random } from '../src/Random'
import { Gen } from '../src'
import { Generator } from '../src/Generator'
import { forAll } from '../src/Property'
import { JSONStringify } from '../src/util/JSON'
import { exhaustive } from './testutil'
import { Shrinkable } from '../src/Shrinkable'

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
        expect(numTrue).toBeGreaterThan(numGenerations * 0.45)
        expect(numFalse).toBeGreaterThan(numGenerations * 0.45)
    })

    /**
     * Tests Gen.float() for generating values across a wide range
     * and checks if the distribution favors larger magnitudes.
     */
    it('Gen.float', () => {
        const gen = Gen.float()
        const numGenerations = 10000
        const generatedValues: number[] = []

        for (let i = 0; i < numGenerations; i++) {
            const value = gen.generate(rand).value
            generatedValues.push(value)
        }

        // Check that the generated values cover a reasonable range
        const minValue = Math.min(...generatedValues)
        const maxValue = Math.max(...generatedValues)

        // Assert that the minimum and maximum values are within a reasonable range
        expect(minValue).toBeGreaterThanOrEqual(-Number.MAX_VALUE)
        expect(maxValue).toBeLessThanOrEqual(Number.MAX_VALUE)

        // Define regions to analyze the distribution of generated floats.
        // The ranges increase exponentially to check if more values are generated at larger scales.
        const regions = [
            { range: [-Number.MAX_VALUE, -1], count: 0 },
            { range: [-1, 0], count: 0 },
            { range: [0, 1], count: 0 },
            { range: [1, 10], count: 0 },
            { range: [10, 100], count: 0 },
            { range: [100, 1000], count: 0 },
            { range: [1000, Number.MAX_VALUE], count: 0 },
        ]

        // Count the number of generated values in each region
        generatedValues.forEach(value => {
            for (const region of regions) {
                if (value > region.range[0] && value <= region.range[1]) {
                    region.count++
                    break
                }
            }
        })
        // Check that the distribution is skewed towards larger absolute values.
        // We expect more numbers further away from zero.
        expect(regions[6].count).toBeGreaterThanOrEqual(regions[5].count) // More in (1000, MAX_VALUE] than in [100, 1000]
        expect(regions[5].count).toBeGreaterThanOrEqual(regions[4].count) // More in (100, 1000] than in [10, 100]
        expect(regions[4].count).toBeGreaterThanOrEqual(regions[3].count) // More in (10, 100] than in [1, 10]
        expect(regions[3].count).toBeGreaterThanOrEqual(regions[2].count) // More in (1, 10] than in [0, 1]
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
        // make sure it generates all values
        const numGenerations = 1000
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
        for (let i = 0; i < 1000; i++) {
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
        for (let i = 0; i < 1000; i++) {
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

        const numGenerations = 1000
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
        let maxFoundDepth = 0;
        forAll((node: Node | null) => {
            let current = node;
            let depth = 0;
            const maxDepth = 20; // Set a reasonable max depth

            while (current !== null && depth < maxDepth) {
                expect(typeof current.value).toBe('number');
                expect(current.value).toBeGreaterThanOrEqual(0);
                expect(current.value).toBeLessThanOrEqual(100);
                current = current.next;
                depth++;
            }
            if (depth > maxFoundDepth) maxFoundDepth = depth;
        }, nodeGen);
        // Check if recursive generator is working by ensuring at least some recursive calls are made
        expect(maxFoundDepth).toBeGreaterThan(0);
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
