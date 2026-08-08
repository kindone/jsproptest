/**
 * Shared execution budgets and semantic domains for the test portfolio.
 *
 * `JSPROPTEST_TEST_MULTIPLIER` scales exploration budgets only. It must not
 * change semantic contract boundaries such as threshold values or named
 * regression replay seeds.
 */

function readMultiplier(): number {
    const raw = Number(process.env.JSPROPTEST_TEST_MULTIPLIER ?? '1')
    return Number.isFinite(raw) && raw > 0 ? raw : 1
}

function scaled(base: number): number {
    return Math.max(1, Math.floor(base * readMultiplier()))
}

function scaledAtLeast(base: number, minimum: number): number {
    return Math.max(minimum, scaled(base))
}

export const RUNS = {
    tiny: scaled(1),
    smoke: scaled(20),
    profile: scaled(30),
    frontierInner: scaled(4),
    seedReplay: scaled(40),
    coreSeedReplay: scaled(50),
    contract: scaled(80),
    shrinkDomain: scaled(100),
    regressionReplay: scaledAtLeast(1000, 100),
    statefulModel: scaled(20),
    statefulBoundaryReplay: scaled(100),
    statefulPrefixReplay: scaled(300),
}

export const SAMPLES = {
    lifecycleRuns: scaled(8),
    nestedTrace: scaled(12),
    replayTrace: scaled(40),
    mixedSeedTrace: scaled(50),
    containerValues: scaled(40),
    dependentValues: scaled(100),
    shrinkReachabilityRoots: scaledAtLeast(200, 40),
    integerValues: scaled(200),
    booleanValues: scaled(400),
    distributionValues: scaledAtLeast(600, 200),
    finiteFloatValues: scaled(1000),
}

export const DOMAINS = {
    seed: { min: 1, max: 1_000_000 },
    smallSigned: { min: -25, max: 25 },
    narrowElement: { min: -3, max: 3 },
    smallNatural: { min: 0, max: 9 },
    mediumNatural: { min: 0, max: 20 },
    replayElement: { min: -20, max: 20 },
    uniqueElement: { min: 0, max: 30 },
    wideSigned: { min: -100, max: 100 },
    filteredMultiple: { min: -30, max: 30, divisor: 3 },
    noShrinkValue: { min: 5, max: 100 },
    shrinkNegativeWindow: { min: -8, max: -4 },
    dependentOuter: { min: 1, max: 5 },
    dependentBase: { min: 0, max: 2 },
    weightedChoiceLow: { min: 1, max: 3 },
    weightedChoiceHigh: { min: 6, max: 8 },
    weightedElement: { preferred: 1, alternate: 10 },
    reportingMixed: { min: -10, max: 10 },
    reportingSmall: { min: 0, max: 10 },
    reportingFailure: { min: 5, max: 10 },
    statefulBoundaryParam: { min: 0, max: 10 },
    statefulAddParam: { min: 1, max: 7 },
}

export const SIZES = {
    emptyToSmall: { min: 0, max: 5 },
    emptyToMedium: { min: 0, max: 20 },
    fixedPair: { min: 2, max: 2 },
    nonEmptySmallTrace: { min: 1, max: 6 },
    filteredContainer: { min: 2, max: 8 },
    docsQueryPairs: { min: 0, max: 6 },
}

export const TIME_BUDGETS = {
    exhaustedMs: 0,
    shortMs: 20,
    busyWaitPerRunMs: 5,
}

export const STATEFUL = {
    simpleInitialSize: { min: 0, max: 4 },
    modelInitialSize: { min: 0, max: 5 },
    simpleActions: { min: 1, max: scaledAtLeast(12, 1) },
    modelActions: { min: 1, max: scaledAtLeast(30, 1) },
    boundaryReplayActions: { min: 1, max: scaledAtLeast(10, 1) },
    prefixReplayActions: { min: 2, max: scaledAtLeast(4, 2) },
    singleReplayAction: { min: 1, max: 1 },
}
