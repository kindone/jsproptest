# Shrinking

When `forAll` (either standalone or called on a `Property` instance) detects a failing test case, it automatically tries to "shrink" the failing input to a simpler version that still causes the failure. This helps pinpoint the root cause.

*   Shrinking explores smaller integers, shorter strings/arrays, subsets of sets, and simpler structures based on how the generators were defined and combined.
*   The error message thrown by `forAll` on failure typically includes the original failing input and the final, shrunk failing input.

```typescript
// Example where shrinking is useful (using standalone forAll)
it('fails and shrinks with standalone forAll', () => {
    // Generator for pairs [a, b] where a <= b
    const pairGen = Gen.interval(0, 1000)
        .flatMap(a => Gen.tuple(Gen.just(a), Gen.interval(a, 1000)));

    expect(() =>
        forAll(
            (tup: [number, number]) => {
                // This property fails if the difference is large
                return tup[1] - tup[0] <= 5;
            },
            pairGen
        )
    ).toThrow(
        // The error message will likely show a shrunk example,
        // e.g., "property failed (simplest args found by shrinking): ..."
    );
});
``` 