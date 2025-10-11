import 'package:flutter/material.dart';
import 'package:dartproptest/dartproptest.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Compatibility Test',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Flutter Compatibility Test'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  String _testResult = 'Not tested yet';

  void _runCompatibilityTest() {
    try {
      // Test basic functionality
      final result = forAll(
        (int a, int b) => a + b == b + a, // Commutative property
        [Gen.interval(0, 100), Gen.interval(0, 100)],
        numRuns: 10, // Small number for quick test
      );

      setState(() {
        _testResult = result
            ? '✅ Flutter compatibility test PASSED!'
            : '❌ Test failed';
      });
    } catch (e) {
      setState(() {
        _testResult = '❌ Flutter compatibility test FAILED: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text(
              'Testing dartproptest Flutter compatibility:',
              style: TextStyle(fontSize: 18),
            ),
            const SizedBox(height: 20),
            Text(
              _testResult,
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _runCompatibilityTest,
              child: const Text('Run Compatibility Test'),
            ),
          ],
        ),
      ),
    );
  }
}
