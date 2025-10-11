import '../generator.dart';
import '../random.dart';
import 'stateful_base.dart';
import 'action_factory.dart';

/// Represents the result of shrinking a failing test case.
class ShrinkResult {
  ShrinkResult(this.initialObj, this.actions, [this.error]);

  final dynamic initialObj;
  final List<dynamic> actions;
  final dynamic error;
}

/// Orchestrates stateful property-based testing.
/// It generates an initial state, then a sequence of actions based on the current state,
/// executes these actions against both the real object and a model, and checks for discrepancies
/// or errors. If a failure occurs, it attempts to shrink the sequence of actions and the initial
/// state to find a minimal failing test case.
///
/// [ObjectType] The type of the system under test.
/// [ModelType] The type of the model used for checking correctness.
class StatefulProperty<ObjectType, ModelType> {
  String _seed = '';
  int _numRuns = 100;
  int _minActions = 1;
  int _maxActions = 100;
  int _maxAllowedConsecutiveGenerationFailures = 20;
  bool _verbose = false;
  void Function()? _onStartup;
  void Function()? _onCleanup;
  void Function(ObjectType obj, ModelType mdl)? _postCheck;

  StatefulProperty(
    this.initialGen,
    this.modelFactory,
    this.actionGenFactory,
  );

  final Generator<ObjectType> initialGen;
  final ModelType Function(ObjectType) modelFactory;
  final ActionGenFactory<ObjectType, ModelType> actionGenFactory;

  /// Sets the seed for reproducible tests.
  StatefulProperty<ObjectType, ModelType> setSeed(String seed) {
    _seed = seed;
    return this;
  }

  /// Sets the number of test sequences to execute.
  StatefulProperty<ObjectType, ModelType> setNumRuns(int numRuns) {
    _numRuns = numRuns;
    return this;
  }

  /// Sets the minimum number of actions per sequence.
  StatefulProperty<ObjectType, ModelType> setMinActions(int minActions) {
    _minActions = minActions;
    return this;
  }

  /// Sets the maximum number of actions per sequence.
  StatefulProperty<ObjectType, ModelType> setMaxActions(int maxActions) {
    _maxActions = maxActions;
    return this;
  }

  /// Sets the maximum allowed consecutive generation failures.
  StatefulProperty<ObjectType, ModelType>
      setMaxAllowedConsecutiveGenerationFailures(int maxFailures) {
    _maxAllowedConsecutiveGenerationFailures = maxFailures;
    return this;
  }

  /// Enables or disables verbose logging.
  StatefulProperty<ObjectType, ModelType> setVerbosity(bool verbose) {
    _verbose = verbose;
    return this;
  }

  /// Sets the startup callback.
  StatefulProperty<ObjectType, ModelType> setOnStartup(
      void Function()? onStartup) {
    _onStartup = onStartup;
    return this;
  }

  /// Sets the cleanup callback.
  StatefulProperty<ObjectType, ModelType> setOnCleanup(
      void Function()? onCleanup) {
    _onCleanup = onCleanup;
    return this;
  }

  /// Sets the post-check callback.
  StatefulProperty<ObjectType, ModelType> setPostCheck(
      void Function(ObjectType obj, ModelType mdl)? postCheck) {
    _postCheck = postCheck;
    return this;
  }

  /// Runs the stateful property test.
  void go() {
    // For now, implement a simplified version that uses the existing Property class
    // TODO: Implement full stateful testing with shrinking

    final rand = Random(_seed.isEmpty
        ? DateTime.now().millisecondsSinceEpoch.toString()
        : _seed);

    for (int run = 0; run < _numRuns; run++) {
      try {
        // Call startup callback
        if (_onStartup != null) {
          _onStartup!();
        }

        // Generate initial state
        final initialObj = initialGen.generate(rand).value;
        final model = modelFactory(initialObj);

        // Generate sequence of actions
        final numActions = rand.interval(_minActions, _maxActions);
        final actions = <Action<ObjectType, ModelType>>[];

        for (int i = 0; i < numActions; i++) {
          final actionGen = actionGenFactory(initialObj, model);
          final action = actionGen.generate(rand).value;
          actions.add(action);
        }

        // Execute actions
        for (final action in actions) {
          action.call(initialObj, model);
        }

        // Perform post-check if defined
        if (_postCheck != null) {
          _postCheck!(initialObj, model);
        }

        // Call cleanup callback
        if (_onCleanup != null) {
          _onCleanup!();
        }

        if (_verbose) {
          print('Run $run: ${actions.length} actions executed successfully');
        }
      } catch (e) {
        if (_verbose) {
          print('Run $run failed: $e');
        }
        rethrow;
      }
    }

    if (_verbose) {
      print('All $_numRuns runs completed successfully');
    }
  }
}

/// Factory function to create a `StatefulProperty` instance.
///
/// [ObjectType] The type of the system under test.
/// [ModelType] The type of the model used for checking correctness.
/// [initialGen] Generator for the initial state of the object under test.
/// [modelFactory] Function to create the initial model state based on the initial object state.
/// [actionGenFactory] Factory to generate actions based on the current object and model state.
/// Returns a new `StatefulProperty` instance configured with the provided generators and factories.
StatefulProperty<ObjectType, ModelType> statefulProperty<ObjectType, ModelType>(
  Generator<ObjectType> initialGen,
  ModelType Function(ObjectType) modelFactory,
  ActionGenFactory<ObjectType, ModelType> actionGenFactory,
) {
  return StatefulProperty<ObjectType, ModelType>(
      initialGen, modelFactory, actionGenFactory);
}

/// Factory function to create a `StatefulProperty` instance for cases where
/// no explicit model is needed (using an `EmptyModel`). Simplifies setup when
/// checks only involve the object under test or invariants.
///
/// [ObjectType] The type of the system under test.
/// [initialGen] Generator for the initial state of the object under test.
/// [simpleActionGenFactory] Factory to generate actions based only on the current object state.
/// Returns a new `StatefulProperty` instance configured for model-less stateful testing.
StatefulProperty<ObjectType, void> simpleStatefulProperty<ObjectType>(
  Generator<ObjectType> initialGen,
  SimpleActionGenFactory<ObjectType> simpleActionGenFactory,
) {
  return StatefulProperty<ObjectType, void>(
    initialGen,
    (_) => null, // Empty model
    (obj, _) => simpleActionGenFactory(obj).map((simpleAction) =>
        Action<ObjectType, void>(
            (o, __) => simpleAction.call(o), simpleAction.name)),
  );
}
