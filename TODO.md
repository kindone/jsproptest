# TODO: jsproptest

Tracks open tasks and feature gaps relative to the C++ reference implementation (`cppproptest2`).

---

## Open

### [ ] Batch property configuration
- **What**: Add a JS-friendly equivalent to C++ `ForAllConfig` / `setConfig(...)`.
- **Candidate API**: `property.setConfig({ seed, numRuns, maxDurationMs, shrinkMaxRetries, ... })` and optionally `forAll(func, config, ...gens)`.
- **Note**: Keep direct fluent setters as the primary API; config object is for parity and concise setup.

### [ ] noShrink combinator
- **What**: Public helper for generators whose values should not shrink, matching C++ `.noShrink()`.
- **Candidate API**: `gen.noShrink()` as an instance method and/or `Gen.noShrink(gen)`.

### [ ] Matrix/example table testing helper
- **What**: JS equivalent of C++ `matrix(...)` for Cartesian product example testing.
- **Candidate API**: `property.matrix([a1, a2], [b1, b2])`.

### [ ] Classification/statistics API
- **What**: JS equivalent for C++ `PROP_TAG`, `PROP_CLASSIFY`, `PROP_STAT`, and stat assertions.
- **Note**: Needs a JS-native design; do not copy C++ macros directly.

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

---

## Completed

- **[x] seed + numRuns config** — `new Property(...).setSeed('42').setNumRuns(200)`
- **[x] maxDurationMs config** — `new Property(...).setMaxDurationMs(5000)`
- **[x] onStartup / onCleanup hooks** — `setOnStartup(fn)` / `setOnCleanup(fn)`
- **[x] Floating point finite-only generation** — `FloatingGen()` generates finite IEEE-754 doubles, including subnormals, with shrinking towards 0
- **[x] Floating point nan/inf probability config** — `Gen.float({ nanProb, posInfProb, negInfProb })`; validated; exported as `FloatGenConfig`
- **[x] Floating point shrinker bug fix** — fixed in v0.5.4 (`fix: floating point shrinker bug`)
- **[x] shrinkMaxRetries** — `setShrinkMaxRetries(n)` retries shrink candidates for flaky properties
- **[x] shrinkTimeoutMs / shrinkRetryTimeoutMs** — `setShrinkTimeoutMs(ms)` and `setShrinkRetryTimeoutMs(ms)` cap total and per-candidate shrink time
- **[x] outputStream / errorStream** — `setOutputStream(writer)` and `setErrorStream(writer)` accept `{ write(message) }` writers
- **[x] onReproductionStats** — `setOnReproductionStats(fn)` receives `{ numReproduced, totalRuns, elapsedSec, argsAsString }`
- **[x] Stateful testing** — `StatefulProperty` with action sequences and model
- **[x] Stateful shrink retry/logging parity** — `StatefulProperty` supports `setShrinkMaxRetries`, shrink timeouts, output/error streams, and reproduction stats; post-check failures now enter shrinking
