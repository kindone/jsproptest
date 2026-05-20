# Stateful Testing

Stateful testing involves defining a sequence of actions or commands that can be applied to a system under test and verifying properties or invariants about the system's state after executing these sequences.

`jsproptest` provides utilities for defining state machines and generating sequences of commands to effectively test stateful systems. It allows you to model the state of your system, define actions that change the state, and automatically run sequences of these actions to find bugs.

## Core Concepts

Stateful testing in `jsproptest` revolves around the `StatefulProperty` class, which orchestrates the test execution. Here are the key components:

1.  **Initial State (`ObjectType`)**: You need a generator (`Generator<ObjectType>`) that produces the initial state of the system under test for each test run.
2.  **Actions (`Action` or `SimpleAction`)**: Actions represent operations that modify the system's state.
    *   `SimpleAction`: Used when you don't need an explicit model. It takes a function `(obj: ObjectType) => void`.
    *   `Action`: Used when you have a model. It takes a function `(obj: ObjectType, model: ModelType) => void` and updates both the real object and the model.
3.  **Model (`ModelType`, Optional)**: A simplified representation of the system's state. It's used to verify the correctness of the actual system's state after each action.
4.  **Model Factory (`modelFactory`, Optional)**: A function `(obj: ObjectType) => ModelType` that creates the initial model state based on the initial object state. Required if using a model.
5.  **Action Generation (`actionGenFactory` or `simpleActionGenFactory`)**: A factory function that returns a generator for the *next* action based on the *current* state of the object (and model, if applicable).
    *   `SimpleActionGenFactory`: `(obj: ObjectType) => Generator<SimpleAction<ObjectType>>`
    *   `ActionGenFactory`: `(obj: ObjectType, model: ModelType) => Generator<Action<ObjectType, ModelType>>`
    `jsproptest` provides helpers like `Gen.simpleActionOf` and `Gen.actionOf` to combine multiple action generators.

## Creating a Stateful Property

You typically use factory functions to create a `StatefulProperty`:

*   **`simpleStatefulProperty<ObjectType>(initialGen, simpleActionGenFactory)`**: Use this when you don't need an explicit model. Checks are usually performed within the `SimpleAction` implementations (e.g., asserting invariants after an operation).

    ```typescript
    import { Gen, simpleStatefulProperty, SimpleAction } from 'jsproptest';

    type MySystem = number[];

    // Generator for the initial state (e.g., an empty array)
    const initialGen = Gen.just([]);

    // Action: Add an element
    const addActionGen = Gen.integer().map(val =>
        new SimpleAction((arr: MySystem) => {
            const oldLength = arr.length;
            arr.push(val);
            // Assert invariant within the action
            expect(arr.length).toBe(oldLength + 1);
        })
    );

    // Action: Clear the array
    const clearActionGen = Gen.just(
        new SimpleAction((arr: MySystem) => {
            arr.length = 0;
            expect(arr.length).toBe(0);
        })
    );

    // Combine action generators
    const actionFactory = Gen.oneOf(addActionGen, clearActionGen)

    // Create the property
    const prop = simpleStatefulProperty(initialGen, actionFactory);

    // Run the test
    prop.go();
    ```

*   **`statefulProperty<ObjectType, ModelType>(initialGen, modelFactory, actionGenFactory)`**: Use this when you want to maintain a separate model to verify the system's behavior against.

    ```typescript
    import { Gen, statefulProperty, Action } from 'jsproptest';

    type MySystem = number[];
    type MyModel = { expectedCount: number };

    // Initial state generator
    const initialGen = Gen.array(Gen.integer(), 0, 10);

    // Model factory
    const modelFactory = (arr: MySystem): MyModel => ({ expectedCount: arr.length });

    // Action: Add element (updates object and model)
    const addActionGen = Gen.integer().map(val =>
        new Action((arr: MySystem, model: MyModel) => {
            arr.push(val);
            model.expectedCount++;
            // Check consistency (optional, can also use postCheck)
            expect(arr.length).toBe(model.expectedCount);
        })
    );

    // Action: Remove element (updates object and model)
    const removeActionGen = Gen.just(
        new Action((arr: MySystem, model: MyModel) => {
            if (arr.length === 0) return; // Precondition
            arr.pop();
            model.expectedCount--;
            expect(arr.length).toBe(model.expectedCount);
        })
    );

    // Action generator factory
    const actionFactory = Gen.simpleActionOf(addActionGen, Gen.weightedValue(removeActionGen, 0.1))

    // Create the property
    const prop = statefulProperty(initialGen, modelFactory, actionFactory);

    // Run the test
    prop.go();
    ```

## Configuration

The `StatefulProperty` instance provides several methods for configuration:

*   `setSeed(string)`: Sets the initial seed for the random number generator for reproducible tests.
*   `setNumRuns(number)`: Sets the number of test sequences to execute (default: 100).
*   `setMinActions(number)` / `setMaxActions(number)`: Sets the minimum and maximum number of actions per sequence (default: 1-100).
*   `setVerbosity(boolean)`: Enables/disables verbose logging during execution.
*   `setOnStartup(() => void)`: Sets a function to run before each test sequence.
*   `setOnCleanup(() => void)`: Sets a function to run after each successful test sequence.
*   `setPostCheck((obj: ObjectType, model: ModelType) => void)`: Sets a function to run after all actions in a sequence have completed successfully. Useful for final state validation. You can also use `setPostCheckWithoutModel((obj: ObjectType) => void)`.

## Shrinking

If a test sequence fails (an action throws an error or the `postCheck` fails), `jsproptest` automatically tries to **shrink** the test case to find a minimal reproduction. Shrinking runs three phases in order:

| Phase | What is shrunk | Strategy |
|-------|---------------|----------|
| **1 — Sequence length** | Number of actions in the failing sequence | Shorter prefixes first; element-wise simplification only after length is minimised |
| **2 — Initial object** | The generated initial state | Walks the shrink tree of `initialGen` |
| **3 — Last action parameters** | The generated arguments embedded in the last action | Walks the shrink tree of that action's `Shrinkable<Action>` |

### Phase 1 — sequence length, prefix-first

The shrinker tries removing trailing actions before simplifying individual action arguments. A failing sequence like `[push(42), pop, push(10000)]` will first be reduced to `[push(42)]` (if that still fails) before any value like `42` is minimised. Shorter sequences are almost always easier to reason about, so length reduction comes first.

### Phase 3 — last action parameters

After phases 1 and 2, the last remaining action in the sequence is further shrunk via its own shrink tree. For example, a `push(10000)` action built with `Gen.interval(0, 10000).map(n => new Action(..., 'push(' + n + ')'))` will walk down toward `push(0)` — or whatever boundary value still triggers the failure.

**This only works when actions carry a real shrink tree.** Actions built with `Gen.just(new Action(...))` have no children in their shrink tree and Phase 3 is a no-op for them. Use a generator with shrink support (`Gen.interval`, `Gen.string`, etc.) as the source, and wrap it with `.map(...)` to embed the value into the action.

```typescript
// ✅ Phase 3 will shrink 'value' toward the boundary
const pushGen = Gen.interval(0, 10000).map(value =>
    new Action((arr: number[], _model) => {
        arr.push(value)
        expect(arr.length).toBeLessThan(5)  // fails when arr grows too large
    }, `push(${value})`)
)

// ❌ Phase 3 is a no-op — action has no shrink tree
const pushGenNoShrink = Gen.just(
    new Action((arr: number[]) => { arr.push(42) }, 'push(42)')
)
```

### Mutable initial state — avoid `Gen.just([])`

`Gen.just(val)` always returns the **same object reference**. For mutable types like arrays, this means mutations from one test run accumulate into the next. Use a factory generator instead:

```typescript
// ❌ All runs share the same array instance — mutations accumulate
const badInitialGen = Gen.just<number[]>([])

// ✅ Each run gets a fresh array
const goodInitialGen = new Arbitrary<number[]>(_rand => new Shrinkable<number[]>([]))
```

### Example shrink output

A failure initially reported as:
```
args: { initial: [1882384569, 840506558], actions: [push(9374), pop, push(10000), clear] }
```
might shrink to:
```
args: { initial: [], actions: [push(5)] }
```
showing exactly the minimal initial state and action needed to reproduce the bug.