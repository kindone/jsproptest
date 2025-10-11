import '../shrinkable.dart';
import '../stream.dart';
import 'integer.dart';

/// Shrinks an array by shrinking its individual elements in bulk.
/// This strategy divides the array into chunks and shrinks elements within the targeted chunk.
///
/// [ancestor] The Shrinkable containing the array of Shrinkable elements.
/// [power] Determines the number of chunks (2^power) the array is divided into for shrinking.
/// [offset] Specifies which chunk (0 <= offset < 2^power) of elements to shrink in this step.
/// Returns a LazyStream of Shrinkable arrays, where elements in the specified chunk have been shrunk.
LazyStream<Shrinkable<List<Shrinkable<T>>>> shrinkBulk<T>(
  Shrinkable<List<Shrinkable<T>>> ancestor,
  int power,
  int offset,
) {
  final shrinkableElems = ancestor.value;
  final length = shrinkableElems.length;
  final numSplits = 1 << power; // 2^power

  if (length / numSplits < 1 || offset >= numSplits) {
    return LazyStream<Shrinkable<List<Shrinkable<T>>>>(null);
  }

  final chunkSize = (length / numSplits).ceil();
  final startIndex = offset * chunkSize;
  final endIndex = (offset + 1) * chunkSize;
  final actualEndIndex = endIndex > length ? length : endIndex;

  // Create a new array with shrunk elements in the target chunk
  final newShrinkableElems = <Shrinkable<T>>[];

  for (int i = 0; i < length; i++) {
    if (i >= startIndex && i < actualEndIndex) {
      // This element is in the target chunk, try to shrink it
      final elementShrinks = shrinkableElems[i].shrinks();
      if (!elementShrinks.isEmpty()) {
        final iterator = elementShrinks.iterator();
        if (iterator.hasNext()) {
          newShrinkableElems.add(iterator.next());
        } else {
          newShrinkableElems.add(shrinkableElems[i]);
        }
      } else {
        newShrinkableElems.add(shrinkableElems[i]);
      }
    } else {
      // This element is not in the target chunk, keep it as is
      newShrinkableElems.add(shrinkableElems[i]);
    }
  }

  return LazyStream<Shrinkable<List<Shrinkable<T>>>>(
      Shrinkable<List<Shrinkable<T>>>(newShrinkableElems));
}

/// Shrinks an array by shrinking its individual elements.
/// This strategy divides the array into chunks (controlled by `power` and `offset`)
/// and shrinks elements within the targeted chunk. It's useful for applying
/// element-specific shrinking logic in a structured way.
///
/// [shrinkableElemsShr] The Shrinkable containing the array of Shrinkable elements.
/// [power] Determines the number of chunks (2^power) the array is divided into for shrinking.
/// [offset] Specifies which chunk (0 <= offset < 2^power) of elements to shrink in this step.
/// Returns a LazyStream of Shrinkable arrays, where elements in the specified chunk have been shrunk.
LazyStream<Shrinkable<List<Shrinkable<T>>>> shrinkElementWise<T>(
  Shrinkable<List<Shrinkable<T>>> shrinkableElemsShr,
  int power,
  int offset,
) {
  if (shrinkableElemsShr.value.isEmpty) {
    return LazyStream<Shrinkable<List<Shrinkable<T>>>>(null);
  }

  final shrinkableElems = shrinkableElemsShr.value;
  final length = shrinkableElems.length;
  final numSplits = 1 << power; // 2^power

  if (length / numSplits < 1 || offset >= numSplits) {
    return LazyStream<Shrinkable<List<Shrinkable<T>>>>(null);
  }

  // Start with the current shrinkable
  Shrinkable<List<Shrinkable<T>>> currentShrinkable = shrinkableElemsShr;

  // Add bulk shrinking for the specified chunk
  currentShrinkable = currentShrinkable.andThen((parent) {
    return shrinkBulk<T>(parent, power, offset);
  });

  return currentShrinkable.shrinks();
}

/// Implements a shrinking strategy prioritizing removal from the front, then recursively
/// shrinking the middle part by increasing the number of fixed elements at the rear.
///
/// Strategy:
/// 1. Shrink by removing elements from the front, keeping `rearSize` elements fixed at the end.
/// 2. Recursively call with increased `rearSize` to fix more elements at the rear.
///
/// [shrinkableElems] The array of Shrinkable elements.
/// [minSize] The minimum allowed size for the shrunken array.
/// [rearSize] The number of elements to keep fixed at the rear.
/// Returns a Shrinkable representing arrays with elements removed from the front.
Shrinkable<List<Shrinkable<T>>> shrinkFrontAndThenMid<T>(
  List<Shrinkable<T>> shrinkableElems,
  int minSize,
  int rearSize,
) {
  // Remove front, fixing rear
  final minFrontSize = (minSize - rearSize).clamp(0, double.infinity).toInt();
  final maxFrontSize = shrinkableElems.length - rearSize;

  // Front size within [min, max]
  final rangeShrinkable = binarySearchShrinkable(maxFrontSize - minFrontSize)
      .map((s) => s + minFrontSize);

  return rangeShrinkable.map((frontSize) {
    // Concat front and rear
    final front = shrinkableElems.sublist(0, frontSize);
    final rear = shrinkableElems.sublist(maxFrontSize, shrinkableElems.length);
    return [...front, ...rear];
  }).andThen((parent) {
    // Increase rear size
    final parentSize = parent.value.length;

    // No further shrinking possible
    if (parentSize <= minSize || parentSize <= rearSize) {
      if (minSize < parentSize && rearSize + 1 < parentSize) {
        return shrinkMid(parent.value, minSize, 1, rearSize + 1).shrinks();
      } else {
        return LazyStream<Shrinkable<List<Shrinkable<T>>>>(null);
      }
    }

    // Shrink front further by fixing last element in front to rear
    return shrinkFrontAndThenMid(parent.value, minSize, rearSize + 1).shrinks();
  });
}

/// Implements a shrinking strategy focusing on removing elements from the middle/rear,
/// keeping a fixed number of elements at the front.
///
/// Strategy:
/// 1. Shrink by removing elements from the middle/rear, keeping `frontSize` elements fixed at the beginning.
/// 2. Recursively call with an increased `frontSize` to fix more elements at the front.
///
/// [shrinkableElems] The array of Shrinkable elements.
/// [minSize] The minimum allowed size for the shrunken array.
/// [frontSize] The number of elements to keep fixed at the front.
/// [rearSize] The number of elements to keep fixed at the rear.
/// Returns a Shrinkable representing arrays with elements removed from the middle/rear.
Shrinkable<List<Shrinkable<T>>> shrinkMid<T>(
  List<Shrinkable<T>> shrinkableElems,
  int minSize,
  int frontSize,
  int rearSize,
) {
  final minMidSize =
      (minSize - frontSize - rearSize).clamp(0, double.infinity).toInt();
  final maxMidSize = shrinkableElems.length - frontSize - rearSize;

  if (maxMidSize <= minMidSize) {
    return Shrinkable<List<Shrinkable<T>>>(shrinkableElems);
  }

  final rangeShrinkable = binarySearchShrinkable(maxMidSize - minMidSize)
      .map((s) => s + minMidSize);

  return rangeShrinkable.map((midSize) {
    final front = shrinkableElems.sublist(0, frontSize);
    final mid = shrinkableElems.sublist(frontSize, frontSize + midSize);
    final rear = shrinkableElems.sublist(
        shrinkableElems.length - rearSize, shrinkableElems.length);
    return [...front, ...mid, ...rear];
  }).andThen((parent) {
    final parentSize = parent.value.length;

    if (parentSize <= minSize || parentSize <= frontSize + rearSize) {
      return LazyStream<Shrinkable<List<Shrinkable<T>>>>(null);
    }

    // Increase front size to fix more elements at the front
    return shrinkMid(parent.value, minSize, frontSize + 1, rearSize).shrinks();
  });
}

/// Shrinks an array by removing elements in a membership-wise fashion.
/// This is the main entry point for membership-based shrinking.
///
/// [shrinkableElems] The array of Shrinkable elements.
/// [minSize] The minimum allowed size for the shrunken array.
/// Returns a Shrinkable representing arrays with elements removed.
Shrinkable<List<Shrinkable<T>>> shrinkMembershipWise<T>(
  List<Shrinkable<T>> shrinkableElems,
  int minSize,
) {
  return shrinkFrontAndThenMid(shrinkableElems, minSize, 0);
}

/// Enhanced array shrinker with advanced shrinking strategies.
/// Creates a Shrinkable for an array, allowing shrinking by removing elements
/// and optionally by shrinking the elements themselves.
///
/// [shrinkableElems] The initial array of Shrinkable elements.
/// [minSize] The minimum allowed length of the array after shrinking element membership.
/// [membershipWise] If true, allows shrinking by removing elements (membership). Defaults to true.
/// [elementWise] If true, applies element-wise shrinking after membership shrinking. Defaults to false.
/// Returns a Shrinkable<Array<T>> that represents the original array and its potential shrunken versions.
Shrinkable<List<T>> shrinkableArrayAdvanced<T>(
  List<Shrinkable<T>> shrinkableElems,
  int minSize, {
  bool membershipWise = true,
  bool elementWise = false,
}) {
  // Base Shrinkable containing the initial structure List<Shrinkable<T>>
  Shrinkable<List<Shrinkable<T>>> currentShrinkable =
      Shrinkable<List<Shrinkable<T>>>(shrinkableElems);

  // Chain membership shrinking if enabled
  if (membershipWise) {
    currentShrinkable = currentShrinkable.andThen((parent) {
      return shrinkMembershipWise(parent.value, minSize).shrinks();
    });
  }

  // Chain element-wise shrinking if enabled
  if (elementWise) {
    currentShrinkable = currentShrinkable.andThen((parent) {
      return shrinkElementWise(parent, 0, 0);
    });
  }

  // Map the final Shrinkable<List<Shrinkable<T>>> to Shrinkable<List<T>> by extracting the values.
  return currentShrinkable
      .map((theArr) => theArr.map((shr) => shr.value).toList());
}
