import { PreconditionError } from './error'

/**
 * Discards the current generated test case when `value` is false (like QuickCheck's `precondition` or
 * Hypothesis `assume`). Use inside a property body or with `Generator.filter` to skip invalid combinations
 * without counting them as failures.
 *
 * @param value - When `false`, the run is aborted by throwing `PreconditionError`.
 * @throws `PreconditionError` if `value` is false.
 */
export function precond(value: boolean): void {
    if (!value) throw new PreconditionError()
}
