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

## Retirement Inventory

| Retired file | Primary category | Stability | Portfolio target | Status |
|---|---|---|---|---|
| `generator.test.ts` | generator domains, combinators, shrink regressions | mixed: contract + regression + topology | `generator-behavior-contracts.test.ts`, `generator-shrink-reachability.test.ts` | retired |
| `generator.config.test.ts` | config-object overloads and dict shrink regressions | contract + regression | `generator-behavior-contracts.test.ts`, `generator-config-regressions.test.ts` | retired |
| `combinator.test.ts` | oneOf/elementOf/construct/chain tuple examples | contract + distribution smoke | `generator-behavior-contracts.test.ts` | retired |
| `property.test.ts` | property execution, shrinking, nested failures, time budgets | mixed: contract + regression | `property-runner-contracts.test.ts`, `property-api-illustrations.test.ts`, `property-shrink-regressions.test.ts` | retired |
| `property.config.test.ts` | batch config and lifecycle hooks | contract | `property-reporting-contracts.test.ts` | retired |
| `property.classification.test.ts` | tag/classify/stat and stat assertions | contract | `property-reporting-contracts.test.ts` | retired |
| `property.matrix.test.ts` | finite matrix execution | contract | `property-matrix-contracts.test.ts` | retired |
| `stateful.test.ts` | stateful model execution and shrinking | contract + regression | `stateful-workflow-contracts.test.ts` | retired |
| `shrinkable.test.ts` | shrinkable stream composition | contract + compatibility | `core-utility-contracts.test.ts`, `shrinkable-composition-compatibility.test.ts` | retired |
| `random.test.ts` | RNG behavior and cloning | contract + confidence | `core-utility-contracts.test.ts`, `random-distribution-confidence.test.ts` | retired |
| `stream.test.ts` | lazy stream operations | contract + compatibility | `core-utility-contracts.test.ts`, `stream-format-compatibility.test.ts` | retired |
| `lib.test.ts` | Option/Either/Try and local test harness checks | mixed | `core-utility-contracts.test.ts` | retired; Jest/Error harness probes intentionally not promoted |
| `readme.test.ts` | README example drift | docs/API promise | `documentation-example-contracts.test.ts` | keep as docs-drift layer |
| `primitive.test.ts` | old primitive smoke | weak implementation-level smoke | `generator-shrink-reachability.test.ts` | retired |

## Current Portfolio Files

| File | Contract boundary | Coverage role |
|---|---|---|
| `generator-behavior-contracts.test.ts` | public generator and combinator domain behavior | primitive/container/config/combinator examples from `generator.test.ts`, `generator.config.test.ts`, `combinator.test.ts`; float/string/lazy/recursive/large-tuple contracts |
| `generator-config-regressions.test.ts` | config-form dictionary shrink regressions | dict key/value/membership shrink cases from `generator.config.test.ts` |
| `generator-shrink-reachability.test.ts` | direct shrink-axis reachability for dependent generators | chain/accumulate, set-subset, and noShrink/flatMap topology regressions from `generator.test.ts` |
| `property-runner-contracts.test.ts` | replay, shrink reporting, shrink-domain preservation, time budgets, option validation, frontier profile execution | seed/shrink/time-budget/frontier pieces from `property.test.ts` and generator regressions |
| `property-api-illustrations.test.ts` | readable `Property.example` and `forAll` API witnesses | basic return/void callback examples from `property.test.ts` |
| `property-shrink-regressions.test.ts` | named property shrink and nested failure regressions | shrink, nested shrink, and fastcheck-style cases from `property.test.ts` |
| `property-reporting-contracts.test.ts` | batch config equivalence, lifecycle hooks, output/error config, summaries, stat assertions, context isolation | `property.config.test.ts`, `property.classification.test.ts` |
| `stateful-workflow-contracts.test.ts` | stateful model execution, lifecycle hooks, shrink boundaries, reproduction reporting | strongest workflow and shrink cases from `stateful.test.ts` |
| `core-utility-contracts.test.ts` | Random, Stream, Shrinkable, Option, Either, and Try public behavior | `random.test.ts`, `stream.test.ts`, `shrinkable.test.ts`, stable parts of `lib.test.ts` |
| `shrinkable-composition-compatibility.test.ts` | exact public shrink-tree composition shapes | serialized `Shrinkable` composition examples from `shrinkable.test.ts` |
| `random-distribution-confidence.test.ts` | probabilistic distribution confidence checks | stronger sampling checks from `random.test.ts` |
| `stream-format-compatibility.test.ts` | exact stream string-format compatibility | exact `Stream.toString()` examples from `stream.test.ts` |
| `property-matrix-contracts.test.ts` | finite Cartesian-product example execution | `property.matrix.test.ts` |
| `documentation-example-contracts.test.ts` | executable documentation/API examples | representative contracts from `readme.test.ts` |

## Subsumption Criteria Used For Retired Tests

A legacy test can be retired only when the replacement track records all of the
following:

- The same public contract is named in a portfolio contract header.
- The portfolio generator domain is at least as broad or the old case is
  preserved as a named regression.
- The portfolio failure signal is no worse than the old failure signal.
- Shrink behavior, if relevant, is asserted directly instead of inferred from
  “test did not throw.”
- Focused portfolio tests, full tests, and build pass after the retirement.

## Current Retirement Decision

Retired legacy files:

- `primitive.test.ts`: its single implementation-level integer shrink smoke is
  represented by a public `Gen.interval` shrink-tree contract in
  `generator-shrink-reachability.test.ts`.
- `property.matrix.test.ts`: its stable public API cases are represented by
  `property-matrix-contracts.test.ts`, including Cartesian order, single-axis
  matrices, success return value, short-circuiting, failing argument messages,
  and empty matrices.
- `property.config.test.ts`: its public batch configuration cases are
  represented by `property-reporting-contracts.test.ts`, including seed replay,
  run counts, lifecycle hooks, individual-setter equivalence, partial configs,
  output/error streams, and shrink retry config acceptance.
- `combinator.test.ts`: oneOf/elementOf, weighted variants, construct, and
  tuple-chain APIs are represented by `generator-behavior-contracts.test.ts`.
- `generator.config.test.ts`: config defaults, positional forms, and dict
  shrink regressions are represented by `generator-behavior-contracts.test.ts`
  and `generator-config-regressions.test.ts`.
- `property.test.ts`: API examples, time budgets, option validation, shrink
  retry reporting, and named shrink regressions are represented by
  `property-api-illustrations.test.ts`, `property-runner-contracts.test.ts`,
  `property-reporting-contracts.test.ts`, and
  `property-shrink-regressions.test.ts`.
- `property.classification.test.ts`: summary, no-output safety, outside-run
  safety, stat assertion variants, failure summaries, and context isolation are
  represented by `property-reporting-contracts.test.ts`.
- `random.test.ts`: clone/range contracts and distribution confidence checks
  are represented by `core-utility-contracts.test.ts` and
  `random-distribution-confidence.test.ts`.
- `stream.test.ts`: stream algebra and exact string-format compatibility are
  represented by `core-utility-contracts.test.ts` and
  `stream-format-compatibility.test.ts`.
- `generator.test.ts`: finite float frontier sampling, special float config,
  string/unicode length coverage, large tuple generation, lazy evaluation,
  recursive generation, dependent combinator contracts, exhaustive bounded set
  shrinking, and noShrink/flatMap topology are represented by
  `generator-behavior-contracts.test.ts` and
  `generator-shrink-reachability.test.ts`.
- `stateful.test.ts`: successful lifecycle hooks, model comparison, postcheck
  failure cleanup behavior, parameter shrinking, prefix-parameter shrinking,
  reproduction stats, and option validation are represented by
  `stateful-workflow-contracts.test.ts`.
- `shrinkable.test.ts`: public shrink navigation and transform laws are
  represented by `core-utility-contracts.test.ts`; exact composition trees are
  represented by `shrinkable-composition-compatibility.test.ts`.
- `lib.test.ts`: Option/Either/Try branch, access, filter, map, and flatMap
  contracts are represented by `core-utility-contracts.test.ts`. Its Rand/Jest
  assertion/Error inheritance probes were not promoted because they test the
  local test harness and TypeScript runtime assumptions rather than jsproptest
  public API behavior.
- `testutil.ts`: retired after the last legacy users were removed. The shared
  helpers own only the serializer/traversal pieces still needed by promoted
  compatibility tests.

Kept docs-drift files:

- `readme.test.ts`: kept intentionally as a README drift layer. The
  documentation examples provide cleaner API illustrations, but the README
  file still protects the current README snippets and should move only as part
  of a docs refresh.

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

## Test Role Taxonomy

Use file names that state the role of the test, not its migration origin:

- `contracts`: stable public laws and core API guarantees.
- `regressions`: named bugs, counterexamples, fixed seeds, or shrink paths.
- `compatibility`: exact legacy behavior users may rely on, such as formatting
  or serialized output shape.
- `confidence`: statistical or sampling checks that increase trust but are not
  exact laws.
- `illustrations`: readable API witnesses and documentation-like examples.
- `robustness`: invalid-but-expected inputs, clean rejection, and option
  validation.
- `frontier`: under-sampled generated regions and profile-weighted exploration.

Avoid using a softer role name to hide a stronger claim. If exact output shape
is protected, prefer `compatibility` over `illustrations`; if a known bug is
preserved, prefer `regressions`.

## Constants and Execution Profiles

- Semantic constants name contract boundaries, generated domains, profiles, and
  replay fixtures. They do not scale with environment variables.
- Execution constants name exploration budgets: run counts, sample counts,
  trace lengths, stateful action counts, and nested inner/outer budgets.
- `JSPROPTEST_TEST_MULTIPLIER` scales portfolio execution budgets through
  `run-config.ts`. It should not alter semantic domains or regression replay
  thresholds.
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
