import '../generator.dart';
import '../shrinkable.dart';
import '../shrinker/string.dart';
import 'integer.dart';

/// Generates integers representing ASCII character codes (1-127).
final Generator<int> asciiCharGen = interval(1, 0x7f);

/// Generates integers representing printable ASCII character codes (32-127).
final Generator<int> printableAsciiCharGen = interval(0x20, 0x7f);

/// Generates integers representing Unicode character codes.
/// Maps the interval to avoid generating surrogate pair code points directly (U+D800 to U+DFFF).
final Generator<int> unicodeCharGen =
    interval(1, 0xd7ff + (0x10ffff - 0xe000 + 1)).map((code) {
  // Skip surrogate pair range D800-DFFF
  return code < 0xd800 ? code : code + (0xe000 - 0xd800);
});

/// Creates a generator for strings of a specified length range, using a given character code generator.
///
/// [minSize] The minimum length of the generated string (inclusive).
/// [maxSize] The maximum length of the generated string (inclusive).
/// [charGen] The generator used to produce character codes for the string. Defaults to `asciiCharGen`.
/// Returns a generator that produces strings with shrinkable characters.
Generator<String> stringGen(int minSize, int maxSize,
    [Generator<int>? charGen]) {
  final charGenerator = charGen ?? asciiCharGen;

  return Arbitrary<String>((rand) {
    final size = rand.interval(minSize, maxSize);
    final array = <Shrinkable<int>>[];
    for (int i = 0; i < size; i++) {
      array.add(charGenerator.generate(rand));
    }

    return shrinkableString(array, minSize);
  });
}

/// Creates a generator for ASCII strings of a specified length range.
/// Equivalent to `stringGen(minSize, maxSize, asciiCharGen)`.
///
/// [minSize] The minimum length of the generated string (inclusive).
/// [maxSize] The maximum length of the generated string (inclusive).
/// Returns a generator that produces ASCII strings.
Generator<String> asciiStringGen(int minSize, int maxSize) {
  return stringGen(minSize, maxSize, asciiCharGen);
}

/// Creates a generator for Unicode strings of a specified length range.
/// Uses `unicodeCharGen` which avoids generating surrogate pair code points directly.
/// Equivalent to `stringGen(minSize, maxSize, unicodeCharGen)`.
///
/// [minSize] The minimum length of the generated string (inclusive).
/// [maxSize] The maximum length of the generated string (inclusive).
/// Returns a generator that produces Unicode strings.
Generator<String> unicodeStringGen(int minSize, int maxSize) {
  return stringGen(minSize, maxSize, unicodeCharGen);
}

/// Creates a generator for printable ASCII strings of a specified length range.
/// Equivalent to `stringGen(minSize, maxSize, printableAsciiCharGen)`.
///
/// [minSize] The minimum length of the generated string (inclusive).
/// [maxSize] The maximum length of the generated string (inclusive).
/// Returns a generator that produces printable ASCII strings.
Generator<String> printableAsciiStringGen(int minSize, int maxSize) {
  return stringGen(minSize, maxSize, printableAsciiCharGen);
}
