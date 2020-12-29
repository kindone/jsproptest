class Iterator<T> {
    constructor(public stream: Stream<T>) {}

    hasNext(): boolean {
        return !this.stream.isEmpty();
    }

    next(): T {
        if (!this.hasNext()) throw new Error('iterator has no more next');
        const value = this.stream.getHead();
        this.stream = this.stream.getTail();
        return value;
    }
}

export class Stream<T> {
    constructor(
        readonly head?: T,
        readonly tailGen: () => Stream<T> = () => new Stream<T>()
    ) {}

    isEmpty(): boolean {
        return this.head === undefined;
    }

    getHead(): T {
        return this.head!;
    }

    getTail(): Stream<T> {
        if (this.isEmpty()) return Stream.empty<T>();
        else return this.tailGen();
    }

    iterator() {
        return new Iterator<T>(this);
    }

    transform<U>(transformer: (_: T) => U): Stream<U> {
        if (this.isEmpty()) return Stream.empty<U>();
        else {
            return new Stream<U>(transformer(this.getHead()), () =>
                this.tailGen().transform(transformer)
            );
        }
    }

    filter(criteria: (_: T) => boolean): Stream<T> {
        if (this.isEmpty()) return Stream.empty<T>();
        else {
            for (var itr = this.iterator(); itr.hasNext(); ) {
                const value = itr.next();
                if (criteria(value)) {
                    const stream = itr.stream;
                    return new Stream<T>(value, () => stream.filter(criteria));
                }
            }
            return Stream.empty<T>();
        }
    }

    concat(other: Stream<T>): Stream<T> {
        if (this.isEmpty()) return other;
        // TODO: is clone() at tailGen() needed?
        else
            return new Stream<T>(this.head, () => this.tailGen().concat(other));
    }

    take(n: number): Stream<T> {
        if (this.isEmpty() || n === 0) return Stream.empty<T>();
        else {
            return new Stream(this.head, () => this.tailGen().take(n - 1));
        }
    }

    clone() {
        return new Stream<T>(this.head, this.tailGen);
    }

    static empty<T>(): Stream<T> {
        return new Stream<T>();
    }

    static one<T>(value: T) {
        return new Stream<T>(value);
    }

    static two<T>(value1: T, value2: T) {
        return new Stream(value1, () => new Stream(value2));
    }
}
