import { Either } from './Either'
import { None, Option, Some } from './Option'

/**
 * Represents the result of a computation that may either succeed with a value of type T
 * or fail with an Error.
 */
export class TryResult<T> {
    /**
     * @param result The successful result, wrapped in an Option. None if the computation failed.
     * @param error The error if the computation failed, wrapped in an Option. None if successful.
     */
    constructor(private result: Option<T>, private error: Option<Error>) {}

    isSuccessful(): boolean {
        return !this.result.isEmpty()
    }

    isFailure(): boolean {
        return this.result.isEmpty()
    }

    get(): T {
        if (this.isFailure()) throw new Error('value is invalid')
        return this.result.value!
    }

    /**
     * Returns the successful value if the computation succeeded, otherwise throws the error.
     * An optional mapper function can be provided to transform the error before throwing.
     * @param mapper An optional function to transform the error before it is thrown.
     * @throws {Error} The original error or the transformed error if the computation failed.
     */
    getOrThrow(mapper: (e: Error) => Error = (e: Error) => e) {
        if (this.isSuccessful()) return this.result.get()
        else throw mapper(this.error.get())
    }

    getError(): Error {
        if (!this.isFailure()) throw new Error('no error occurred but attempted to get error')
        return this.error.value!
    }

    toOption(): Option<T> {
        return this.result
    }

    /**
     * Converts this TryResult to an Either, with the Error as the Left value
     * and the successful result as the Right value.
     */
    toEither(): Either<Error, T> {
        return new Either(this.error, this.result)
    }

    /**
     * If the TryResult is successful, applies the function `fn` to the value.
     * Returns a new TryResult containing the result of the function application.
     * If the TryResult is a failure, returns the original failure.
     */
    map<U>(fn: (t: T) => U): TryResult<U> {
        if (this.result.isEmpty()) return new TryResult(None(), this.error)
        else return Try<U>(() => fn(this.result.get()))
    }

    /**
     * If the TryResult is a failure, applies the function `fn` to the error.
     * Returns a new TryResult with the original success value (if any) and the transformed error.
     * If the TryResult is successful, returns the original success.
     */
    mapError(fn: (e: Error) => Error): TryResult<T> {
        if (this.error.isEmpty()) return new TryResult(this.result, None())
        else return new TryResult(this.result, Some(fn(this.error.get())))
    }

    /**
     * If the TryResult is successful, applies the function `fn` (which returns a TryResult)
     * to the value and returns the resulting TryResult.
     * This allows chaining operations that may fail.
     * If the TryResult is a failure, returns the original failure.
     */
    flatMap<U>(fn: (t: T) => TryResult<U>): TryResult<U> {
        if (this.result.isEmpty()) {
            return new TryResult(None(), this.error)
        } else {
            return fn(this.result.get())
        }
    }

    /**
     * If the TryResult is a failure, applies the function `fn` (which returns a TryResult)
     * to the error and returns the resulting TryResult.
     * This allows chaining recovery operations based on the error.
     * If the TryResult is successful, returns the original success.
     */
    flatMapError(fn: (e: Error) => TryResult<T>): TryResult<T> {
        if (this.error.isEmpty()) {
            return new TryResult(this.result, None())
        } else {
            return fn(this.error.get())
        }
    }
}

/**
 * Factory function to create a TryResult by executing a function `fn`.
 * Captures any thrown error during the execution of `fn`.
 * @param fn The function to execute.
 * @returns A TryResult containing the return value of `fn` if successful,
 *          or the caught Error if `fn` throws an exception.
 */
export function Try<T>(fn: () => T): TryResult<T> {
    try {
        return new TryResult(Some(fn()), None())
    } catch (e) {
        return new TryResult(None(), Some(e as Error))
    }
}
