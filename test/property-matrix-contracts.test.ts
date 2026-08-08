/**
 * Contract: `Property.matrix()` should execute finite illustrative cases as a
 * Cartesian product, short-circuit on the first failure, and report failing
 * arguments. Matrix tests are for fixed examples, not randomized exploration.
 *
 * Scope: this file covers Cartesian ordering, single-axis matrices,
 * short-circuiting, failure messages, and empty matrices.
 *
 * Helpers: all cases are explicit examples because matrix is itself the finite
 * example interface.
 */

import { Property } from '../src'

describe('property matrix contracts', () => {
    it('runs every Cartesian-product combination and preserves argument order', () => {
        const seen: [number, string, boolean][] = []

        new Property((count: number, label: string, enabled: boolean) => {
            seen.push([count, label, enabled])
            return true
        }).matrix([1, 2], ['a', 'b'], [true, false])

        expect(seen).toEqual([
            [1, 'a', true],
            [1, 'a', false],
            [1, 'b', true],
            [1, 'b', false],
            [2, 'a', true],
            [2, 'a', false],
            [2, 'b', true],
            [2, 'b', false],
        ])
    })

    it('returns true for passing finite cases and supports single-axis matrices', () => {
        const seen: number[] = []
        const result = new Property((value: number) => {
            seen.push(value)
            return value >= 0
        }).matrix([0, 1, 2])

        expect(result).toBe(true)
        expect(seen).toEqual([0, 1, 2])
    })

    it('short-circuits on the first failing combination and reports its arguments', () => {
        const seen: number[] = []

        try {
            new Property((value: number) => {
                seen.push(value)
                return value < 3
            }).matrix([1, 2, 3, 4])
            fail('Expected matrix to fail')
        } catch (error) {
            expect((error as Error).message).toContain('[3]')
        }

        expect(seen).toEqual([1, 2, 3])
    })

    it('reports multi-argument failing matrix cases without evaluating later combinations', () => {
        const seen: Array<[number, number]> = []

        try {
            new Property((left: number, right: number) => {
                seen.push([left, right])
                return left * right < 4
            }).matrix([1, 2, 3], [1, 2])
            fail('Expected matrix to fail')
        } catch (error) {
            expect((error as Error).message).toContain('[2,2]')
        }

        expect(seen).toEqual([
            [1, 1],
            [1, 2],
            [2, 1],
            [2, 2],
        ])
    })

    it('empty matrices perform no runs and return true', () => {
        let ran = false
        const result = new Property((_value: number) => {
            ran = true
            return true
        }).matrix([])

        expect(result).toBe(true)
        expect(ran).toBe(false)
    })
})
