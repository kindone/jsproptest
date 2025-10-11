import '../generator.dart';

/// Represents a simple action that can be performed on an object.
/// It doesn't involve a model.
/// [ObjectType] The type of the object the action acts upon.
class SimpleAction<ObjectType> {
  /// [func] The function to execute when the action is called.
  /// [name] An optional name for the action, used for reporting.
  SimpleAction(this.func, [this.name = 'unnamed']);

  final void Function(ObjectType) func;
  final String name;

  /// Calls the underlying function with the given object.
  void call(ObjectType obj) {
    func(obj);
  }

  /// Returns the name of the action.
  @override
  String toString() {
    return name;
  }
}

/// Represents an action that involves both a real object and a model.
/// Used for stateful property-based testing to compare system-under-test and model states.
/// [ObjectType] The type of the real object.
/// [ModelType] The type of the model object.
class Action<ObjectType, ModelType> {
  /// Creates an `Action` from a `SimpleAction`, ignoring the model.
  /// [simpleAction] The simple action to convert.
  /// Returns a new `Action` instance.
  static Action<ObjectType, ModelType> fromSimpleAction<ObjectType, ModelType>(
      SimpleAction<ObjectType> simpleAction) {
    return Action<ObjectType, ModelType>(
        (object, _) => simpleAction.call(object), simpleAction.name);
  }

  /// [func] The function to execute, taking both the object and the model.
  /// [name] An optional name for the action.
  Action(this.func, [this.name = 'unnamed']);

  final void Function(ObjectType obj, ModelType mdl) func;
  final String name;

  /// Calls the underlying function with the object and model.
  void call(ObjectType obj, ModelType mdl) {
    func(obj, mdl);
  }

  /// Returns the name of the action.
  @override
  String toString() {
    return name;
  }
}

/// A generator for `SimpleAction` instances.
typedef SimpleActionGen<ObjectType> = Generator<SimpleAction<ObjectType>>;

/// A generator for `Action` instances involving an object and a model.
typedef ActionGen<ObjectType, ModelType>
    = Generator<Action<ObjectType, ModelType>>;
