# Properties

Properties define the expected behavior of your code over a range of inputs.

## Defining Properties with `new Property(...)`

*   **`new Property<TArgs extends any[]>(predicate: (...args: TArgs) => boolean | void)`**: Creates a property object explicitly. The `predicate` function receives arguments generated according to the generators passed to `forAll`.
    *   If the predicate returns `false` or throws an error, the property fails.
    *   If the predicate returns `true` or `void` (implicitly returns `undefined`), the property passes for that input.

    ```typescript
    // Property: The sum of two non-negative numbers is non-negative
    const sumProperty = new Property((a: number, b: number) => {
        expect(a + b).toBeGreaterThanOrEqual(0); // Using jest assertions
        // Or: return a + b >= 0;
    });

    // Running the property
    sumProperty.setNumRuns(200).forAll(Gen.interval(0, 100), Gen.interval(0, 100));
    ```

*   **`property.setNumRuns(n: number)`**: Configures the number of random test cases to execute when `forAll` is called on a `Property` instance. Returns the `Property` instance for chaining.

*   **`property.example(...args: any[])`**: Runs the property's predicate *once* with the explicitly provided `args`. Useful for debugging specific edge cases.

    ```typescript
    const prop = new Property((a: number, b: number) => a > b);
    prop.example(5, 3); // Runs the predicate with a=5, b=3
    prop.example(3, 5); // returns false
    ```

## Defining and Running Properties with `forAll(...)` (Standalone Function)

*   **`forAll<TArgs extends any[]>(predicate: (...args: TArgs) => boolean | void, ...gens: { [K in keyof TArgs]: Arbitrary<TArgs[K]> })`**: This is the most common and concise way to define and immediately check a property. It implicitly creates and runs the property. You don't need to manually create a `Property` object.

    ```typescript
    // Property: Reversing an array twice yields the original array
    it('should return original array after double reverse', () => {
        forAll(
            (arr: string[]) => {
                // Predicate using Jest assertions
                expect([...arr].reverse().reverse()).toEqual(arr);
            },
            Gen.array(Gen.string(0, 5), 0, 10) // Generator for the 'arr' argument
        ); // Runs the test immediately (default 100 times)
    });

    // Property: String concatenation length
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

    // Property: Absolute value is non-negative
    it('should have non-negative absolute value', () => {
        forAll(
            (num: number) => {
                expect(Math.abs(num)).toBeGreaterThanOrEqual(0);
            },
            Gen.float() // Use float generator
        );
    });

    // Property: Tuple elements follow constraints
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

    // Property: Nested forAll (less common, but possible)
    it('should handle nested properties', () => {
        expect(() =>
            forAll((a: number) => { // Outer property
                forAll((b: number) => { // Inner property
                    // This property fails for large 'a' and small 'b'
                    expect(a > 80 || b < 40).toBe(true)
                }, Gen.interval(0, 1000)) // Generator for 'b'
            }, Gen.interval(0, 1000)) // Generator for 'a'
        ).toThrow(); // We expect this nested structure to fail and throw
    });
    ```
    *Note: The standalone `forAll` runs a default number of times (e.g., 100). To configure the number of runs, you need to use the `new Property(...).setNumRuns(...).forAll(...)` approach.* 