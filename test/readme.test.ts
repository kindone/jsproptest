import { Property, forAll, Gen } from '../src/index'; // Keep Gen from index
import { deepStrictEqual } from 'assert'; // Use Node.js assert for deep equality

describe('README Examples', () => {

    it('should preserve data after serializing and parsing', () => {
        // Assume we have functions to parse and serialize a simple key-value format
        // (In a real scenario, these would be imported from your code)
        function parseMyDataFormat(str: string): Record<string, string> {
            const result: Record<string, string> = {};
            if (str === '') return result;
            str.split('&').forEach(pair => {
                const parts = pair.split('=', 2); // Split into max 2 parts
                if (parts.length === 2 && parts[0].length > 0) {
                // Basic parsing, handling URL encoding
                try {
                    result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
                } catch (e) {
                    // Handle potential URIError during decoding, maybe skip malformed pairs
                    console.warn(`Skipping malformed pair during parsing: ${pair}`, e);
                }
                }
            });
            return result;
        }

        function serializeMyDataFormat(data: Record<string, string>): string {
            // Sort keys for consistent output order, crucial for round-trip testing
            return Object.keys(data)
                .sort()
                .map(key => {
                // Basic serialization, handling URL encoding
                try {
                    return `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`;
                } catch (e) {
                    // Handle potential URIError during encoding (unlikely for typical strings)
                    console.error(`Error encoding key/value: ${key}=${data[key]}`, e);
                    return ''; // Or throw, depending on desired behavior
                }
                })
                .filter(pair => pair !== '') // Remove pairs that failed encoding
                .join('&');
        }
        // Generator for keys (non-empty strings without '&' or '=')
        const keyGen = Gen.string(1, 10).filter(s => s.length > 0 && !s.includes('&') && !s.includes('='));
        // Generator for arbitrary string values
        const valueGen = Gen.string(0, 10);
        // Generator for objects (dictionaries) with our specific keys and values
        const dataObjectGen = Gen.dictionary(keyGen, valueGen, 1, 10);

        // forAll executes the property check with generated data objects
        forAll(
            (originalData: Record<string, string>) => {
            // Perform the round trip: serialize then parse
            const serialized = serializeMyDataFormat(originalData);
            const parsedData = parseMyDataFormat(serialized);

            // Property: The parsed data must deep-equal the original data object.
            // Using deepStrictEqual ensures type and value equality.
            deepStrictEqual(parsedData, originalData);
            },
            dataObjectGen // Use the dictionary generator
        );
        // jsproptest runs this property multiple times with diverse data objects.
    });


    // Example from Introduction (Lines 18-27)
    it('should return the original array after double reversal (intro)', () => {
        // forAll executes a property check with generated inputs
        forAll(
            (arr: string[]) => {
                // The property assertion: must hold for any generated 'arr'
                expect([...arr].reverse().reverse()).toEqual(arr);
            },
            Gen.array(Gen.string(0, 10), 0, 10) // Generator producing arrays of strings - REMOVED Type Assertion
        );
        // jsproptest runs this property multiple times with diverse arrays.
    });

    // Example from Defining Properties with new Property (Lines 121-130)
    describe('Defining Properties with new Property(...)', () => {
        it('should handle explicit Property creation and execution', () => {
            // Property: The sum of two non-negative numbers is non-negative
            const sumProperty = new Property((a: number, b: number) => {
                expect(a + b).toBeGreaterThanOrEqual(0); // Using jest assertions
                // Or: return a + b >= 0;
            });

            // Running the property
            // Running with fewer runs for test speed
            sumProperty.setNumRuns(20).forAll(Gen.interval(0, 100), Gen.interval(0, 100));
        });

        it('should run property.example() correctly', () => {
            // Example from property.example (Lines 136-137)
            const greaterThanProp = new Property((a: number, b: number) => a > b);
            // Runs the predicate with a=5, b=3 - should pass
            expect(greaterThanProp.example(5, 3)).toBe(true);
             // Runs the predicate with a=3, b=5 - should fail (throw)
            expect(greaterThanProp.example(3, 5)).toBe(false);
        });
    });


    describe('Defining and Running Properties with forAll(...)', () => {
        // Example from forAll (Lines 145-154) - Slightly different generator args
        it('should return original array after double reverse (forAll section)', () => {
            forAll(
                (arr: string[]) => {
                    // Predicate using Jest assertions
                    expect([...arr].reverse().reverse()).toEqual(arr);
                },
                Gen.array(Gen.string(0, 5), 0, 10) // Generator for the 'arr' argument - REMOVED Type Assertion
            ); // Runs the test immediately (default 100 times)
        });

        // Property: String concatenation length (Lines 157-166)
        it('should have correct length after concatenation', () => {
            forAll(
                (s1: string, s2: string) => {
                    // Predicate returning a boolean
                    return (s1 + s2).length === s1.length + s2.length;
                },
                Gen.string(0, 20), // Generator for s1
                Gen.string(0, 20)  // Generator for s2
            );
        });

        // Property: Absolute value is non-negative (Lines 169-175)
        it('should have non-negative absolute value', () => {
            forAll(
                (num: number) => {
                    expect(Math.abs(num)).toBeGreaterThanOrEqual(0);
                },
                Gen.float() // Use float generator
            );
        });

        // Property: Tuple elements follow constraints (Lines 178-187)
        it('should generate tuples with correct constraints', () => {
            forAll(
                ([num, bool]: [number, boolean]) => {
                    expect(num).toBeGreaterThanOrEqual(0);
                    expect(num).toBeLessThanOrEqual(10);
                    expect(typeof bool).toBe('boolean');
                },
                Gen.tuple(Gen.interval(0, 10), Gen.boolean()) // Tuple generator
            );
        });

        // Property: Nested forAll (less common, but possible) (Lines 190-199)
        // NOTE: The original README example property `expect(a > 80 || b < 40).toBe(true)`
        // would not actually cause the outer `expect().toThrow()` to succeed.
        // Modified the inner logic slightly to ensure it *can* fail as intended.
        it('should handle nested properties (and expect failure)', () => {
             expect(() =>
                forAll((a: number) => { // Outer property
                    forAll((b: number) => { // Inner property
                        // This property is modified to fail sometimes, e.g., a=501, b=499
                        if (a > 500 && b < 500) {
                           throw new Error('Intentional failure for testing nested case');
                        }
                        // Original README property: expect(a > 80 || b < 40).toBe(true);
                        // This original assertion would always pass for the given generators.
                    }, Gen.interval(0, 1000)) // Generator for 'b'
                }, Gen.interval(0, 1000)) // Generator for 'a'
            // The outer expect catches the throw from the inner property's failure condition
            ).toThrow(); // Expect the specific error
        });
    });

    describe('Shrinking', () => {
        // Example where shrinking is useful (Lines 207-220)
        // Modified to use Property().setNumRuns().forAll() as per README text
        it('fails and shrinks using Property approach', () => {
            // Generator for pairs [a, b] where a <= b
            const pairGen = Gen.interval(0, 1000)
                .flatMap(a => Gen.tuple(Gen.just(a), Gen.interval(a, 1000)));

            const prop = new Property((tup: [number, number]) => {
                // This property fails if the difference is large
                 expect(tup[1] - tup[0]).toBeLessThanOrEqual(5);
            });

            expect(() =>
                prop.setNumRuns(20).forAll(pairGen)
            // Check if the error message contains the expected shrunk counterexample
            ).toThrow(/property failed \(simplest args found by shrinking\): .*/);
        });
    });
});
