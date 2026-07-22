/**
 * Per-forAll() context for tag collection and stat assertions.
 *
 * The module-level singleton (`_currentCtx`) lets property body code call
 * `tag()` / `classify()` / `stat()` without an explicit context argument,
 * matching the ergonomics of C++ `PROP_TAG` / `PROP_CLASSIFY` / `PROP_STAT`.
 */

// key → value → count
type TagCounts = Map<string, Map<string, number>>

/** A stat assertion registered on a Property before calling `forAll()`. */
export type StatAssertion =
    | { type: 'GE';       key: string; bound: number }
    | { type: 'LE';       key: string; bound: number }
    | { type: 'IN_RANGE'; key: string; min: number; max: number }

export class PropertyContext {
    private readonly _tags: TagCounts = new Map()

    // ---- tag accumulation ----

    tag(key: string, value: unknown): void {
        const val = String(value)
        let valueMap = this._tags.get(key)
        if (!valueMap) {
            valueMap = new Map()
            this._tags.set(key, valueMap)
        }
        valueMap.set(val, (valueMap.get(val) ?? 0) + 1)
    }

    classify(condition: boolean, key: string, value: unknown): void {
        if (condition) this.tag(key, value)
    }

    stat(label: string, value: unknown): void {
        this.tag(label, value)
    }

    hasTags(): boolean {
        return this._tags.size > 0
    }

    // ---- stat assertions ----

    /**
     * Checks each registered assertion against the accumulated tag counts.
     * Stat assertions compare the ratio of runs where `stat(label, value)` produced "true".
     * @param assertions The assertions declared on the Property.
     * @param totalRuns  The number of completed random runs.
     * @returns Array of failure messages (empty if all assertions pass).
     */
    checkStatAssertions(assertions: StatAssertion[], totalRuns: number): string[] {
        if (totalRuns === 0) return []
        const failures: string[] = []
        for (const a of assertions) {
            const valueMap = this._tags.get(a.key)
            const count = valueMap?.get('true') ?? 0
            const ratio = count / totalRuns
            switch (a.type) {
                case 'GE':
                    if (ratio < a.bound)
                        failures.push(
                            `assertStatGe("${a.key}", ${a.bound}) failed: ratio ${ratio.toFixed(4)} < ${a.bound} (${count}/${totalRuns})`
                        )
                    break
                case 'LE':
                    if (ratio > a.bound)
                        failures.push(
                            `assertStatLe("${a.key}", ${a.bound}) failed: ratio ${ratio.toFixed(4)} > ${a.bound} (${count}/${totalRuns})`
                        )
                    break
                case 'IN_RANGE':
                    if (ratio < a.min || ratio > a.max)
                        failures.push(
                            `assertStatInRange("${a.key}", ${a.min}, ${a.max}) failed: ratio ${ratio.toFixed(4)} not in [${a.min}, ${a.max}] (${count}/${totalRuns})`
                        )
                    break
            }
        }
        return failures
    }

    // ---- summary ----

    /**
     * Writes a frequency table of all collected tags to `stream`.
     * Each key/value pair shows count, total, and percentage.
     */
    printSummary(stream: { write(msg: string): void }): void {
        for (const [key, valueMap] of this._tags) {
            const total = [...valueMap.values()].reduce((a, b) => a + b, 0)
            stream.write(`  ${key}:\n`)
            for (const [value, count] of valueMap) {
                const pct = ((count / total) * 100).toFixed(1)
                stream.write(`    ${value}: ${count}/${total} (${pct}%)\n`)
            }
        }
    }
}

// ---- Module-level singleton ----

let _currentCtx: PropertyContext | null = null

/** @internal Set by Property.forAll() — do not call directly. */
export function _setContext(ctx: PropertyContext | null): void {
    _currentCtx = ctx
}

// ---- User-facing functions (callable from inside a property body) ----

/**
 * Record a key/value label for the current test run.
 * Counts accumulate across all runs and appear in the post-run summary.
 *
 * @example
 * ```ts
 * new Property((n: number) => {
 *     tag('size', n > 100 ? 'large' : 'small')
 *     return true
 * }).forAll(Gen.interval(0, 200))
 * ```
 */
export function tag(key: string, value: unknown): void {
    _currentCtx?.tag(key, value)
}

/**
 * Conditionally record a label — records `value` under `key` only when `condition` is true.
 *
 * @example classify(n < 0, 'sign', 'negative')
 */
export function classify(condition: boolean, key: string, value: unknown): void {
    _currentCtx?.classify(condition, key, value)
}

/**
 * Record a boolean/numeric expression result under its label.
 * Equivalent to `tag(label, String(value))`.
 * Use with `assertStatGe`/`assertStatLe`/`assertStatInRange` to enforce
 * that the ratio of "true" outcomes meets a bound.
 *
 * @example
 * ```ts
 * new Property((n: number) => {
 *     stat('is_positive', n > 0)
 *     return true
 * })
 *   .assertStatGe('is_positive', 0.4)   // ≥40% of runs must have n > 0
 *   .forAll(Gen.interval(-100, 100))
 * ```
 */
export function stat(label: string, value: unknown): void {
    _currentCtx?.stat(label, value)
}
