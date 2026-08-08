# Test Portfolio

This directory contains the current organized test portfolio. The `v2` directory
has been flattened into `test/`; `readme.test.ts` remains here as the
README-specific drift layer.

See `PORTFOLIO.md` for the refresh contract, inventory map, retirement
decisions, and current portfolio roles.

## Contract Header

Each portfolio test file should start with a short comment covering:

- Contract: the behavior law or workflow guarantee the file protects.
- Scope: the behavior area, risk class, or role the file owns.
- Helpers: any local testing abstractions and why they are black-box enough.

Shared helper mechanics live in `helpers.ts`. Use those for repeated harness
roles such as generated seeds, seeded traces, shrink-tree traversal, stream
conversion, captured output, and expected failure messages. Keep
property-specific generators, profiles, and assertions in the contract file that
uses them.

## Portfolio Mode

The goal is to maintain a coherent full-suite portfolio:

1. Keep behavior, shrink, reproducibility, stateful, compatibility, and
   frontier-profile coverage in named files.
2. Keep examples and matrices near generated properties when they make the
   claim easier to review.
3. Keep deterministic seeds and avoid ambient time, randomness, filesystem, or
   env state.
4. Update `PORTFOLIO.md` when a file changes role or a coverage gap is found.

In this mode, "enhance the tests" means building a coherent test portfolio from
the guidelines as a whole, not only making local stepwise improvements.
