import { Stream } from '../src/Stream'

describe('stream', () => {
    it('one', () => {
        const str = Stream.one(1)
        for (let itr = str.iterator(); itr.hasNext(); ) {
            const value = itr.next()
            console.log('stream value: ' + value)
        }
    })

    it('two', () => {
        const str = Stream.two(1, 2)
        for (let itr = str.iterator(); itr.hasNext(); ) {
            const value = itr.next()
            console.log('stream value: ' + value)
        }
    })

    it('many', () => {
        let stream = Stream.empty<number>()
        for (let i = 0; i < 1000; i++) {
            const str = Stream.one<number>(i)
            stream = stream.concat(str)
        }

        for (let itr = stream.iterator(); itr.hasNext(); ) {
            console.log('stream: ' + itr.next())
        }
    })

    it('Stream::filter', () => {
        let stream = Stream.empty<number>()
        for (let i = 0; i < 10; i++) {
            const str = Stream.one<number>(i)
            stream = stream.concat(str)
        }
        stream = stream.filter(n => n % 2 == 0)
        for (let itr = stream.iterator(); itr.hasNext(); ) {
            console.log('stream: ' + itr.next())
        }
    })
})
