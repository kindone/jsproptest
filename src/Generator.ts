import { interval } from './generator/integer'
import { Random } from './Random'
import { Shrinkable } from './Shrinkable'
import { shrinkArrayLength } from './shrinker/array'
import { Stream } from './Stream'

export interface Generator<T> {
    generate(rand: Random): Shrinkable<T>
    map<U>(transformer: (arg: T) => U): Generator<U>
    flatMap<U>(genFactory: (arg: T) => Generator<U>): Generator<U>
    chain<U>(genFactory: (arg: T) => Generator<U>): Generator<[T, U]>
    chainAsTuple<Ts extends unknown[], U>(genFactory: (arg: Ts) => Generator<U>): Generator<[...Ts, U]>
    aggregate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<T>
    accumulate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<Array<T>>
    filter(filterer: (value: T) => boolean): Generator<T>
}

export class Arbitrary<T> implements Generator<T> {
    constructor(readonly genFunction: GenFunction<T>) {}

    generate(rand: Random): Shrinkable<T> {
        return this.genFunction(rand)
    }

    map<U>(transformer: (arg: T) => U): Generator<U> {
        const self = this
        return new Arbitrary<U>((rand: Random) => self.generate(rand).map(transformer))
    }

    aggregate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<T> {
        const self = this
        return interval(minSize, maxSize).flatMap(
            size =>
                new Arbitrary<T>((rand: Random) => {
                    let shr = self.generate(rand)
                    for (let i = 1; i < size; i++) shr = genFactory(shr.value).generate(rand)
                    return shr
                })
        )
    }

    accumulate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<Array<T>> {
        const self = this
        return new Arbitrary<Array<T>>((rand: Random) => {
            const size = rand.interval(minSize, maxSize)
            if (size === 0) return new Shrinkable([])

            let shr = self.generate(rand)
            const shrArr = [shr]
            for (let i = 1; i < size; i++) {
                shr = genFactory(shr.value).generate(rand)
                shrArr.push(shr)
            }
            return shrinkArrayLength(shrArr, minSize)
                .andThen(parent => {
                    const shrArr = parent.value
                    if (shrArr.length === 0) return new Stream()
                    const lastElemShr = shrArr[shrArr.length - 1]
                    const elemShrinks = lastElemShr.shrinks()
                    if (elemShrinks.isEmpty()) return new Stream()
                    return elemShrinks.transform(elem => {
                        const copy = shrArr.concat()
                        copy[copy.length - 1] = elem
                        return new Shrinkable(copy)
                    })
                })
                .map(arr => arr.map(shr => shr.value))
        })
    }

    flatMap<U>(genFactory: (arg: T) => Generator<U>): Generator<U> {
        const self = this
        return new Arbitrary<U>((rand: Random) => {
            const intermediate: Shrinkable<Shrinkable<U>> = self
                .generate(rand)
                .map(value => genFactory(value).generate(rand))
            return intermediate
                .andThen(interShr =>
                    interShr.value.flatMap<Shrinkable<U>>(second => new Shrinkable(new Shrinkable(second))).shrinks()
                )
                .map(shr => shr.value)
        })
    }

    chain<U>(genFactory: (arg: T) => Generator<U>): Generator<[T, U]> {
        const self = this
        return new Arbitrary<[T, U]>((rand: Random) => {
            const intermediate: Shrinkable<[T, Shrinkable<U>]> = self
                .generate(rand)
                .map(value => [value, genFactory(value).generate(rand)])
            return intermediate
                .andThen(interShr =>
                    interShr.value[1]
                        .flatMap<[T, Shrinkable<U>]>(
                            second => new Shrinkable([interShr.value[0], new Shrinkable(second)])
                        )
                        .shrinks()
                )
                .map(pair => [pair[0], pair[1].value])
        })
    }

    chainAsTuple<Ts extends unknown[], U>(genFactory: (arg: Ts) => Generator<U>): Generator<[...Ts, U]> {
        const self = this
        return new Arbitrary<[...Ts, U]>((rand: Random) => {
            const intermediate: Shrinkable<[...Ts, Shrinkable<U>]> = self.generate(rand).map(value => {
                if (!Array.isArray(value)) throw new Error('method unsupported for the type')
                const tuple = (value as unknown) as Ts
                return [...tuple, genFactory(tuple).generate(rand)]
            })
            return intermediate
                .andThen(interShr => {
                    const head = interShr.value.slice(0, interShr.value.length - 1) as Ts
                    const tail = interShr.value[interShr.value.length - 1] as Shrinkable<U>
                    return tail
                        .flatMap<[...Ts, Shrinkable<U>]>(second => new Shrinkable([...head, new Shrinkable(second)]))
                        .shrinks()
                })
                .map(pair => [
                    ...(pair.slice(0, pair.length - 1) as Ts),
                    (pair[pair.length - 1] as Shrinkable<U>).value,
                ])
        })
    }

    filter(filterer: (value: T) => boolean): Generator<T> {
        const self = this
        return new Arbitrary<T>((rand: Random) => {
            while (true) {
                const shr = self.generate(rand)
                if (filterer(shr.value)) return shr.filter(filterer)
            }
        })
    }
}

export class ArbiContainer<T> implements Generator<T> {
    public static defaultMinSize: number = 0
    public static defaultMaxSize: number = 100

    constructor(
        readonly genFunction: GenFunction<T>,
        public minSize: number = ArbiContainer.defaultMinSize,
        public maxSize: number = ArbiContainer.defaultMaxSize
    ) {}

    generate(rand: Random): Shrinkable<T> {
        return this.genFunction(rand)
    }

    map<U>(transformer: (arg: T) => U): Generator<U> {
        const self = this
        return new ArbiContainer<U>((rand: Random) => self.generate(rand).map(transformer), this.minSize, this.maxSize)
    }

    flatMap<U>(genFactory: (arg: T) => Generator<U>): Generator<U> {
        const self = this
        return new ArbiContainer<U>(
            (rand: Random) => {
                const intermediate: Shrinkable<Shrinkable<U>> = self
                    .generate(rand)
                    .map(value => genFactory(value).generate(rand))
                return intermediate
                    .andThen(interShr =>
                        interShr.value
                            .flatMap<Shrinkable<U>>(second => new Shrinkable(new Shrinkable(second)))
                            .shrinks()
                    )
                    .map(pair => pair.value)
            },
            this.minSize,
            this.maxSize
        )
    }

    chain<U>(genFactory: (arg: T) => Generator<U>): Generator<[T, U]> {
        const self = this
        return new ArbiContainer<[T, U]>(
            (rand: Random) => {
                const intermediate: Shrinkable<[T, Shrinkable<U>]> = self
                    .generate(rand)
                    .map(value => [value, genFactory(value).generate(rand)])
                return intermediate
                    .andThen(interShr =>
                        interShr.value[1]
                            .flatMap<[T, Shrinkable<U>]>(
                                second => new Shrinkable([interShr.value[0], new Shrinkable(second)])
                            )
                            .shrinks()
                    )
                    .map(pair => [pair[0], pair[1].value])
            },
            this.minSize,
            this.maxSize
        )
    }

    chainAsTuple<Ts extends unknown[], U>(genFactory: (arg: Ts) => Generator<U>): Generator<[...Ts, U]> {
        const self = this
        return new Arbitrary<[...Ts, U]>((rand: Random) => {
            const intermediate: Shrinkable<[...Ts, Shrinkable<U>]> = self.generate(rand).map(value => {
                if (!Array.isArray(value)) throw new Error('method unsupported for the type')
                const tuple = (value as unknown) as Ts
                return [...tuple, genFactory(tuple).generate(rand)]
            })
            return intermediate
                .andThen(interShr => {
                    const head = interShr.value.slice(0, interShr.value.length - 1) as Ts
                    const tail = interShr.value[interShr.value.length - 1] as Shrinkable<U>
                    return tail
                        .flatMap<[...Ts, Shrinkable<U>]>(second => new Shrinkable([...head, new Shrinkable(second)]))
                        .shrinks()
                })
                .map(pair => [
                    ...(pair.slice(0, pair.length - 1) as Ts),
                    (pair[pair.length - 1] as Shrinkable<U>).value,
                ])
        })
    }

    aggregate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<T> {
        const self = this
        return interval(minSize, maxSize).flatMap(
            size =>
                new ArbiContainer<T>(
                    (rand: Random) => {
                        let shr = self.generate(rand)
                        for (let i = 1; i < size; i++) shr = genFactory(shr.value).generate(rand)
                        return shr
                    },
                    minSize,
                    maxSize
                )
        )
    }

    accumulate(genFactory: (arg: T) => Generator<T>, minSize: number, maxSize: number): Generator<Array<T>> {
        const self = this
        return new ArbiContainer<Array<T>>(
            (rand: Random) => {
                const size = rand.interval(minSize, maxSize)
                if (size === 0) return new Shrinkable([])

                let shr = self.generate(rand)
                const shrArr = [shr]
                for (let i = 1; i < size; i++) {
                    shr = genFactory(shr.value).generate(rand)
                    shrArr.push(shr)
                }
                return shrinkArrayLength(shrArr, minSize)
                    .andThen(parent => {
                        const shrArr = parent.value
                        if (shrArr.length === 0) return new Stream()
                        const lastElemShr = shrArr[shrArr.length - 1]
                        const elemShrinks = lastElemShr.shrinks()
                        if (elemShrinks.isEmpty()) return new Stream()
                        return elemShrinks.transform(elem => {
                            const copy = shrArr.concat()
                            copy[copy.length - 1] = elem
                            return new Shrinkable(copy)
                        })
                    })
                    .map(arr => arr.map(shr => shr.value))
            },
            minSize,
            maxSize
        )
    }

    filter(filterer: (value: T) => boolean): Generator<T> {
        const self = this
        return new ArbiContainer<T>(
            (rand: Random) => {
                while (true) {
                    const shr = self.generate(rand)
                    if (filterer(shr.value)) return self.generate(rand).filter(filterer)
                }
            },
            this.minSize,
            this.maxSize
        )
    }

    setSize(min: number, max: number) {
        this.minSize = min
        this.maxSize = max
    }
}

export type GenFunction<ARG> = (rand: Random) => Shrinkable<ARG>
