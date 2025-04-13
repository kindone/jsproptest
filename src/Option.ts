/**
 * Represents an optional value: every `Option` is either `Some` and contains a value,
 * or `None` and does not.
 */
export class Option<T> {
    /**
     * Constructs an Option instance. Direct use is discouraged; prefer `Some(value)` or `None()`.
     * @param value The value to wrap, or undefined for None.
     */
    constructor(readonly value?: T) {}

    /** Checks if the Option is None (does not contain a value). */
    isEmpty(): boolean {
        return typeof this.value === 'undefined'
    }

    /**
     * Gets the value out of the Option.
     * Throws an error if the Option is None.
     */
    get(): T {
        if (this.isEmpty()) throw new Error('None does not contain value')

        return this.value!
    }

    /**
     * Maps an Option<T> to Option<U> by applying a function to the contained value.
     * If the option is None, it returns None.
     * @param fn The function to apply to the contained value.
     */
    map<U>(fn: (t: T) => U): Option<U> {
        if (this.isEmpty()) return None()
        else return Some(fn(this.value!))
    }

    /**
     * Applies a function that returns an Option to the contained value.
     * Useful for chaining operations that might return None.
     * @param fn The function to apply, which returns an Option.
     */
    flatMap<U>(fn: (t: T) => Option<U>): Option<U> {
        if (this.isEmpty()) return None()
        else return fn(this.value!)
    }

    /**
     * Returns the Option if it contains a value and the value satisfies the predicate.
     * Otherwise, returns None.
     * @param fn The predicate function to apply to the contained value.
     */
    filter(fn: (t: T) => boolean): Option<T> {
        if (!this.isEmpty() && fn(this.value!)) return new Option(this.value!)
        else return None()
    }
}

/** Creates an Option containing a value. */
export function Some<T>(value: T) {
    return new Option<T>(value)
}

/** Creates an Option that contains no value. */
export function None<T>() {
    return new Option<T>()
}
