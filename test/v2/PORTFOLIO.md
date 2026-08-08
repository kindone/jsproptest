# jsproptest Test Portfolio Refresh

## Refresh Contract

The jsproptest suite protects a property-based testing library, not an
application workflow. Its stable contracts are the public API behaviors that let
users trust generated counterexamples:

- Generators produce values inside their declared domains.
- Generator combinators preserve dependent-domain constraints.
- Shrink trees preserve validity and expose useful shrink axes.
- Property execution handles examples, generated runs, replay, shrinking,
  lifecycle hooks, time budgets, and failure reporting.
- Classification/statistics APIs collect per-run observations without leaking
  between property executions.
- Stateful properties generate action sequences, keep model and object behavior
  comparable, shrink failing action traces, and report reproductions.
- Documentation examples compile and remain representative of the public API.

Out of scope for the fast portfolio refresh:

- Statistical proof of exact generator distributions.
- Exhaustive proof of every shrink tree for large domains.
- Cross-language parity with cppproptest or python-proptest.
- Performance benchmarking beyond bounded time-budget guardrails.

## Existing Portfolio Inventory

| Legacy file | Primary category | Stability | v2 target | Status |
|---|---|---|---|---|
| `generator.test.ts` | generator domains, combinators, shrink regressions | mixed: contract + regression + topology | `generator-behavior-contracts.test.ts`, `generator-shrink-reachability.test.ts` | partial |
| `generator.config.test.ts` | config-object overloads and dict shrink regressions | contract + regression | `generator-behavior-contracts.test.ts`, `generator-shrink-reachability.test.ts` | partial |
| `combinator.test.ts` | oneOf/elementOf/construct/chain tuple examples | contract + distribution smoke | `generator-behavior-contracts.test.ts` | partial |
| `property.test.ts` | property execution, shrinking, nested failures, time budgets | mixed: contract + regression | `property-runner-contracts.test.ts`, `property-reporting-contracts.test.ts` | partial |
| `property.config.test.ts` | batch config and lifecycle hooks | contract | `property-reporting-contracts.test.ts` | partial |
| `property.classification.test.ts` | tag/classify/stat and stat assertions | contract | `property-reporting-contracts.test.ts` | partial |
| `property.matrix.test.ts` | finite matrix execution | contract | `property-matrix-contracts.test.ts` | partial |
| `stateful.test.ts` | stateful model execution and shrinking | contract + regression | `stateful-workflow-contracts.test.ts` | partial |
| `shrinkable.test.ts` | shrinkable stream composition | contract + implementation-sensitive | `core-utility-contracts.test.ts` | partial; exact tree strings remain legacy |
| `random.test.ts` | RNG behavior and cloning | contract | `core-utility-contracts.test.ts` | partial |
| `stream.test.ts` | lazy stream operations | contract | `core-utility-contracts.test.ts` | partial |
| `lib.test.ts` | Option/Either/Try and local test harness checks | mixed | `core-utility-contracts.test.ts` | partial; Jest/Error harness checks stay legacy |
| `readme.test.ts` | README example drift | docs/API promise | `documentation-example-contracts.test.ts` | partial; keep docs drift layer |
| `primitive.test.ts` | old primitive smoke | weak implementation-level smoke | `generator-shrink-reachability.test.ts` | marked subsumed; user-review deletion candidate |

## Replacement Track

| v2 file | Contract boundary | Legacy coverage it starts to subsume |
|---|---|---|
| `generator-behavior-contracts.test.ts` | public generator and combinator domain behavior | primitive/container/combinator examples from `generator.test.ts`, `generator.config.test.ts`, `combinator.test.ts` |
| `generator-shrink-reachability.test.ts` | direct shrink-axis reachability for dependent generators | chain/accumulate topology regressions from `generator.test.ts` |
| `property-runner-contracts.test.ts` | replay, shrink reporting, shrink-domain preservation, frontier profile execution | seed/shrink/frontier pieces from `property.test.ts` and generator regressions |
| `property-reporting-contracts.test.ts` | batch config, lifecycle hooks, summaries, stat assertions, context isolation | `property.config.test.ts`, `property.classification.test.ts` |
| `stateful-workflow-contracts.test.ts` | stateful model execution, lifecycle hooks, shrink boundaries, reproduction reporting | strongest workflow and shrink cases from `stateful.test.ts` |
| `core-utility-contracts.test.ts` | Random, Stream, Shrinkable, Option, Either, and Try public behavior | `random.test.ts`, `stream.test.ts`, `shrinkable.test.ts`, stable parts of `lib.test.ts` |
| `property-matrix-contracts.test.ts` | finite Cartesian-product example execution | `property.matrix.test.ts` |
| `documentation-example-contracts.test.ts` | executable documentation/API examples | representative contracts from `readme.test.ts` |

## Subsumption Criteria Before Retiring Legacy Tests

A legacy test can be retired only when the replacement track records all of the
following:

- The same public contract is named in a v2 contract header.
- The v2 generator domain is at least as broad or the old case is preserved as a
  named regression.
- The v2 failure signal is no worse than the old failure signal.
- Shrink behavior, if relevant, is asserted directly instead of inferred from
  “test did not throw.”
- Focused v2 tests, full tests, and build pass after the retirement.

## Current Retirement Decision

No legacy files are deleted by the first refresh batch. `primitive.test.ts` is
the first clear user-review deletion candidate because its single
implementation-level integer shrink smoke is represented by a public
`Gen.interval` shrink-tree contract in
`generator-shrink-reachability.test.ts`. Other legacy files remain because they
are mixed enough that file-level deletion would retire useful regressions too
early.

## Seed and Nested-Scenario Policy

- Ordinary exploratory contracts use the property runner's randomness or fresh
  `Random` instances.
- Seed replay checks generate no-shrink seeds and treat the seed as the tested
  hyperparameter.
- Fixed seed literals are reserved for named regression replay checks, such as
  stateful shrink counterexamples that must preserve a known failing trace.
- Nested properties are used only when the outer context shapes the inner
  generated domain or run budget. The frontier-profile test follows this rule:
  the outer profile defines bounds and the inner property explores generated
  no-shrink seeds inside that profile.

## Deterministic Counterpart Policy

- Each `forAll` should have a nearby `.example()` or `.matrix()` counterpart
  when a readable witness exists.
- The deterministic counterpart explains the generated claim; it does not
  replace generated exploration or duplicate every random case.
- Use `.example()` for canonical witnesses, boundary values, or replay seeds.
- Use `.matrix()` for finite profile sets, illustrative API examples, and small
  Cartesian products that preserve meaningful legacy coverage.
- Reporting/statistics examples should avoid pretending to exercise summary
  aggregation; those assertions belong to the generated `forAll` context.

## Constants and Execution Profiles

- Semantic constants name contract boundaries, generated domains, profiles, and
  replay fixtures. They do not scale with environment variables.
- Execution constants name exploration budgets: run counts, sample counts,
  trace lengths, stateful action counts, and nested inner/outer budgets.
- `JSPROPTEST_TEST_MULTIPLIER` scales portfolio execution budgets through
  `run-config.ts`. It should not alter semantic domains or regression replay
  thresholds. `JSPROPTEST_V2_MULTIPLIER` is accepted only as a temporary
  compatibility alias during migration.
- Inline numeric values are reserved for illustrative matrix examples,
  probability weights, and thresholds whose meaning is explained in the local
  test.

## Shared Helper Boundary

- `helpers.ts` owns repeated harness mechanics: generated no-shrink seed
  domains, seeded random replay, generated trace collection, shrink traversal,
  stream conversion, output capture, and expected failure-message capture.
- Contract files keep their own profiles, domain-specific generators, examples,
  matrices, and assertions.
- A helper name should describe the testing role, not the implementation detail:
  for example, `collectSeededTrace` is preferable to `collectTrace`, and
  `capturePropertyOutput` is preferable to `makeStream`.

## Lessons From This Pass

- Portfolio refresh needs a map before deletion; otherwise “better tests” become
  local edits with unclear coverage movement.
- Names should describe behavior boundaries. Avoid `*-laws` when the file also
  covers replay, reporting, frontier profiles, or shrink topology.
- Strong legacy regressions can be promoted without immediately deleting their
  original file. Subsumption is a separate review step.
- Distribution checks should be bounded smoke/contracts with loose statistical
  assertions, not claims of exact probability.
