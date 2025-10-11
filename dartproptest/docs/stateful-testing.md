# Stateful Testing

Stateful testing involves defining a sequence of actions or commands that can be applied to a system under test and verifying properties or invariants about the system's state after executing these sequences.

`dartproptest` provides utilities for defining state machines and generating sequences of commands to effectively test stateful systems. It allows you to model the state of your system, define actions that change the state, and automatically run sequences of these actions to find bugs.

## Core Concepts

Stateful testing in `dartproptest` revolves around the `StatefulProperty` class, which orchestrates the test execution. Here are the key components:

1.  **Initial State (`ObjectType`)**: You need a generator (`Arbitrary<ObjectType>`) that produces the initial state of the system under test for each test run.
2.  **Actions (`Action` or `SimpleAction`)**: Actions represent operations that modify the system's state.
    *   `SimpleAction`: Used when you don't need an explicit model. It takes a function `(obj: ObjectType) => void`.
    *   `Action`: Used when you have a model. It takes a function `(obj: ObjectType, model: ModelType) => void` and updates both the real object and the model.
3.  **Model (`ModelType`, Optional)**: A simplified representation of the system's state. It's used to verify the correctness of the actual system's state after each action.
4.  **Model Factory (`modelFactory`, Optional)**: A function `(obj: ObjectType) => ModelType` that creates the initial model state based on the initial object state. Required if using a model.
5.  **Action Generation (`actionGenFactory` or `simpleActionGenFactory`)**: A factory function that returns a generator for the *next* action based on the *current* state of the object (and model, if applicable).
    *   `SimpleActionGenFactory`: `(obj: ObjectType) => Arbitrary<SimpleAction<ObjectType>>`
    *   `ActionGenFactory`: `(obj: ObjectType, model: ModelType) => Arbitrary<Action<ObjectType, ModelType>>`
    `dartproptest` provides helpers like `simpleActionGenOf` and `actionGenOf` to combine multiple action generators.

## Creating a Stateful Property

You typically use factory functions to create a `StatefulProperty`:

*   **`simpleStatefulProperty<ObjectType>(initialGen, simpleActionGenFactory)`**: Use this when you don't need an explicit model. Checks are usually performed within the `SimpleAction` implementations (e.g., asserting invariants after an operation).

    ```dart
    import 'package:dartproptest/dartproptest.dart';

    typedef MySystem = List<int>;

    // Generator for the initial state (e.g., an empty array)
    final initialGen = Gen.just(<int>[]);

    // Action: Add an element
    final addActionGen = Gen.integers().map((val) =>
        SimpleAction((List<int> arr) {
            final oldLength = arr.length;
            arr.add(val);
            // Assert invariant within the action
            expect(arr.length, equals(oldLength + 1));
        })
    );

    // Action: Clear the array
    final clearActionGen = Gen.just(
        SimpleAction((List<int> arr) {
            arr.clear();
            expect(arr.length, equals(0));
        })
    );

    // Combine action generators
    final actionFactory = Gen.oneOf([addActionGen, clearActionGen]);

    // Create the property
    final prop = simpleStatefulProperty(initialGen, actionFactory);

    // Run the test
    prop.go();
    ```

*   **`statefulProperty<ObjectType, ModelType>(initialGen, modelFactory, actionGenFactory)`**: Use this when you want to maintain a separate model to verify the system's behavior against.

    ```dart
    import 'package:dartproptest/dartproptest.dart';

    typedef MySystem = List<int>;
    typedef MyModel = Map<String, int>;

    // Initial state generator
    final initialGen = Gen.array(Gen.integers(), minLength: 0, maxLength: 10);

    // Model factory
    final modelFactory = (List<int> arr) => {'expectedCount': arr.length};

    // Action: Add element (updates object and model)
    final addActionGen = Gen.integers().map((val) =>
        Action((List<int> arr, Map<String, int> model) {
            arr.add(val);
            model['expectedCount'] = model['expectedCount']! + 1;
            // Check consistency (optional, can also use postCheck)
            expect(arr.length, equals(model['expectedCount']));
        })
    );

    // Action: Remove element (updates object and model)
    final removeActionGen = Gen.just(
        Action((List<int> arr, Map<String, int> model) {
            if (arr.isEmpty) return; // Precondition
            arr.removeLast();
            model['expectedCount'] = model['expectedCount']! - 1;
            expect(arr.length, equals(model['expectedCount']));
        })
    );

    // Action generator factory
    final actionFactory = Gen.simpleActionOf([addActionGen, Gen.weightedValue(removeActionGen, 0.1)]);

    // Create the property
    final prop = statefulProperty(initialGen, modelFactory, actionFactory);

    // Run the test
    prop.go();
    ```

## Configuration

The `StatefulProperty` instance provides several methods for configuration:

*   `setSeed(String)`: Sets the initial seed for the random number generator for reproducible tests.
*   `setNumRuns(int)`: Sets the number of test sequences to execute (default: 100).
*   `setMinActions(int)` / `setMaxActions(int)`: Sets the minimum and maximum number of actions per sequence (default: 1-100).
*   `setVerbosity(bool)`: Enables/disables verbose logging during execution.
*   `setOnStartup(() => void)`: Sets a function to run before each test sequence.
*   `setOnCleanup(() => void)`: Sets a function to run after each successful test sequence.
*   `setPostCheck((obj: ObjectType, model: ModelType) => void)`: Sets a function to run after all actions in a sequence have completed successfully. Useful for final state validation. You can also use `setPostCheckWithoutModel((obj: ObjectType) => void)`.

## Shrinking

If a test sequence fails (an action throws an error or the `postCheck` fails), `dartproptest` automatically tries to **shrink** the test case to find a minimal reproduction. It does this by:

1.  **Shrinking the Action Sequence**: Trying shorter sequences or simpler actions.
2.  **Shrinking the Initial State**: Trying simpler versions of the initial state generated by `initialGen`.

The goal is to present the simplest possible initial state and sequence of actions that trigger the failure, making debugging easier. The error message will report the shrunk arguments if successful.
