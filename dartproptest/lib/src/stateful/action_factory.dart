import '../generator.dart';
import '../random.dart';
import '../combinator/elementof.dart';
import 'stateful_base.dart';

/// Factory returning a generator for SimpleActions for a given object.
/// [ObjectType] The type of the object.
typedef SimpleActionGenFactory<ObjectType> = Generator<SimpleAction<ObjectType>>
    Function(ObjectType obj);

/// Factory returning a generator for Actions for a given object and model.
/// [ObjectType] The type of the object.
/// [ModelType] The type of the model.
typedef ActionGenFactory<ObjectType, ModelType>
    = Generator<Action<ObjectType, ModelType>> Function(
        ObjectType obj, ModelType mdl);

/// Union type for SimpleActionGen or SimpleActionGenFactory.
typedef SimpleActionGenOrFactory<ObjectType> = Object;

/// Union type for ActionGen or ActionGenFactory.
typedef ActionGenOrFactory<ObjectType, ModelType> = Object;

/// Type check to determine if a generator is a SimpleActionGen.
bool isSimpleActionGen<ObjectType>(dynamic element) {
  return element is SimpleActionGen<ObjectType>;
}

/// Type check to determine if a generator is an ActionGen.
bool isActionGen<ObjectType, ModelType>(dynamic element) {
  return element is ActionGen<ObjectType, ModelType>;
}

/// Creates a SimpleActionGenFactory combining multiple weighted SimpleActionGen or SimpleActionGenFactory instances.
///
/// [ObjectType] The type of the object.
/// [simpleActionGenFactories] Array of SimpleActionGen, SimpleActionGenFactory, or weighted versions.
/// Returns a SimpleActionGenFactory selecting based on weights.
SimpleActionGenFactory<ObjectType> simpleActionGenOf<ObjectType>(
  List<dynamic> simpleActionGenFactories,
) {
  // Normalize weights.
  final weightedFactories =
      normalizeWeightedValues<SimpleActionGenOrFactory<ObjectType>>(
          simpleActionGenFactories);

  return (ObjectType obj) => Arbitrary<SimpleAction<ObjectType>>((Random rand) {
        // Loop until an action is generated based on weight.
        while (true) {
          // Select a generator/factory index.
          final dice = rand.inRange(0, weightedFactories.length);
          // Check weight probability.
          if (rand.nextBoolean(weightedFactories[dice].weight)) {
            final genOrFactory = weightedFactories[dice].value;
            // Generate action: directly if generator, via factory otherwise.
            if (isSimpleActionGen<ObjectType>(genOrFactory)) {
              return (genOrFactory as SimpleActionGen<ObjectType>)
                  .generate(rand);
            } else {
              return (genOrFactory as SimpleActionGenFactory<ObjectType>)(obj)
                  .generate(rand);
            }
          }
        }
      });
}

/// Creates an ActionGenFactory combining multiple weighted ActionGen or ActionGenFactory instances.
///
/// [ObjectType] The type of the object.
/// [ModelType] The type of the model.
/// [actionGenFactories] Array of ActionGen, ActionGenFactory, or weighted versions.
/// Returns an ActionGenFactory selecting based on weights.
ActionGenFactory<ObjectType, ModelType> actionGenOf<ObjectType, ModelType>(
  List<dynamic> actionGenFactories,
) {
  // Normalize weights.
  final weightedFactories =
      normalizeWeightedValues<ActionGenOrFactory<ObjectType, ModelType>>(
          actionGenFactories);

  return (ObjectType obj, ModelType mdl) =>
      Arbitrary<Action<ObjectType, ModelType>>((Random rand) {
        // Loop until an action is generated based on weight.
        while (true) {
          // Select a generator/factory index.
          final dice = rand.inRange(0, weightedFactories.length);
          // Check weight probability.
          if (rand.nextBoolean(weightedFactories[dice].weight)) {
            final genOrFactory = weightedFactories[dice].value;
            // Generate action: directly if generator, via factory otherwise.
            if (isActionGen<ObjectType, ModelType>(genOrFactory)) {
              return (genOrFactory as ActionGen<ObjectType, ModelType>)
                  .generate(rand);
            } else {
              return (genOrFactory as ActionGenFactory<ObjectType, ModelType>)(
                      obj, mdl)
                  .generate(rand);
            }
          }
        }
      });
}
