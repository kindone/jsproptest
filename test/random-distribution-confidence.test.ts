/**
 * Contract: random distribution helpers should provide reasonable sampling
 * confidence for probability parameters. These are confidence checks, not exact
 * statistical proofs.
 *
 * Scope: this file covers probabilistic confidence checks while keeping exact
 * distribution claims out of core contract tests.
 *
 * Helpers: margins are intentionally loose enough for CI variance and local
 * reduced-budget runs.
 */

import { Random } from '../src'
import { SAMPLES } from './run-config'

const distributionProfile = {
    probabilities: [0.1, 0.2, 0.5, 0.9],
    ratioMargin: 0.18,
    inRangePairs: [[0, 2], [0, 3], [0, 4], [0, 8], [0, 20]],
    uniformSpreadMargin: 0.55,
}

describe('random distribution confidence', () => {
    it('nextBoolean tracks requested true probabilities within a loose confidence margin', () => {
        const random = new Random()

        distributionProfile.probabilities.forEach(probability => {
            const ratio = Array.from(
                { length: SAMPLES.distributionValues },
                () => random.nextBoolean(probability)
            ).filter(Boolean).length / SAMPLES.distributionValues

            expect(Math.abs(ratio - probability)).toBeLessThan(distributionProfile.ratioMargin)
        })
    })

    it('nextLong and nextInt track requested boundary probabilities within a loose confidence margin', () => {
        const random = new Random()
        const longBounds = new Set(Random.LONG_BOUNDS)
        const intBounds = new Set(Random.INT_BOUNDS)

        distributionProfile.probabilities.forEach(probability => {
            const longRatio = Array.from(
                { length: SAMPLES.distributionValues },
                () => random.nextLong(probability)
            ).filter(value => longBounds.has(value)).length / SAMPLES.distributionValues
            const intRatio = Array.from(
                { length: SAMPLES.distributionValues },
                () => random.nextInt(probability)
            ).filter(value => intBounds.has(value)).length / SAMPLES.distributionValues

            expect(Math.abs(longRatio - probability)).toBeLessThan(distributionProfile.ratioMargin)
            expect(Math.abs(intRatio - probability)).toBeLessThan(distributionProfile.ratioMargin)
        })
    })

    it('inRange reaches every value in small half-open ranges with bounded spread', () => {
        const random = new Random()

        distributionProfile.inRangePairs.forEach(([min, max]) => {
            const counts = new Map<number, number>()
            for (let i = 0; i < SAMPLES.distributionValues; i++) {
                const value = random.inRange(min, max)
                counts.set(value, (counts.get(value) ?? 0) + 1)
            }

            expect(counts.size).toBe(max - min)
            const ratios = Array.from(counts.values()).map(value => value / SAMPLES.distributionValues)
            expect(ratios.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1)
            expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(distributionProfile.uniformSpreadMargin)
        })
    })
})
