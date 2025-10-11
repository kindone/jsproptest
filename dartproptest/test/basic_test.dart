import 'package:test/test.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  test('basic integer generation', () {
    final gen = simpleInterval(0, 10);
    final random = Random();
    final shrinkable = gen.generate(random);

    expect(shrinkable.value, isA<int>());
    expect(shrinkable.value, greaterThanOrEqualTo(0));
    expect(shrinkable.value, lessThanOrEqualTo(10));
  });

  test('basic property test', () {
    // Test that addition is commutative
    expect(
        () => simpleForAll((int a, int b) => a + b == b + a,
            [simpleInterval(0, 100), simpleInterval(0, 100)]),
        returnsNormally);
  });
}
