<p align="center">
  <img src="docs/jsproptest.svg" alt="jsproptest logo" width="200"/>
</p>

# jsproptest

`jsproptest` is a property-based testing (PBT) framework for JavaScript and TypeScript, drawing inspiration from libraries such as Haskell's QuickCheck and Python's Hypothesis. Property-based testing shifts the focus from example-based verification to defining universal *properties* or *invariants* that must hold true for an input domain.

Instead of manually crafting test cases for specific inputs, PBT allows you to describe the *domain* of inputs your function expects and the *general characteristics* of the output. `jsproptest` then generates hundreds or thousands of varied inputs, searching for edge cases or unexpected behaviors that violate your defined properties.

## Getting Started

### Installation

To add `jsproptest` to your project, run the following command:

```bash
npm install jsproptest --save-dev
```
This will install the package and add it to your `devDependencies`.

## Key Features

`jsproptest` offers a rich set of features to empower your property-based testing efforts:

*   **Built-in Generators:** A comprehensive suite of generators for common data types (integers, strings, arrays, objects, etc.) and the ability to create custom generators.
*   **Powerful Combinators:** Flexible combinators to compose, transform, and filter generators, enabling the creation of complex and highly specific data structures.
*   **Automatic Shrinking:** When a test fails, `jsproptest` automatically tries to find the smallest possible input that still causes the failure, making debugging much easier.
*   **Stateful Testing:** Support for testing stateful systems by generating sequences of actions or commands and verifying invariants across these sequences.

## Documentation

For comprehensive documentation, including core concepts, API reference, and advanced features, please visit **[GitHub Pages documentation](https://kindone.github.io/jsproptest/)**. 