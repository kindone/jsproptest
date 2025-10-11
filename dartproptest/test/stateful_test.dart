import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Stateful Testing Tests', () {
    const NUM_RUNS = 10;
    const MAX_ACTIONS = 200;
    test('SimpleAction can be created and executed', () {
      final action = SimpleAction<int>((obj) {
        // This action doubles the value
        obj = obj * 2;
      }, 'double');

      expect(action.name, equals('double'));
      expect(action.toString(), equals('double'));

      // Test the action (note: in Dart, int is immutable, so this is just for testing the structure)
      int value = 5;
      action.call(value);
      // The value won't actually change due to Dart's pass-by-value for primitives
      expect(value, equals(5));
    });

    test('Action can be created and executed', () {
      final action = Action<int, String>((obj, model) {
        // This action would modify both object and model
        // For testing purposes, we'll just verify the structure
      }, 'test_action');

      expect(action.name, equals('test_action'));
      expect(action.toString(), equals('test_action'));

      // Test the action
      int obj = 5;
      String model = 'test';
      action.call(obj, model);
      // Just verify no exceptions are thrown
    });

    test('Action.fromSimpleAction converts SimpleAction to Action', () {
      final simpleAction = SimpleAction<int>((obj) {
        // Simple action
      }, 'simple');

      final action = Action.fromSimpleAction<int, String>(simpleAction);

      expect(action.name, equals('simple'));

      // Test that it works
      int obj = 5;
      String model = 'test';
      action.call(obj, model);
      // Just verify no exceptions are thrown
    });

    test('simpleActionGenOf creates weighted action generator', () {
      final rand = Random('42');

      final action1 = SimpleAction<int>((obj) {}, 'action1');
      final action2 = SimpleAction<int>((obj) {}, 'action2');

      final actionGen1 = Arbitrary<SimpleAction<int>>(
          (rand) => Shrinkable<SimpleAction<int>>(action1));
      final actionGen2 = Arbitrary<SimpleAction<int>>(
          (rand) => Shrinkable<SimpleAction<int>>(action2));

      final factory = simpleActionGenOf<int>([
        weightedValue(actionGen1, 0.7),
        actionGen2, // 30% weight
      ]);

      // Test that the factory returns a generator
      final generator = factory(42);
      expect(generator, isA<Generator<SimpleAction<int>>>());

      // Generate some actions
      final results = <SimpleAction<int>>[];
      for (int i = 0; i < 10; i++) {
        final result = generator.generate(rand);
        results.add(result.value);
      }

      // Should generate both types of actions
      expect(results.any((action) => action.name == 'action1'), isTrue);
      expect(results.any((action) => action.name == 'action2'), isTrue);
    });

    test('actionGenOf creates weighted action generator with model', () {
      final rand = Random('42');

      final action1 = Action<int, String>((obj, model) {}, 'action1');
      final action2 = Action<int, String>((obj, model) {}, 'action2');

      final actionGen1 = Arbitrary<Action<int, String>>(
          (rand) => Shrinkable<Action<int, String>>(action1));
      final actionGen2 = Arbitrary<Action<int, String>>(
          (rand) => Shrinkable<Action<int, String>>(action2));

      final factory = actionGenOf<int, String>([
        weightedValue(actionGen1, 0.6),
        actionGen2, // 40% weight
      ]);

      // Test that the factory returns a generator
      final generator = factory(42, 'test');
      expect(generator, isA<Generator<Action<int, String>>>());

      // Generate some actions
      final results = <Action<int, String>>[];
      for (int i = 0; i < 10; i++) {
        final result = generator.generate(rand);
        results.add(result.value);
      }

      // Should generate both types of actions
      expect(results.any((action) => action.name == 'action1'), isTrue);
      expect(results.any((action) => action.name == 'action2'), isTrue);
    });

    test('StatefulProperty can be created and configured', () {
      final initialGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 10)));
      final modelFactory = (int obj) => 'model_$obj';
      final actionGenFactory = (int obj, String model) =>
          Arbitrary<Action<int, String>>((rand) =>
              Shrinkable<Action<int, String>>(
                  Action<int, String>((o, m) {}, 'test_action')));

      final property =
          statefulProperty(initialGen, modelFactory, actionGenFactory);

      // Test configuration methods
      final configured = property
          .setSeed('test_seed')
          .setNumRuns(50)
          .setMinActions(2)
          .setMaxActions(10)
          .setVerbosity(true);

      expect(configured, isA<StatefulProperty<int, String>>());
    });

    test('simpleStatefulProperty can be created', () {
      final initialGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(1, 10)));
      final simpleActionGenFactory = (int obj) => Arbitrary<SimpleAction<int>>(
          (rand) => Shrinkable<SimpleAction<int>>(
              SimpleAction<int>((o) {}, 'simple_action')));

      final property =
          simpleStatefulProperty(initialGen, simpleActionGenFactory);

      expect(property, isA<StatefulProperty<int, void>>());
    });

    test('StatefulProperty can run basic test', () {
      final rand = Random('42');

      // Create a simple counter system
      final initialGen =
          Arbitrary<int>((rand) => Shrinkable<int>(rand.interval(0, 5)));
      final modelFactory = (int obj) => obj; // Model is same as object

      // Create actions that increment the counter
      final incrementAction = Action<int, int>((obj, model) {
        // In a real scenario, we'd modify the object
        // For this test, we'll just verify the structure works
      }, 'increment');

      final actionGenFactory = (int obj, int model) =>
          Arbitrary<Action<int, int>>(
              (rand) => Shrinkable<Action<int, int>>(incrementAction));

      final property =
          statefulProperty(initialGen, modelFactory, actionGenFactory)
              .setNumRuns(5)
              .setMinActions(1)
              .setMaxActions(3)
              .setVerbosity(false);

      // This should run without throwing exceptions
      expect(() => property.go(), returnsNormally);
    });

    /**
     * Tests the simple stateful property execution without a model.
     * It uses basic array operations (push, pop, clear) as actions.
     */
    test('simple', () {
      // Action generator: Pushes a random integer onto the array and asserts length increases.
      final pushGen = interval(0, 10000).map(
        (value) => SimpleAction<List<int>>((obj) {
          final size = obj.length;
          obj.add(value);
          expect(obj.length, equals(size + 1));
        }, 'push($value)'),
      );

      // Action generator: Pops an element if the array is not empty and asserts length decreases.
      final popGen = just(SimpleAction<List<int>>((obj) {
        final size = obj.length;
        if (obj.length == 0) return;
        obj.removeLast();
        expect(obj.length, equals(size - 1));
      }, 'pop'));

      // Action generator: Removes all elements if the array is not empty and asserts length is 0.
      final clearGen = just(SimpleAction<List<int>>((obj) {
        if (obj.length == 0) return;
        obj.clear();
        expect(obj.length, equals(0));
      }, 'clear'));

      final simpleArrayActionGen = simpleActionGenOf<List<int>>([
        pushGen,
        popGen,
        weightedValue(clearGen, 0.1),
      ]);
      final prop = simpleStatefulProperty(
        arrayGen(interval(0, 10000), 0, 20),
        simpleArrayActionGen,
      );
      prop.go();

      int startupCallCount = 0;
      int cleanupCallCount = 0;
      prop.setOnStartup(() {
        startupCallCount++;
      });
      prop.setOnCleanup(() {
        cleanupCallCount++;
      });

      prop.setSeed('1').setNumRuns(NUM_RUNS).go();

      // Check counters after the run
      expect(startupCallCount, equals(NUM_RUNS));
      expect(cleanupCallCount, equals(NUM_RUNS));
    });

    /**
     * Tests the stateful property execution with a model.
     * The model (`M`) tracks the expected state (count) alongside the actual state (`T`).
     * Actions update both the actual object and the model.
     */
    test('normal', () {
      // Action generator: Pushes a value, updates model count, asserts length increases.
      final pushGen = interval(0, 10000).map(
        (value) => Action<List<int>, dynamic>((obj, model) {
          final size = obj.length;
          obj.add(value);
          expect(obj.length, equals(size + 1));
          model['count'] = (model['count'] ?? 0) + 1;
        }, 'push($value)'),
      );

      // Action generator: Pops element (if possible), updates model count, asserts length decreases.
      final popGen = just(Action<List<int>, dynamic>((obj, model) {
        final size = obj.length;
        if (obj.length == 0) return;
        obj.removeLast();
        expect(obj.length, equals(size - 1));
        model['count'] = (model['count'] ?? 0) - 1;
      }, 'pop'));

      // Action generator: Clears array (if possible), resets model count, asserts length is 0.
      final clearGen = just(Action<List<int>, dynamic>((obj, model) {
        if (obj.length == 0) return;
        obj.clear();
        expect(obj.length, equals(0));
        model['count'] = 0;
      }, 'clear'));

      final arrayModelActionGen = actionGenOf<List<int>, dynamic>([
        pushGen,
        (obj, model) => popGen,
        weightedValue((obj, model) => clearGen, 0.1),
      ]);
      final modelFactory = (obj) => {'count': obj.length};
      final prop = statefulProperty(
        arrayGen(interval(0, 10000), 0, 20),
        modelFactory,
        arrayModelActionGen,
      );
      prop.setVerbosity(false).setMaxActions(MAX_ACTIONS).go();

      int startupCallCount = 0;
      int cleanupCallCount = 0;
      prop.setOnStartup(() {
        startupCallCount++;
      });
      prop.setOnCleanup(() {
        cleanupCallCount++;
      });
      prop.setPostCheck((obj, model) {
        throw Exception('error');
      });

      expect(
        () => prop.setSeed('1').setNumRuns(NUM_RUNS).setVerbosity(false).go(),
        throwsA(isA<Exception>()),
      );

      // Check counters after the run
      expect(startupCallCount, equals(1));
      expect(cleanupCallCount, equals(0));
    });

    /**
     * Tests the shrinking mechanism for stateful properties.
     * An intentional failure condition is introduced in the `pushGen` action
     * to verify that the test runner can shrink the failing sequence of actions.
     */
    test('shrink_stateful', () {
      // Action generator: Pushes value (conditionally), updates model count, asserts length increases.
      // Includes an intentional failure condition for testing shrinking.
      final pushGen = interval(0, 10000).map(
        (value) => Action<List<int>, dynamic>((obj, model) {
          final size = obj.length;
          if (value < 9000) obj.add(value);
          expect(obj.length, equals(size + 1));
          model['count'] = (model['count'] ?? 0) + 1;
        }, 'push($value)'),
      );

      // Action generator: Pops element (if possible), updates model count, asserts length decreases.
      final popGen = just(Action<List<int>, dynamic>((obj, model) {
        final size = obj.length;
        if (obj.length == 0) return;
        obj.removeLast();
        expect(obj.length, equals(size - 1));
        model['count'] = (model['count'] ?? 0) - 1;
      }, 'pop'));

      // Action generator: Clears array (if possible), resets model count, asserts length is 0.
      final clearGen = just(Action<List<int>, dynamic>((obj, model) {
        if (obj.length == 0) return;
        obj.clear();
        expect(obj.length, equals(0));
        model['count'] = 0;
      }, 'clear'));

      final arrayModelActionGen = actionGenOf<List<int>, dynamic>([
        pushGen,
        (obj, model) => popGen,
        weightedValue((obj, model) => clearGen, 0.1),
      ]);
      final modelFactory = (obj) => {'count': obj.length};
      final prop = statefulProperty(
        arrayGen(interval(0, 10000), 0, 20),
        modelFactory,
        arrayModelActionGen,
      );
      expect(
        () => prop.setVerbosity(false).setMaxActions(MAX_ACTIONS).go(),
        throwsA(isA<Exception>()),
      );

      int startupCallCount = 0;
      int cleanupCallCount = 0;
      prop.setOnStartup(() {
        startupCallCount++;
      });
      prop.setOnCleanup(() {
        cleanupCallCount++;
      });
      prop.setPostCheck((obj, model) {
        throw Exception('error');
      });

      expect(
        () => prop.setSeed('1').setNumRuns(NUM_RUNS).setVerbosity(false).go(),
        throwsA(isA<Exception>()),
      );

      // Check counters after the run
      // When shrinking occurs, startup should run at least once.
      expect(startupCallCount, greaterThanOrEqualTo(1));
      // Cleanup won't run as error is thrown during postcheck
      expect(cleanupCallCount, equals(0));
    });
  });
}
