import { JSONStringify } from './util/JSON'

/**
 * An iterator for consuming a Stream. It keeps track of the remaining stream state.
 * Note: This iterator modifies the stream it references as it progresses.
 */
class Iterator<T> {
    /**
     * @param stream The Stream to iterate over.
     */
    constructor(public stream: Stream<T>) {}

    hasNext(): boolean {
        return !this.stream.isEmpty()
    }

    next(): T {
        if (!this.hasNext()) throw new Error('iterator has no more next')
        const value = this.stream.getHead()
        this.stream = this.stream.getTail()
        return value
    }
}

/**
 * Represents a potentially infinite lazy sequence of values of type T.
 * Operations on Streams are typically lazy, meaning they don't compute values
 * until they are explicitly requested (e.g., by an Iterator).
 */
export class Stream<T> {
    /**
     * Creates a new Stream instance.
     * @param head The first element of the stream, or undefined if the stream is empty.
     * @param tailGen A function that, when called, generates the rest of the stream (the tail).
     *                This function enables the lazy evaluation of the stream.
     */
    constructor(readonly head?: T, readonly tailGen: () => Stream<T> = () => new Stream<T>()) {}

    isEmpty(): boolean {
        return this.head === undefined
    }

    getHead(): T {
        return this.head!
    }

    getTail(): Stream<T> {
        if (this.isEmpty()) return Stream.empty<T>()
        else return this.tailGen()
    }

    /**
     * Returns an Iterator to consume the stream.
     */
    iterator() {
        return new Iterator<T>(this)
    }

    /**
     * Lazily transforms each element of the stream using the provided function.
     * @param transformer A function to apply to each element.
     * @returns A new Stream containing the transformed elements.
     */
    transform<U>(transformer: (_: T) => U): Stream<U> {
        if (this.isEmpty()) return Stream.empty<U>()
        else {
            return new Stream<U>(transformer(this.getHead()), () => this.tailGen().transform(transformer))
        }
    }

    /**
     * Lazily filters the stream based on a predicate.
     * It iterates through the stream until it finds the first element satisfying the criteria.
     * @param criteria A function that returns true for elements to keep.
     * @returns A new Stream containing only the elements that satisfy the criteria.
     */
    filter(criteria: (_: T) => boolean): Stream<T> {
        if (this.isEmpty()) return Stream.empty<T>()
        else {
            for (const itr = this.iterator(); itr.hasNext(); ) {
                const value = itr.next()
                if (criteria(value)) {
                    const stream = itr.stream
                    return new Stream<T>(value, () => stream.filter(criteria))
                }
            }
            return Stream.empty<T>()
        }
    }

    /**
     * Lazily concatenates this stream with another stream.
     * The elements of the 'other' stream are only accessed after this stream is exhausted.
     * @param other The stream to append to the end of this stream.
     * @returns A new Stream representing the concatenation.
     */
    concat(other: Stream<T>): Stream<T> {
        if (this.isEmpty()) return other
        // TODO: is clone() at tailGen() needed?
        else return new Stream<T>(this.head, () => this.tailGen().concat(other))
    }

    /**
     * Lazily takes the first n elements from the stream.
     * @param n The maximum number of elements to take.
     * @returns A new Stream containing at most n elements from the beginning of this stream.
     */
    take(n: number): Stream<T> {
        if (this.isEmpty() || n === 0) return Stream.empty<T>()
        else {
            return new Stream(this.head, () => this.tailGen().take(n - 1))
        }
    }

    /**
     * Creates a shallow copy of the stream. The head is copied, and the tail generator function is reused.
     * Useful when multiple consumers might iterate over the same starting point independently.
     */
    clone() {
        return new Stream<T>(this.head, this.tailGen)
    }

    /**
     * Returns a string representation of the stream, evaluating up to n elements.
     * Useful for debugging and inspection.
     * @param n The maximum number of elements to include in the string representation. Defaults to 100.
     */
    toString(n: number = 100) {
        let str = 'Stream('
        const first = this.iterator()
        if (first.hasNext() && n > 0) str += JSONStringify(first.next())

        let i = 1
        for (let itr = first; itr.hasNext(); i++) {
            if (i >= n) {
                str += ', ...'
                break
            }
            const value = itr.next()
            str += ', ' + JSONStringify(value)
        }
        str += ')'
        return str
    }

    /**
     * Creates an empty Stream.
     */
    static empty<T>(): Stream<T> {
        return new Stream<T>()
    }

    /**
     * Creates a Stream with a single element.
     */
    static one<T>(value: T) {
        return new Stream<T>(value)
    }

    /**
     * Creates a Stream with two elements.
     */
    static two<T>(value1: T, value2: T) {
        return new Stream(value1, () => new Stream(value2))
    }

    /**
     * Creates a Stream with three elements.
     */
    static three<T>(value1: T, value2: T, value3: T) {
        return new Stream(value1, () => new Stream(value2, () => new Stream(value3)))
    }
}
