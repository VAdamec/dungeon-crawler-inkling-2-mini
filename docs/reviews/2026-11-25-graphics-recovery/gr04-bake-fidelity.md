# GR-04 — Bake fidelity and cost

Date: 2026-11-25
Status: complete

## Changes
- `docs/previews/2026-11-25-0x72/bake-runtime.cjs`: added exported pure builder/API (`buildPayload`, `buildJS`, `validatePayload`, encode/crop/decode helpers), `--check` non-writing mode, and `--out` support. Deterministic build: unchanged sources produce identical bytes.
- `tests/game.test.cjs`: added `GR-04 bake is deterministic and round-trips selected source crops` validating deterministic build, checked-in `js/art-runtime.js` byte equality to bake output, and RGBA round-trip for every selected character/item/environment crop (530 frame checks, 2 empty semantic states), including anchor/bounds metadata.

## Round-trip / determinism evidence
- `bake-runtime.cjs --check` against `js/art-runtime.js`: **ok, 10.78MB**.
- Test round-trip: **530 frame checks, 0 mismatches, 2 empty states**. Compared decoded baked RGBA to selected PNG crops for knight + 25 character manifests, 31 item/effect assets, and 24 environment assets/material parts; validated anchor/bounds/crop references.

## Cost/performance report (measured, default Node with required DYLD path)
- `js/art-runtime.js`: **11,299,262 bytes** (10.78 MB), generated checked-in plain script.
- Payload content: **26 characters, 31 items, 24 environment assets, 8 aliases, 2 item aliases**.
- Frames: **530 total, 528 non-empty, 4,124,812 source pixels represented**.
- Encoded data: **unique RLE blobs 530/530, unique palettes 529/530, RLE base64 bytes 2,987,964, palette JSON bytes 7,235,428**.
- Runtime cost probe (`node --expose-gc`, decode all baked frames in isolation): **JSON parse ~20.45ms avg (50x), full decode all frames ~58.71ms, heap delta after decode+gc ~0.15MB**. (Micro-probe; not a browser startup/profile substitute.)
- Duplicate-frame deduplication opportunity appears low (unique RLE 530/530); palette storage dominates serialized size.

## Investigation / decisions
- No image quality changes, no quantization, no alpha discard, no resize, no compressed-decoder dependency.
- Kept lossless format and plain-script bootstrap order. Did not change runtime encoding because dedup opportunity is limited and palette/JSON overhead is the main size driver; any format migration is a larger design change requiring review.
- No-DOM decode path preserved (base64/RLE decode in `js/sprites.js` unchanged in behavior).

## Risks / follow-up
- Full browser startup/heap and same-browser baseline comparison still needed in GR-09 for acceptance-grade performance evidence.
- If size becomes a blocker, evaluate lossless palette packing/binary container with explicit review; do not silently change art quality.
