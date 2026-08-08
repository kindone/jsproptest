/**
 * Contract: Stream string formatting should remain compatible for simple public
 * constructors and transformations.
 *
 * Scope: this preserves exact `Stream.toString()` examples from `stream.test.ts`.
 *
 * Helpers: these are compatibility examples, not broad stream algebra checks.
 */

import { Stream } from '../../src'
import { streamFromValues } from './helpers'

describe('v2 stream format compatibility', () => {
    it('formats empty, small, and truncated streams exactly', () => {
        const many = streamFromValues(Array.from({ length: 20 }, (_, index) => index))

        expect(Stream.empty<number>().toString()).toBe('Stream()')
        expect(Stream.one(1).toString()).toBe('Stream(1)')
        expect(Stream.two(1, 2).toString()).toBe('Stream(1, 2)')
        expect(Stream.three(1, 2, 3).toString()).toBe('Stream(1, 2, 3)')
        expect(many.toString(10)).toBe('Stream(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ...)')
        expect(many.toString(20)).toBe('Stream(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19)')
        expect(many.toString(20)).toBe(many.toString(30))
    })

    it('formats filtered, concatenated, taken, and transformed streams exactly', () => {
        const base = streamFromValues(Array.from({ length: 10 }, (_, index) => index))
        const concatenated = Array.from({ length: 10 }, (_, index) => Stream.two(index, index + 1))
            .reduce((stream, next) => stream.concat(next), Stream.empty<number>())

        expect(base.filter(value => value % 2 === 0).toString()).toBe('Stream(0, 2, 4, 6, 8)')
        expect(concatenated.toString()).toBe('Stream(0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10)')
        expect(base.take(5).toString()).toBe('Stream(0, 1, 2, 3, 4)')
        expect(base.transform(value => value * 2).toString()).toBe('Stream(0, 2, 4, 6, 8, 10, 12, 14, 16, 18)')
        expect(base.transform(value => String(value * 2)).toString()).toBe('Stream("0", "2", "4", "6", "8", "10", "12", "14", "16", "18")')
    })
})
