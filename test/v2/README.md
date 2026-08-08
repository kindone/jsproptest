# v2 Test Portfolio

This directory is the additive replacement track for the existing test suite.
Do not delete v1 tests just because a v2 test overlaps them. Replace v1 coverage
only after review shows that v2 subsumes the old test's contract.

See `PORTFOLIO.md` for the refresh contract, inventory map, subsumption
criteria, and current promotion status.

## Contract Header

Each v2 test file should start with a short comment covering:

- Contract: the behavior law or workflow guarantee the file protects.
- Scope: which older tests or risk areas it is intended to subsume.
- Helpers: any local testing abstractions and why they are black-box enough.

Shared helper mechanics live in `helpers.ts`. Use those for repeated harness
roles such as generated seeds, seeded traces, shrink-tree traversal, stream
conversion, captured output, and expected failure messages. Keep
property-specific generators, profiles, and assertions in the contract file that
uses them.

## Refresh Mode

The goal is to support a full-suite refresh workflow:

1. Inventory existing examples, smoke tests, regression tests, and property laws.
2. Promote the strongest tests into v2 with clearer contracts.
3. Add missing behavior, shrink, reproducibility, stateful, and frontier-profile coverage.
4. Review subsumption explicitly before replacing old tests.
5. Keep deterministic seeds and avoid ambient time, randomness, filesystem, or env state.

In this mode, "enhance the tests" means building a coherent test portfolio from
the guidelines as a whole, not only making local stepwise improvements.
