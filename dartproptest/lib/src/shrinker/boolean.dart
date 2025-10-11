import '../shrinkable.dart';
import '../stream.dart';

/// Creates a Shrinkable instance for a boolean value.
/// The shrinking strategy for booleans is straightforward: `true` shrinks to `false`, and `false` does not shrink further.
///
/// [value] The boolean value to make shrinkable.
/// Returns a Shrinkable instance representing the boolean value.
Shrinkable<bool> shrinkableBoolean(bool value) {
  if (value) {
    // If the value is true, it can shrink to false.
    final stream = LazyStream<Shrinkable<bool>>(Shrinkable<bool>(false));
    return Shrinkable<bool>(value).withShrinks(() => stream);
  } else {
    // If the value is false, it cannot shrink further.
    return Shrinkable<bool>(value);
  }
}
