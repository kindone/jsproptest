import { Stream } from './Stream'
import { Try } from './Try'

export class Shrinkable<T> {
    constructor(
        readonly value: T,
        readonly shrinksGen: () => Stream<Shrinkable<T>> = () => new Stream<Shrinkable<T>>()
    ) {}

    toString() {
        return `Shrinkable(${this.value})`
    }

    shrinks(): Stream<Shrinkable<T>> {
        return this.shrinksGen()
    }

    with(shrinksGen: () => Stream<Shrinkable<T>>): Shrinkable<T> {
        return new Shrinkable(this.value, shrinksGen)
    }

    /**
     * Concatenates the given stream to the horizontal dead-ends of shrinkable tree. Does not alter this shrinkable.
     * Adds additional candidates to the tree with fixed stream.
     * @param then the stream to concatenate
     * @returns a new shrinkable with the concatenation of each stream in shrinkable tree and the given stream
     */
    concatStatic(then: () => Stream<Shrinkable<T>>): Shrinkable<T> {
        return this.with(() =>
            this.shrinks()
                .transform(shr => shr.concatStatic(then))
                .concat(then())
        )
    }

    /**
     * Concatenates the stream generated with given stream generator to the horizontal dead-ends of shrinkable tree. Does not alter this shrinkable.
     * Adds additional candidates to the tree, represented as stream generated based on the parent shrinkable of the horizontal dead-end.
     * @param then the stream generator to generate stream for concatenation. the function takes parent shrinkable as input.
     * @returns a new shrinkable with the concatenation of each stream in shrinkable tree and the given stream
     */
    concat(then: (_: Shrinkable<T>) => Stream<Shrinkable<T>>): Shrinkable<T> {
        return this.with(() =>
            this.shrinks()
                .transform(shr => shr.concat(then))
                .concat(then(this))
        )
    }

    /**
     * Inserts the given stream to the vertical dead-ends of shrinkable tree. Does not alter this shrinkable.
     * @param then the stream to insert at the vertical dead-ends
     * @returns a new shrinkable with the insertion of the given stream at the vertical dead-ends
     */
    andThenStatic(then: () => Stream<Shrinkable<T>>): Shrinkable<T> {
        if (this.shrinks().isEmpty()) {
            return this.with(then)
        } else {
            return this.with(() => this.shrinks().transform(shr => shr.andThenStatic(then)))
        }
    }

    /**
     * Inserts the stream generated with given stream generator to the vertical dead-ends of shrinkable tree. Does not alter this shrinkable.
     * Adds additional candidates to the tree, represented as stream generated based on the parent shrinkable of the vertical dead-end.
     * This effectively appends new shrinking strategy to the shrinkable
     * @param then the stream generator to generate stream for insertion. the function takes parent shrinkable as input.
     * @returns a new shrinkable with the insertion of the given stream at the vertical dead-ends
     */
    andThen(then: (_: Shrinkable<T>) => Stream<Shrinkable<T>>): Shrinkable<T> {
        if (this.shrinks().isEmpty()) {
            // filter: remove duplicates
            return this.with(() => then(this).filter(shr => shr.value !== this.value))
        } else {
            return this.with(() => this.shrinks().transform(shr => shr.andThen(then)))
        }
    }

    map<U>(transformer: (_: T) => U): Shrinkable<U> {
        const shrinkable: Shrinkable<U> = new Shrinkable<U>(transformer(this.value), () =>
            this.shrinksGen().transform(shr => shr.map<U>(transformer))
        )
        return shrinkable
    }

    flatMap<U>(transformer: (_: T) => Shrinkable<U>): Shrinkable<U> {
        return transformer(this.value).with(() => this.shrinks().transform(shr => shr.flatMap(transformer)))
    }

    filter(criteria: (_: T) => boolean): Shrinkable<T> {
        if (!criteria(this.value)) throw new Error('cannot apply criteria')
        return this.with(() =>
            this.shrinksGen()
                .filter(shr => criteria(shr.value))
                .transform(shr => shr.filter(criteria))
        )
    }

    take(n: number) {
        return this.with(() => this.shrinksGen().take(n))
    }

    /*
     * Returns the nth child of this shrinkable.
     * @throws Error if n is out of bound
     * @param n the index of the child
     * @return the nth child
     * */
    getNthChild(n: number): Shrinkable<T> {
        if (n < 0) throw new Error('Shrinkable getNthChild failed: index out of bound: ' + n + ' < 0')

        const shrinks = this.shrinks()
        let i = 0
        for (const iter = shrinks.iterator(); iter.hasNext(); i++) {
            if (i === n) return iter.next()
            else iter.next()
        }
        throw new Error('Shrinkable getNthChild failed: index out of bound: ' + n + ' >= ' + i)
    }

    /*
     * Returns the child shrinkable at the given steps, traversing the tree of children.
     * @throws Error if any step is out of bound
     * @param steps the indices of the children
     * @return the child shrinkable at the given steps
     * */
    retrieve(steps: number[]): Shrinkable<T> {
        let shr: Shrinkable<T> = this // eslint-disable-line @typescript-eslint/no-this-alias
        for (let i = 0; i < steps.length; i++) {
            shr = Try(() => shr.getNthChild(steps[i])).getOrThrow(
                e => new Error('Shrinkable retrieval failed at step ' + i + ': ' + e.toString())
            )
        }
        return shr
    }
}
