/**
 * Tests for Property.matrix() — Cartesian product example testing.
 */
import { Property } from '../src/Property'

describe('Property.matrix()', () => {
    it('runs every combination in the Cartesian product', () => {
        const seen: [number, number][] = []
        new Property((a: number, b: number) => {
            seen.push([a, b])
            return true
        }).matrix([1, 2, 3], [10, 20])

        expect(seen).toHaveLength(6)
        expect(seen).toContainEqual([1, 10])
        expect(seen).toContainEqual([1, 20])
        expect(seen).toContainEqual([2, 10])
        expect(seen).toContainEqual([2, 20])
        expect(seen).toContainEqual([3, 10])
        expect(seen).toContainEqual([3, 20])
    })

    it('returns true when all combinations pass', () => {
        const result = new Property((a: number, b: number) => a + b >= 0)
            .matrix([0, 1, 2], [0, 1])
        expect(result).toBe(true)
    })

    it('throws on the first failing combination', () => {
        expect(() => {
            new Property((a: number, b: number) => a + b < 5)
                .matrix([1, 2, 3], [1, 2, 3])
        }).toThrow(/matrix: property failed/)
    })

    it('error message contains the failing args', () => {
        // a*b < 4: fails first at (2,2) since (1,1),(1,2),(2,1) all pass
        try {
            new Property((a: number, b: number) => a * b < 4)
                .matrix([1, 2], [1, 2])
            fail('Expected matrix() to throw')
        } catch (e) {
            expect((e as Error).message).toContain('[2,2]')
        }
    })

    it('works with a single list (1-arg property)', () => {
        const seen: number[] = []
        new Property((n: number) => {
            seen.push(n)
            return true
        }).matrix([7, 8, 9])
        expect(seen).toEqual([7, 8, 9])
    })

    it('works with three lists', () => {
        const seen: [number, string, boolean][] = []
        new Property((a: number, b: string, c: boolean) => {
            seen.push([a, b, c])
            return true
        }).matrix([1, 2], ['x', 'y'], [true, false])
        expect(seen).toHaveLength(8) // 2 × 2 × 2
    })

    it('stops at the first failure (short-circuits)', () => {
        const seen: number[] = []
        expect(() => {
            new Property((n: number) => {
                seen.push(n)
                return n < 3
            }).matrix([1, 2, 3, 4, 5])
        }).toThrow()
        // Should stop at 3; must not have evaluated 4 and 5
        expect(seen).not.toContain(4)
        expect(seen).not.toContain(5)
    })

    it('empty list produces no runs and returns true', () => {
        let ran = false
        const result = new Property((_n: number) => { ran = true; return true }).matrix([])
        expect(ran).toBe(false)
        expect(result).toBe(true)
    })
})
