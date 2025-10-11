import 'package:dartproptest/dartproptest.dart';

void printShrinkable<T>(Shrinkable<T> shrinkable, int level) {
  if (level == 0) {
    print('exhaustive:');
  }
  String str = '';
  for (int i = 0; i < level; i++) str += '  ';
  print(str + ('shrinkable: ${JSONStringify.call(shrinkable.value)}'));
}

void exhaustive<T>(
  Shrinkable<T> shrinkable,
  int level, [
  void Function(Shrinkable<T>, int)? func,
]) {
  final printFunc = func ?? printShrinkable;
  printFunc(shrinkable, level);
  final shrinks = shrinkable.shrinks();
  for (final itr = shrinks.iterator(); itr.hasNext();) {
    final shrinkable2 = itr.next();
    exhaustive(shrinkable2, level + 1, func);
  }
}

bool compareShrinkable<T>(Shrinkable<T> lhs, Shrinkable<T> rhs,
    [int maxElements = 1000]) {
  if (lhs.value != rhs.value) {
    return false;
  }

  maxElements--;

  final lhsShrinks = lhs.shrinks();
  final rhsShrinks = rhs.shrinks();

  final lhsIterator = lhsShrinks.iterator();
  final rhsIterator = rhsShrinks.iterator();

  while (lhsIterator.hasNext() || rhsIterator.hasNext()) {
    if (lhsIterator.hasNext() != rhsIterator.hasNext()) {
      return false;
    }

    final left = lhsIterator.next();
    final right = rhsIterator.next();

    if (!compareShrinkable(left, right, maxElements)) {
      return false;
    }

    maxElements--;
  }

  return true;
}

Map<String, dynamic> outShrinkable<T>(Shrinkable<T> shrinkable) {
  final obj = <String, dynamic>{};
  obj['value'] = shrinkable.value;

  final shrinks = shrinkable.shrinks();
  if (!shrinks.isEmpty()) {
    final shrinksObj = <Map<String, dynamic>>[];
    for (final itr = shrinks.iterator(); itr.hasNext();) {
      final shrinkable2 = itr.next();
      shrinksObj.add(outShrinkable(shrinkable2));
    }
    obj['shrinks'] = shrinksObj;
  }
  return obj;
}

String serializeShrinkable<T>(Shrinkable<T> shrinkable) {
  return _compactJson(outShrinkable(shrinkable));
}

String _compactJson(dynamic obj) {
  if (obj == null) return 'null';
  if (obj is String) return '"$obj"';
  if (obj is num || obj is bool) return obj.toString();
  if (obj is List) {
    final items = obj.map((item) => _compactJson(item)).join(',');
    return '[$items]';
  }
  if (obj is Map<String, dynamic>) {
    final pairs = obj.entries
        .map((entry) => '"${entry.key}":${_compactJson(entry.value)}')
        .join(',');
    return '{$pairs}';
  }
  return obj.toString();
}
