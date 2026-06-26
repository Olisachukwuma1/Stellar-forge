# Contract Fuzz Testing

This directory contains fuzz testing targets for the token factory contract using `libfuzzer` and the `arbitrary` crate. The fuzz targets are designed to test critical contract logic with randomly generated inputs to uncover edge cases and potential panics.

## Overview

Fuzz testing generates random inputs to discover edge cases and potential crashes in arithmetic and validation logic. The fuzz targets focus on five critical areas:

1. **create_token**: UTF-8 string validation, name/symbol/decimals parsing, fee arithmetic with random inputs
2. **fee_arithmetic**: Integer overflow checking in fee calculations, saturation arithmetic, boundary conditions
3. **burn**: Burn amount arithmetic, balance invariants, total supply calculations with random amounts
4. **set_metadata**: Metadata URI string handling, fee comparison arithmetic, duplicate-set guard
5. **mint_tokens**: Amount validation, max-supply cap overflow (`checked_add`), fee distribution arithmetic

## Setup

### Prerequisites

- Rust toolchain (latest stable)
- `cargo-fuzz` (optional, for full libfuzzer integration):
  ```bash
  cargo install cargo-fuzz
  ```

### Building Fuzz Targets

```bash
cd contracts/token-factory/fuzz
cargo build --release
```

## Running Fuzz Tests

### Using cargo-fuzz

```bash
cd contracts/token-factory/fuzz
cargo fuzz run fuzz_create_token
```

### Using cargo directly

```bash
cd contracts/token-factory/fuzz
cargo +nightly run --release --bin fuzz_create_token
```

### Run with time and input limits

```bash
cargo +nightly run --release --bin fuzz_create_token -- -max_len=10000 -timeout=60
```

## Fuzz Targets

### fuzz_create_token

**Focus**: Input validation and string creation with random data

**Tests**:
- UTF-8 validation of random byte sequences
- String creation with various name/symbol values
- Decimals clamping (0-255)
- Saturation arithmetic on supply and fee values
- No panics on any valid input combination

**Success Criteria**: No panics on valid inputs; all assertions pass

**File**: `fuzz_targets/fuzz_create_token.rs`

### fuzz_fee_arithmetic

**Focus**: Fee calculation logic and overflow checking

**Tests**:
- Saturation arithmetic properties
- Base fee and metadata fee combinations
- Fee multiplication with operation counts
- Monotonic increase property (fees never decrease)
- No signed integer overflow

**Success Criteria**:
- No integer overflow panics
- All saturation operations complete safely
- Arithmetic properties maintained

**File**: `fuzz_targets/fuzz_fee_arithmetic.rs`

### fuzz_burn

**Focus**: Burn amount validation and balance calculations

**Tests**:
- Burn amount clamping and validation
- Sequential balance updates
- Full balance burns
- Negative amount handling
- Unsigned vs signed arithmetic edge cases

**Success Criteria**:
- No panics on any input value
- Balance invariants maintained (never negative)
- Saturation arithmetic works correctly

**File**: `fuzz_targets/fuzz_burn.rs`

### fuzz_set_metadata

**Focus**: Metadata URI string handling and fee arithmetic for `set_metadata`

**Tests**:
- Arbitrary byte sequences converted to UTF-8 metadata URIs (no length limit in contract)
- Fee sufficiency guard: `fee_payment >= metadata_fee`
- Fee remainder arithmetic after payment
- Duplicate-set guard simulation (idempotency path skips arithmetic)
- Saturating fee-accumulation operations matching `distribute_fee`

**Success Criteria**:
- No panics on any valid UTF-8 URI or fee combination
- Non-UTF-8 inputs handled without panic
- All arithmetic invariants maintained

**File**: `fuzz_targets/fuzz_set_metadata.rs`

### fuzz_mint_tokens

**Focus**: Amount validation, max-supply cap enforcement, and fee distribution for `mint_tokens`

**Tests**:
- Non-positive amount rejection (`amount <= 0`)
- Fee sufficiency guard: `fee_payment >= base_fee`
- `checked_add` overflow on `current_supply + amount` (maps to `ArithmeticOverflow` error)
- Max-supply cap enforcement: `new_total > cap` (maps to `MaxSupplyExceeded` error)
- Supply monotonicity: minting always increases total supply
- Fee split distribution arithmetic (two-recipient model)

**Success Criteria**:
- No panics on any `i128` amount or supply combination
- Overflow paths detected via `checked_add`, not via panic
- Supply invariants (`new_total <= cap`) maintained on success path

**File**: `fuzz_targets/fuzz_mint_tokens.rs`

## CI Integration

Fuzz tests are automatically run by GitHub Actions:

- **Trigger**: Pull requests modifying contract code
- **Schedule**: Daily at 2 AM UTC
- **Duration**: 60 seconds per target
- **Artifacts**: Crash artifacts uploaded on failure

See `.github/workflows/fuzz-testing.yml` for the workflow configuration.

## Interpreting Results

### Successful Run

```
...
artifact summary: 0 new, 0 unique
```

No artifacts = no crashes found ✓

### Crash Found

A crash will be saved to the work directory. The file contains the input that triggered the crash.

**Next Steps**:
1. Note the failing input sequence
2. Add regression test to contract test suite with the failing case
3. Fix the underlying bug
4. Verify crash is resolved in next fuzz run

## Known Limitations

1. **Simplified Targets**: Fuzz targets focus on pure Rust logic, not full contract interaction
2. **No WASM Execution**: Contract WASM execution is tested separately via integration tests
3. **Mock Environment**: Contract setup uses mocked Soroban environment

## Future Improvements

- [ ] Integration with continuous fuzzing service (OSS-Fuzz)
- [ ] More comprehensive contract interaction fuzzing
- [ ] Generational corpus for improved coverage
- [ ] Cross-contract fuzz testing
- [ ] Memory safety checking with sanitizers

## Resources

- [libfuzzer Documentation](https://llvm.org/docs/LibFuzzer/)
- [arbitrary Crate](https://docs.rs/arbitrary/)
- [cargo-fuzz Book](https://rust-fuzz.github.io/book/cargo-fuzz.html)
- [Fuzzing Rust Code](https://rust-lang.github.io/rustlings/fuzzing/)

