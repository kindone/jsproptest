import { Stream } from '../src/Stream'

describe('stream', () => {
    it('empty', () => {
        const stream = Stream.empty<number>()
        expect(stream.toString()).toBe('Stream()')
    })

    it('one', () => {
        const stream = Stream.one(1)
        expect(stream.toString()).toBe('Stream(1)')
    })

    it('two', () => {
        const stream = Stream.two(1, 2)
        expect(stream.toString()).toBe('Stream(1, 2)')
    })

    it('three', () => {
        const stream = Stream.three(1, 2, 3)
        expect(stream.toString()).toBe('Stream(1, 2, 3)')
    })

    it('many', () => {
        let stream = Stream.empty<number>()
        for (let i = 0; i < 20; i++) {
            const str = Stream.one<number>(i)
            stream = stream.concat(str)
        }

        expect(stream.toString(10)).toBe('Stream(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ...)')
        expect(stream.toString(20)).toBe('Stream(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19)')
        expect(stream.toString(20)).toBe(stream.toString(30))
    })

    it('Stream::filter', () => {
        let stream = Stream.empty<number>()
        for (let i = 0; i < 10; i++) {
            const str = Stream.one<number>(i)
            stream = stream.concat(str)
        }
        stream = stream.filter(n => n % 2 === 0)
        expect(stream.toString()).toBe('Stream(0, 2, 4, 6, 8)')
    })

    it('Stream::concat', () => {
        let stream = Stream.empty<number>()
        for (let i = 0; i < 10; i++) {
            const str = Stream.two<number>(i, i + 1)
            stream = stream.concat(str)
        }
        expect(stream.toString()).toBe('Stream(0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10)')
    })

    it('Stream::take', () => {
        let stream = Stream.empty<number>()
        for (let i = 0; i < 10; i++) {
            const str = Stream.one<number>(i)
            stream = stream.concat(str)
        }
        stream = stream.take(5)
        expect(stream.toString()).toBe('Stream(0, 1, 2, 3, 4)')
    })

    it('Stream::transform', () => {
        let stream = Stream.empty<number>()
        for (let i = 0; i < 10; i++) {
            const str = Stream.one<number>(i)
            stream = stream.concat(str)
        }
        stream = stream.transform(n => n * 2)
        expect(stream.toString()).toBe('Stream(0, 2, 4, 6, 8, 10, 12, 14, 16, 18)')

        let stream2 = stream.transform(n => n.toString())
        expect(stream2.toString()).toBe('Stream("0", "2", "4", "6", "8", "10", "12", "14", "16", "18")')
    })

    it('Stream::iterator', () => {
        let stream = Stream.empty<number>()
        for (let i = 0; i < 10; i++) {
            const str = Stream.one<number>(i)
            stream = stream.concat(str)
        }
        const itr = stream.iterator()
        let arr: number[] = []
        while (itr.hasNext()) arr.push(itr.next())
        expect(arr).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
})
