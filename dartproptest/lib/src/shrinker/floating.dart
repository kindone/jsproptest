import '../shrinkable.dart';
import '../stream.dart';
import 'integer.dart';

/// Gets the exponent from a floating point number.
int _getExponent(double value) {
  final exponentialStr = value.toStringAsExponential();
  final parts = exponentialStr.split('e');
  return int.parse(parts[1]);
}

/// Gets the mantissa from a floating point number.
double _getMantissa(double value) {
  final exponentialStr = value.toStringAsExponential();
  final parts = exponentialStr.split('e');
  return double.parse(parts[0]);
}

/// Creates a stream of shrinkable floating point values.
LazyStream<Shrinkable<double>> _shrinkableFloatStream(double value) {
  if (value == 0.0) {
    return LazyStream<Shrinkable<double>>(null);
  } else if (value.isNaN) {
    return LazyStream<Shrinkable<double>>(Shrinkable<double>(0.0));
  } else {
    double fraction = 0.0;
    int exponent = 0;

    if (value == double.infinity) {
      final max = double.maxFinite;
      exponent = _getExponent(max);
      fraction = _getMantissa(max);
    } else if (value == double.negativeInfinity) {
      final min = -double.maxFinite;
      exponent = _getExponent(min);
      fraction = _getMantissa(min);
    } else {
      exponent = _getExponent(value);
      fraction = _getMantissa(value);
    }

    final expShrinkable = binarySearchShrinkable(exponent);
    Shrinkable<double> doubleShrinkable =
        expShrinkable.map((exp) => fraction * (2.0 * exp));

    // Prepend 0.0
    doubleShrinkable = doubleShrinkable.withShrinks(() {
      final zero = LazyStream<Shrinkable<double>>(Shrinkable<double>(0.0));
      return zero.concat(LazyStream<Shrinkable<double>>(doubleShrinkable));
    });

    doubleShrinkable = doubleShrinkable.andThen((shr) {
      final value = shr.value;
      final exponent = _getExponent(value);
      if (value == 0.0) {
        return LazyStream<Shrinkable<double>>(null);
      } else if (value > 0) {
        return LazyStream<Shrinkable<double>>(
            Shrinkable<double>(0.5 * (2.0 * exponent)));
      } else {
        return LazyStream<Shrinkable<double>>(
            Shrinkable<double>(-0.5 * (2.0 * exponent)));
      }
    });

    doubleShrinkable = doubleShrinkable.andThen((shr) {
      final value = shr.value;
      final intValue = value > 0 ? value.floor() : value.floor() + 1;
      if (intValue != 0 && intValue.abs() < value.abs()) {
        return LazyStream<Shrinkable<double>>(
            Shrinkable<double>(intValue.toDouble()));
      } else {
        return LazyStream<Shrinkable<double>>(null);
      }
    });

    return doubleShrinkable.shrinks();
  }
}

/// Creates a Shrinkable for floating point numbers.
Shrinkable<double> shrinkableFloat(double value) {
  return Shrinkable<double>(value)
      .withShrinks(() => _shrinkableFloatStream(value));
}
