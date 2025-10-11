# Flutter Compatibility Guide

## 🚨 Current Flutter Limitations

### 1. **No `dart:mirrors` Support**
- **Issue**: Flutter doesn't support `dart:mirrors` (reflection)
- **Impact**: The current default `forAll` function won't work in Flutter
- **Current Code**: Uses `reflect(func)` and `ClosureMirror`

### 2. **Different Error Types**
- **Mirrors version**: Throws `ArgumentError` for argument count mismatches
- **Flutter version**: Throws `NoSuchMethodError` via `Function.apply`
- **Impact**: Tests expect specific error types

### 3. **No Runtime Type Validation**
- **Mirrors version**: Validates argument types at runtime using reflection
- **Flutter version**: No type validation, relies on Dart's runtime type system

## ✅ What Works in Flutter

### 1. **Core Functionality**
- ✅ All generators (`Gen.interval`, `Gen.asciiString`, etc.)
- ✅ All combinators (`Gen.oneOf`, `Gen.construct`, etc.)
- ✅ Shrinking algorithms
- ✅ Property testing logic

### 2. **Alternative Functions**
- ✅ `forAllSimple` - Works without mirrors
- ✅ `forAllLegacy` - Traditional approach
- ✅ `forAll1`, `forAll2`, etc. - Numbered variants

### 3. **Platform Support**
- ✅ Flutter mobile (iOS/Android)
- ✅ Flutter web
- ✅ Flutter desktop
- ✅ Dart VM
- ✅ Dart web

## 🔧 Solutions

### Option 1: Use Flutter-Compatible Functions

```dart
import 'package:dartproptest/dartproptest.dart';

void main() {
  // Use forAllSimple instead of forAll
  forAllSimple(
    (int a, int b) => a + b == b + a,
    [Gen.interval(0, 100), Gen.interval(0, 100)],
  );
  
  // Or use numbered variants
  forAll2(
    (int a, int b) => a + b == b + a,
    Gen.interval(0, 100),
    Gen.interval(0, 100),
  );
}
```

### Option 2: Use Legacy Approach

```dart
import 'package:dartproptest/dartproptest.dart';

void main() {
  // Use forAllLegacy (deprecated but Flutter-compatible)
  forAllLegacy(
    (List<dynamic> args) {
      final a = args[0] as int;
      final b = args[1] as int;
      return a + b == b + a;
    },
    [Gen.interval(0, 100), Gen.interval(0, 100)],
  );
}
```

### Option 3: Use Property Class Directly

```dart
import 'package:dartproptest/dartproptest.dart';

void main() {
  final property = Property((List<dynamic> args) {
    final a = args[0] as int;
    final b = args[1] as int;
    return a + b == b + a;
  });
  
  property.forAllLegacy([Gen.interval(0, 100), Gen.interval(0, 100)]);
}
```

## 📊 Feature Comparison

| Feature | Mirrors Version | Flutter Version | Notes |
|---------|----------------|-----------------|-------|
| **Argument Count Validation** | ✅ `ArgumentError` | ❌ `NoSuchMethodError` | Different error types |
| **Type Validation** | ✅ Runtime validation | ❌ No validation | Relies on Dart runtime |
| **Error Messages** | ✅ Detailed with types | ⚠️ Basic messages | Less informative |
| **Performance** | ⚠️ Reflection overhead | ✅ Direct calls | Faster in Flutter |
| **Platform Support** | ❌ Not Flutter | ✅ All platforms | Universal compatibility |

## 🚀 Recommended Approach

### For New Flutter Projects:
```dart
// Use forAllSimple for Flutter compatibility
forAllSimple(
  (int a, int b) => a + b == b + a,
  [Gen.interval(0, 100), Gen.interval(0, 100)],
);
```

### For Existing Projects:
```dart
// Use numbered variants for type safety
forAll2(
  (int a, int b) => a + b == b + a,
  Gen.interval(0, 100),
  Gen.interval(0, 100),
);
```

### For Maximum Compatibility:
```dart
// Use forAllLegacy (works everywhere)
forAllLegacy(
  (List<dynamic> args) {
    final a = args[0] as int;
    final b = args[1] as int;
    return a + b == b + a;
  },
  [Gen.interval(0, 100), Gen.interval(0, 100)],
);
```

## 🔮 Future Improvements

1. **Conditional Compilation**: Use `dart:mirrors` when available, fallback to `Function.apply`
2. **Better Error Messages**: Parse `NoSuchMethodError` to provide clearer feedback
3. **Type Safety**: Implement compile-time type checking where possible
4. **Performance**: Optimize Flutter-compatible version for better performance

## 📝 Migration Guide

### From Mirrors Version to Flutter Version:

1. **Replace `forAll` with `forAllSimple`**:
   ```dart
   // Before (won't work in Flutter)
   forAll(
     (int a, int b) => a + b == b + a,
     [Gen.interval(0, 100), Gen.interval(0, 100)],
   );
   
   // After (Flutter-compatible)
   forAllSimple(
     (int a, int b) => a + b == b + a,
     [Gen.interval(0, 100), Gen.interval(0, 100)],
   );
   ```

2. **Update Error Handling**:
   ```dart
   // Before
   try {
     forAll(...);
   } on ArgumentError catch (e) {
     // Handle argument count mismatch
   }
   
   // After
   try {
     forAllSimple(...);
   } on NoSuchMethodError catch (e) {
     // Handle argument count mismatch
   }
   ```

3. **Test Updates**:
   ```dart
   // Before
   expect(() => forAll(...), throwsA(isA<ArgumentError>()));
   
   // After
   expect(() => forAllSimple(...), throwsA(isA<NoSuchMethodError>()));
   ```

## 🎯 Conclusion

While the current default `forAll` function uses mirrors and won't work in Flutter, the library provides several Flutter-compatible alternatives:

- **`forAllSimple`**: Drop-in replacement with same API
- **Numbered variants**: Type-safe alternatives (`forAll1`, `forAll2`, etc.)
- **`forAllLegacy`**: Traditional approach that works everywhere

The core property testing functionality works perfectly in Flutter - only the argument validation differs between platforms.
