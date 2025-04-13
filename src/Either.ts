import { Option, Some, None } from './Option'

/**
 * Represents a value of one of two possible types (a disjoint union).
 * An instance of `Either` is either an instance of `Left` or `Right`.
 * By convention, `Left` holds errors and `Right` holds success values.
 * (as 'right' also means 'correct' in English)
 *
 * @template Left The type of the Left value.
 * @template Right The type of the Right value.
 */
export class Either<Left, Right> {
    /**
     * @internal
     */
    constructor(readonly left: Option<Left>, readonly right: Option<Right>) {}

    /**
     * Checks if this `Either` is a `Left`.
     */
    isLeft(): boolean {
        return !this.left.isEmpty()
    }

    /**
     * Checks if this `Either` is a `Right`.
     */
    isRight(): boolean {
        return !this.right.isEmpty()
    }

    /**
     * Gets the `Left` value.
     * @throws {Error} if this is a `Right`.
     */
    getLeft(): Left {
        if (!this.isLeft()) throw new Error('Cannot getLeft on a Right')
        return this.left.get()
    }

    /**
     * Gets the `Right` value.
     * @throws {Error} if this is a `Left`.
     */
    getRight(): Right {
        if (!this.isRight()) throw new Error('Cannot getRight on a Left')
        return this.right.get()
    }

    /**
     * Maps the `Right` value if this is a `Right`.
     *
     * @template NewRight The type of the new `Right` value.
     * @param fn The mapping function.
     */
    map<NewRight>(fn: (right: Right) => NewRight): Either<Left, NewRight> {
        if (this.isRight()) return new Either(None(), Some(fn(this.getRight())))
        else return new Either(this.left, None())
    }

    /**
     * Flat-maps the `Right` value if this is a `Right`.
     *
     * @template NewRight The type of the new `Right` value.
     * @param fn The mapping function returning an `Either`.
     */
    flatMap<NewRight>(fn: (right: Right) => Either<Left, NewRight>): Either<Left, NewRight> {
        if (this.isRight()) return fn(this.getRight())
        else return new Either<Left, NewRight>(this.left, None())
    }

    /**
     * Filters the `Right` value, returning `Left` if the predicate fails.
     * If the right exists and the predicate returns true, the right is returned unchanged.
     * If the right exists and the predicate returns false, the left is returned with the provided left value.
     * If the right does not exist, the left is returned unchanged.
     * @template NewLeft The type of the `Left` value if the filter fails.
     * @param fn The predicate function.
     * @param left The value to use for `Left` if the predicate fails.
     */
    filterOrElse<NewLeft>(fn: (right: Right) => boolean, left: NewLeft): Either<NewLeft, Right> {
        if (this.isRight()) {
            if (fn(this.getRight())) {
                return new Either(None<NewLeft>(), this.right)
            } else {
                return new Either(Some(left), None())
            }
        } else {
             return new Either(Some(left), None())
        }
    }


    /**
     * Maps the `Left` value if this is a `Left`.
     * If the left exists, the mapping function is applied to the left value and the result is returned as a new `Left`.
     * If the left does not exist, the right is returned unchanged.
     * @template NewLeft The type of the new `Left` value.
     * @param fn The mapping function.
     */
    mapLeft<NewLeft>(fn: (left: Left) => NewLeft): Either<NewLeft, Right> {
        if (this.isLeft()) return new Either(Some(fn(this.getLeft())), None())
        else return new Either(None(), this.right)
    }

    /**
     * Flat-maps the `Left` value if this is a `Left`.
     * If the left exists, the mapping function is applied to the left value and the result is returned as a new `Left`.
     * If the left does not exist, the right is returned unchanged.
     * @template NewLeft The type of the new `Left` value.
     * @param fn The mapping function returning an `Either`.
     */
    flatMapLeft<NewLeft>(fn: (left: Left) => Either<NewLeft, Right>): Either<NewLeft, Right> {
        if (this.isLeft()) return fn(this.getLeft())
        else return new Either<NewLeft, Right>(None(), this.right)
    }

    /**
     * Filters the `Left` value, returning `Right` if the predicate fails.
     * If the left exists and the predicate returns true, the left is returned unchanged.
     * If the left exists and the predicate returns false, the right is returned with the provided right value.
     * If the left does not exist, the right is returned unchanged.
     * @template NewRight The type of the `Right` value if the filter fails.
     * @param fn The predicate function.
     * @param right The value to use for `Right` if the predicate fails.
     */
    filterOrElseLeft<NewRight>(fn: (left: Left) => boolean, right: NewRight): Either<Left, NewRight> {
         if (this.isLeft()) {
             if (fn(this.getLeft())) {
                return new Either(this.left, None<NewRight>())
             } else {
                return new Either(None(), Some(right))
             }
        } else {
            return new Either(None(), Some(right))
        }
    }
}

/**
 * Creates a `Left` instance.
 * @template L Type of the `Left` value.
 * @template R Type of the `Right` value (defaults to `never`).
 */
export function Left<L, R = never>(left: L): Either<L, R> {
    return new Either<L, R>(Some(left), None())
}

/**
 * Creates a `Right` instance.
 * @template R Type of the `Right` value.
 * @template L Type of the `Left` value (defaults to `never`).
 */
export function Right<R, L = never>(right: R): Either<L, R> {
    return new Either<L, R>(None(), Some(right))
}
