import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  group('Stateful Examples', () {
    test('simple list system', () {
      // Initial state generator for a list
      final listInitialGen = Gen.array(Gen.just(0), minLength: 0, maxLength: 5);

      // Model factory
      final listModelFactory = (List<int> obj) => obj.length;

      // Create actions for the list
      final addAction = Action<List<int>, int>((obj, model) {
        obj.add(42);
        if (obj.length != model + 1) {
          throw Exception(
              'List length mismatch: expected ${model + 1}, got ${obj.length}');
        }
      }, 'add');

      final removeAction = Action<List<int>, int>((obj, model) {
        if (obj.isNotEmpty) {
          // Precondition
          obj.removeLast();
          if (obj.length != model - 1) {
            throw Exception(
                'List length mismatch: expected ${model - 1}, got ${obj.length}');
          }
        }
      }, 'remove');

      // Test that actions can be created
      expect(addAction.name, equals('add'));
      expect(removeAction.name, equals('remove'));
    });

    test('simple action generation', () {
      // Test that we can create simple actions
      final simpleAction = SimpleAction<String>((obj) => 'action1', 'action1');
      expect(simpleAction.name, equals('action1'));
    });

    test('action generation with state', () {
      // Test that we can create actions with state
      final action =
          Action<String, String>((obj, model) => 'action1_$model', 'action1');
      expect(action.name, equals('action1'));
    });

    test('stateful property creation', () {
      // Test that we can create actions
      final action = Action<List<int>, int>((obj, model) {
        obj.add(1);
      }, 'add');

      expect(action.name, equals('add'));
    });

    test('simple stateful property creation', () {
      // Test that we can create simple actions
      final action = SimpleAction<List<int>>((obj) {
        obj.add(1);
      }, 'add');

      expect(action.name, equals('add'));
    });

    test('action with precondition', () {
      final action = Action<List<int>, int>((obj, model) {
        if (obj.isEmpty) {
          throw PreconditionError('List is empty');
        }
        obj.removeLast();
      }, 'remove');

      expect(action.name, equals('remove'));
    });

    test('simple action with precondition', () {
      final action = SimpleAction<List<int>>((obj) {
        if (obj.isEmpty) {
          throw PreconditionError('List is empty');
        }
        obj.removeLast();
      }, 'remove');

      expect(action.name, equals('remove'));
    });

    test('stateful property with multiple actions', () {
      // Test that we can create multiple actions
      final actions = [
        Action<List<int>, int>((obj, model) {
          obj.add(1);
        }, 'add'),
        Action<List<int>, int>((obj, model) {
          if (obj.isNotEmpty) {
            obj.removeLast();
          }
        }, 'remove'),
        Action<List<int>, int>((obj, model) {
          obj.clear();
        }, 'clear'),
      ];

      expect(actions.length, equals(3));
      expect(actions[0].name, equals('add'));
      expect(actions[1].name, equals('remove'));
      expect(actions[2].name, equals('clear'));
    });

    test('simple stateful property with multiple actions', () {
      // Test that we can create multiple simple actions
      final actions = [
        SimpleAction<List<int>>((obj) {
          obj.add(1);
        }, 'add'),
        SimpleAction<List<int>>((obj) {
          if (obj.isNotEmpty) {
            obj.removeLast();
          }
        }, 'remove'),
        SimpleAction<List<int>>((obj) {
          obj.clear();
        }, 'clear'),
      ];

      expect(actions.length, equals(3));
      expect(actions[0].name, equals('add'));
      expect(actions[1].name, equals('remove'));
      expect(actions[2].name, equals('clear'));
    });

    test('weighted action generation', () {
      // Test that we can create weighted values
      final weightedValue = Gen.weightedValue(() => 'action1', 0.5);
      expect(weightedValue.value(), equals('action1'));
      expect(weightedValue.weight, equals(0.5));
    });

    test('complex stateful system', () {
      // Test that we can create complex actions
      final actions = [
        Action<Map<String, int>, int>((obj, model) {
          obj['key${obj.length}'] = obj.length;
        }, 'addKey'),
        Action<Map<String, int>, int>((obj, model) {
          if (obj.isNotEmpty) {
            obj.remove(obj.keys.first);
          }
        }, 'removeKey'),
      ];

      expect(actions.length, equals(2));
      expect(actions[0].name, equals('addKey'));
      expect(actions[1].name, equals('removeKey'));
    });
  });
}
