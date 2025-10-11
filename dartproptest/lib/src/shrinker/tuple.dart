import '../shrinkable.dart';

/// Creates a `Shrinkable` tuple from a sequence of `Shrinkable` elements.
/// The shrinking process attempts to shrink each element of the tuple individually.
/// It starts by shrinking the first element, then the second, and so on.
///
/// [tuple] The sequence of `Shrinkable` elements forming the tuple.
/// Returns a `Shrinkable` representing the tuple, whose value is the tuple of underlying types.
Shrinkable<List<T>> shrinkableTuple<T>(List<Shrinkable<T>> tuple) {
  if (tuple.isEmpty) {
    return Shrinkable<List<T>>([]);
  }

  // For now, create a simple shrinkable that just combines the values
  // TODO: Implement proper tuple shrinking logic
  final values = tuple.map((s) => s.value).toList();
  return Shrinkable<List<T>>(values);
}
