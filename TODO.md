# TODO: jsproptest

Tracks open tasks and feature gaps relative to the C++ reference implementation (`cppproptest2`).

---

## Open

---

## Completed

- **[x] Container/string/dict/set named-param config overloads** — `Gen.array({ elemGen, minSize?, maxSize? })`, `Gen.set({ elemGen, minSize?, maxSize? })`, `Gen.string({ minSize?, maxSize?, charGen? })`, `Gen.dict({ keyGen, elemGen, minSize?, maxSize? })`, `Gen.uniqueArray({ elemGen, minSize?, maxSize? })`; positional forms fully backward-compatible; config interfaces (`ArrayGenConfig`, `SetGenConfig`, `StringGenConfig`, `DictGenConfig`) exported from package root; 21 tests in `test/generator.config.test.ts`
- **[x] Floating point generator — nan/inf probability parameters** — `Gen.float({ nanProb?, posInfProb?, negInfProb? })`; `FloatGenConfig` interface exported; validated; lab demo in `lab/jsproptest/src/poc_float_config.mjs`
- **[x] maxDurationMs — time-box the test loop** — `new Property(...).setMaxDurationMs(5000)`; stops new trials after wall-clock budget even if `numRuns` not reached
- **[x] noShrink combinator** — `Gen.noShrink(gen)` and `gen.noShrink()`; strips shrink stream; instance method on both `Arbitrary` and `ArbiContainer`; exported via `Gen.noShrink`
- **[x] Batch property configuration** — `property.setConfig({ seed, numRuns, maxDurationMs, shrinkMaxRetries, ... })`; applies only supplied keys; equivalent to individual fluent setters
- **[x] Matrix/example table testing helper** — `property.matrix([a1, a2], [b1, b2])`; Cartesian product of value lists; throws with failing combination on first failure
- **[x] Classification/statistics API** — `tag(key, value)`, `classify(condition, key, value)`, `stat(label, value)` module-level functions usable inside property body; `property.assertStatGe/Le/InRange(key, bound)`; summary printed to `outputStream` on success; exported from package root
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
