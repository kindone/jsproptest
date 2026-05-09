# TODO: jsproptest

Tracks open tasks and feature gaps relative to the C++ reference implementation (`cppproptest2`).

---

## Open

### [x] Floating point generator — nan/inf probability parameters
- **What**: Allow callers to control the probability of generating `NaN`, `+Infinity`, and `-Infinity` in addition to finite values. Default behaviour (finite-only) must remain unchanged.
- **API**: `Gen.float({ nanProb?: number, posInfProb?: number, negInfProb?: number })`
- **Implementation**: `FloatGenConfig` interface in `src/generator/floating.ts`; uses raw IEEE-754 bit generation with rejection for finite values, `oneOf` + `weightedGen` for special values, and validation for individual probs and sum ≤ 1.0.
- **Tests**: `test/generator.test.ts` — `Gen.float with nanProb/posInfProb/negInfProb config`
- **Lab demo**: `lab/jsproptest/src/poc_float_config.mjs`

### [x] maxDurationMs — time-box the test loop
- **What**: Stop running new trials after a wall-clock duration, even if `numRuns` hasn't been reached.
- **C++ API**: `ForAllConfig{ .maxDurationMs = 5000 }`
- **JS API**: `new Property(...).setMaxDurationMs(5000)`
- **Use case**: CI time budgets; slow generators or properties where you'd rather run fewer trials than time out the build.

### [ ] shrinkMaxRetries — retry-based shrinking for flaky properties
- **What**: Retry each shrink candidate up to N times before accepting or rejecting it. Improves minimal counterexample quality for non-deterministic (flaky) properties.
- **C++ API**: `ForAllConfig{ .shrinkMaxRetries = 5 }`
- **JS API (proposed)**: `new Property(...).setShrinkMaxRetries(5)`
- **Use case**: Properties with timing, concurrency, or probabilistic conditions that don't fail 100% of the time.

### [ ] shrinkTimeoutMs / shrinkRetryTimeoutMs — shrink phase time budgets
- **What**: Cap total shrink phase time and per-candidate retry time.
- **C++ API**: `ForAllConfig{ .shrinkTimeoutMs = 2000, .shrinkRetryTimeoutMs = 500 }`
- **JS API (proposed)**: `.setShrinkTimeoutMs(2000).setShrinkRetryTimeoutMs(500)`
- **Use case**: Prevents runaway shrinking on slow properties; pairs with `shrinkMaxRetries`.

### [ ] outputStream / errorStream — redirect log output
- **What**: Direct informational and failure output to custom streams/writers instead of `console.log`/`console.error`.
- **C++ API**: `ForAllConfig{ .outputStream = &stream, .errorStream = &errStream }`
- **JS API (proposed)**: `.setOutputStream(writer).setErrorStream(writer)` where `writer` is `{ write(s: string): void }`
- **Use case**: Capture output in tests without polluting Jest/Vitest output; route to custom loggers.

### [ ] onReproductionStats callback
- **What**: Callback invoked after each shrink-retry assessment with reproduction rate data.
- **C++ API**: `property(...).setOnReproductionStats(fn)` — `fn` receives `{ numReproduced, totalRuns, elapsedSec, argsAsString }`
- **JS API (proposed)**: `.setOnReproductionStats((stats) => { ... })`
- **Use case**: Observability into shrink behaviour for flaky tests; logging, debugging, CI dashboards.

---

## Completed

- **[x] seed + numRuns config** — `new Property(...).setSeed('42').setNumRuns(200)`
- **[x] maxDurationMs config** — `new Property(...).setMaxDurationMs(5000)`
- **[x] onStartup / onCleanup hooks** — `setOnStartup(fn)` / `setOnCleanup(fn)`
- **[x] Floating point finite-only generation** — `FloatingGen()` generates finite IEEE-754 doubles, including subnormals, with shrinking towards 0
- **[x] Floating point nan/inf probability config** — `Gen.float({ nanProb, posInfProb, negInfProb })`; validated; exported as `FloatGenConfig`
- **[x] Floating point shrinker bug fix** — fixed in v0.5.4 (`fix: floating point shrinker bug`)
- **[x] Stateful testing** — `StatefulProperty` with action sequences and model
