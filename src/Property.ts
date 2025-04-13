import { Generator } from './Generator'
import { Random } from './Random'
import { Shrinkable } from './Shrinkable'
import { PreconditionError } from './util/error'
import { JSONStringify } from './util/JSON'

// Type alias for a property function that returns boolean (true = pass)
type PropertyFunction<ARGS extends unknown[]> = (...args: ARGS) => boolean
// Type alias for a property function that returns void (implies pass, throws on failure)
type PropertyFunctionVoid<ARGS extends unknown[]> = (...args: ARGS) => void

/**
 * Internal class to hold the results of a shrinking operation.
 */
class ShrinkResult {
    /** Flag indicating if shrinking found a simpler failing case. */
    readonly isSucessful: boolean
    constructor(
        /** The simplest arguments found that still cause the property to fail. */
        readonly args: unknown[],
        /** The error object thrown by the property function for the simplest failing case. */
        readonly error?: object,
        /** History of shrinking steps taken (argument index, stringified args). */
        readonly failedArgs?: [number, string][]
    ) {
        this.isSucessful = typeof error !== 'undefined'
    }
}

/**
 * Represents a property-based test.
 * Encapsulates the test function, generators, execution logic, and configuration.
 */
export class Property<ARGS extends unknown[]> {
    /** Default number of test runs if not explicitly set. */
    private static defaultNumRuns = 200

    /** Optional setup function executed before each test run (including shrinks). */
    private onStartup?: () => void
    /** Optional teardown function executed after each *successful* test run (including shrinks). */
    private onCleanup?: () => void
    /** Seed for the random number generator. Empty string uses a time-based seed. */
    private seed: string = ''
    /** Number of times to generate arguments and run the test function. */
    private numRuns = Property.defaultNumRuns

    /**
     * Creates a new Property instance.
     * @param func The function to test. It should return boolean (true=pass) or void (throws on failure).
     */
    constructor(readonly func: PropertyFunction<ARGS> | PropertyFunctionVoid<ARGS>) {}

    /**
     * Runs the property test.
     * Executes the test function `numRuns` times with generated arguments.
     * On failure, attempts to shrink the arguments to a minimal failing case.
     * @param gens Generators for each argument of the test function.
     * @returns `true` if the property holds for all runs.
     * @throws An error describing the failure and the smallest failing arguments found.
     */
    forAll<GENS extends Generator<unknown>[]>(...gens: GENS): boolean {
        const random = this.seed === '' ? new Random() : new Random(this.seed)
        let numPrecondFailures = 0 // Counter for skipped runs due to preconditions
        let result: boolean | object = true // Holds the outcome of the latest test run

        for (let i = 0; i < this.numRuns; i++) {
            const savedRandom = random.clone() // Save RNG state for reproducible shrinking if this run fails
            if (this.onStartup) this.onStartup()

            const shrinkables = gens.map((gen: Generator<unknown>) => gen.generate(random))
            const args = shrinkables.map((shr: Shrinkable<unknown>) => shr.value)

            // Basic validation
            if (this.func.length !== args.length)
                throw new Error(
                    'forAll(): number of function parameters (' +
                        this.func.length +
                        ') != number of generators given (' +
                        args.length +
                        ')'
                )

            // Execute the test function, handling exceptions and PreconditionError
            try {
                const func = this.func as PropertyFunction<ARGS>
                const maybe_result = func(...(args as ARGS))
                if (typeof maybe_result !== 'undefined') result = maybe_result
                // Execute cleanup hook if defined and the function didn't throw
                if (this.onCleanup) this.onCleanup()
            } catch (e) {
                result = e as Error
                if (result instanceof PreconditionError) numPrecondFailures++
                // Log if too many preconditions fail, potentially indicating an issue
                if (numPrecondFailures > 0 && numPrecondFailures % this.numRuns === 0)
                    console.info('Number of precondition failure exceeding ' + numPrecondFailures)
            }

            // Skip to next iteration if a precondition failed
            if (result instanceof PreconditionError) {
                continue
            }

            // Check for actual failure (false return or Error thrown)
            // failed
            if ((typeof result === 'object' && !(result instanceof PreconditionError)) || !result) {
                // Attempt to shrink the failing arguments
                const shrinkResult = this.shrink(savedRandom, ...gens)
                // Format and throw error
                throw this.processFailureAsError(result, shrinkResult)
            }
        }

        // Property holds if loop completes without throwing
        return true
    }

    /**
     * Runs the property function with a specific set of example arguments.
     * Does not involve generation or shrinking.
     * Useful for testing specific known cases or debugging.
     * @param args The example arguments to test.
     * @returns `true` if the function returns true/void, `false` if it returns false or throws.
     */
    example(...args: ARGS): boolean {
        if (this.func.length !== args.length)
            throw new Error(
                'example(): number of function parameters (' +
                    this.func.length +
                    ') != number of arguments given (' +
                    args.length +
                    ')'
            )

        try {
            const func = this.func as PropertyFunction<ARGS>
            const maybe_result = func(...(args as ARGS))
            // Treat void return as success
            if (typeof maybe_result !== 'undefined') return maybe_result
            else return true
        } catch {
            // Treat any exception as failure
            return false
        }
    }

    /** Sets the seed for the random number generator for reproducible runs. */
    setSeed(seed: string) {
        this.seed = seed
        return this
    }

    /** Sets the number of test runs to execute. */
    setNumRuns(numRuns: number) {
        this.numRuns = numRuns
        return this
    }

    /** Sets a setup function to be called before each test execution (including shrinks). */
    setOnStartup(onStartup: () => void) {
        this.onStartup = onStartup
        return this
    }

    /** Sets a cleanup function to be called after each *successful* test execution (including shrinks). */
    setOnCleanup(onCleanup: () => void) {
        this.onCleanup = onCleanup
        return this
    }

    /** Sets the default number of runs for all subsequently created Property instances. */
    static setDefaultNumRuns(numRuns: number) {
        Property.defaultNumRuns = numRuns
    }

    /**
     * Internal method to perform shrinking on failed arguments.
     * It attempts to find the smallest combination of arguments that still causes the property to fail.
     * @param savedRandom The Random state corresponding to the generation of the initial failing args.
     * @param gens The original generators used.
     * @returns A ShrinkResult containing the outcome and the simplest failing args found.
     */
    private shrink<GENS extends Generator<unknown>[]>(savedRandom: Random, ...gens: GENS): ShrinkResult {
        // Regenerate the initial failing shrinkables using the saved random state
        const shrinkables = gens
            .map((gen: Generator<unknown>) => gen.generate(savedRandom))
            // Note: The original code had extra maps/concats here which were likely redundant
            .map((shr: Shrinkable<unknown>) => shr)
            .concat()

        const failedArgs: [number, string][] = [] // History of successful shrink steps (for reporting)

        // Start with the original failing arguments as the current best candidate
        const args = shrinkables.map((shr: Shrinkable<unknown>) => shr.value)
        let shrunk = false // Flag: Did we find any simpler failing case?
        let result: boolean | object = true // Stores the failure result (Error or false) of the simplest case found

        // Iterate through each argument position (index n)
        for (let n = 0; n < shrinkables.length; n++) {
            let shrinks = shrinkables[n].shrinks() // Get the shrink candidates for the nth argument

            // Repeatedly try to shrink argument n as long as we find simpler failing values
            while (!shrinks.isEmpty()) {
                const iter = shrinks.iterator()
                let shrinkFound = false // Found a smaller failing value for arg n in this pass?

                // Test each shrink candidate for the current argument n
                while (iter.hasNext()) {
                    const nextShrinkable = iter.next()
                    // Test the property with arg n replaced by the shrink candidate value
                    const testResult: boolean | object = this.testWithReplace(args, n, nextShrinkable.value)

                    // Check if this smaller value *also* causes a failure (ignoring PreconditionError)
                    if ((typeof testResult === 'object' && !(testResult instanceof PreconditionError)) || !testResult) {
                        // Yes, this shrink is a new, simpler failing case
                        result = testResult
                        shrinks = nextShrinkable.shrinks() // Get shrinks for this *new*, smaller value
                        args[n] = nextShrinkable.value
                        shrinkFound = true
                        break // Stop testing other shrinks at this level, focus on the new smaller value
                    }
                }

                if (shrinkFound) {
                    // Record the successful shrink step for reporting
                    failedArgs.push([n, JSONStringify(args)])
                    shrunk = true
                    // Continue shrinking the *same* argument (n) further
                } else {
                    // No shrink candidate for arg n at this level caused a failure
                    break // Stop shrinking arg n, move to the next argument (n+1)
                }
            }
        }

        if (shrunk) {
            // If shrinking was successful
            if (typeof result === 'object') {
                return new ShrinkResult(args, result, failedArgs)
            } else {
                // If the failure was returning false, create a placeholder error
                const error = new Error('  property returned false\n')
                Error.captureStackTrace(error, this.forAll) // Capture stack trace for context
                return new ShrinkResult(args, error, failedArgs)
            }
        } else {
            // If no shrinking was possible
            return new ShrinkResult(args)
        }
    }

    /**
     * Helper to test the property with one argument replaced.
     * Used during the shrinking process.
     */
    private testWithReplace(args: unknown[], n: number, replace: unknown): boolean | object {
        const newArgs = [...args.slice(0, n), replace, ...args.slice(n + 1)]
        return this.test(newArgs)
    }

    /**
     * Executes the core property function (`this.func`) once with the given arguments.
     * Handles startup/cleanup hooks and captures results or exceptions.
     * @returns `true` on success, `false` if the function returns false, or the `Error` object if it throws.
     */
    private test(args: unknown[]): boolean | object {
        // Argument count validation
        if (this.func.length !== args.length)
            throw new Error(
                'forAll(): number of function parameters (' +
                    this.func.length +
                    ') != number of generators given (' +
                    args.length +
                    ')'
            )

        try {
            // Execute startup hook if defined
            if (this.onStartup) this.onStartup()

            const func = this.func as PropertyFunction<ARGS>
            const maybe_result = func(...(args as ARGS))

            // Handle boolean return or void return
            if (typeof maybe_result !== 'undefined') {
                if (!maybe_result) return false // Explicit false return means failure
            }

            // Run cleanup only on success (true return or void return without exception)
            // Note: Cleanup does NOT run if the function returned false or threw an error.
            if (this.onCleanup) this.onCleanup()
            return true
        } catch (e) {
            // Catch exceptions
            // Note: Cleanup does NOT run in case of an exception.
            return e as Error
        }
    }

    /**
     * Constructs the final Error object to be thrown when a property fails.
     * Includes information about the original failure and the shrinking process.
     */
    private processFailureAsError(result: object | boolean, shrinkResult: ShrinkResult): Error {
        // shrink
        if (shrinkResult.isSucessful) {
            // Case 1: Shrinking was successful
            const shrinkLines =
                // Format the history of shrink steps
                shrinkResult.failedArgs?.map(([n, args]) => {
                    return `  shrinking found simpler failing arg ${n}: ${args}`
                }) || []

            // Construct message with simplest args
            const newError = new Error(
                'property failed (simplest args found by shrinking): ' +
                    JSONStringify(shrinkResult.args) +
                    '\n' +
                    shrinkLines.join('\n')
            )
            // Append stack trace from the error that occurred with the *shrunk* arguments
            const error = shrinkResult.error as Error
            newError.message += '\n  ' // Add space before original error message
            newError.stack = error.stack
            return newError
        }
        // not shrunk
        else {
            // Case 2: Shrinking did not find a simpler failing case
            // Construct message with original failing args
            const newError = new Error('property failed (args found): ' + JSONStringify(shrinkResult.args))

            if (typeof result === 'object') {
                // Subcase 2a: The original failure was an Error
                const error = result as Error
                // Append stack trace from the original error
                newError.message += '\n  ' // Add space before original error message
                newError.stack = error.stack
                return newError
            } else {
                // Subcase 2b: The original failure was returning false
                newError.message += '\nproperty returned false\n'
                // Capture stack trace pointing back to the forAll call
                Error.captureStackTrace(newError, this.forAll)
                return newError
            }
        }
    }
}

/**
 * Convenience function to create and run a Property test using default settings.
 * This is the main entry point for users.
 */
export function forAll<ARGS extends unknown[], GENS extends Generator<unknown>[]>(
    func: PropertyFunction<ARGS> | PropertyFunctionVoid<ARGS>,
    ...gens: GENS
): boolean {
    return new Property<ARGS>(func).forAll(...gens)
}
