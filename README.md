# MP3-to-MIDI Reference Data and Validator

Small, reproducible resources for inspecting an MP3-to-MIDI transcription workflow:

- a CSV record of a controlled two-note conversion;
- a machine-readable input-format list;
- a practical MIDI cleanup checklist; and
- a dependency-free Standard MIDI File structure validator.

The controlled result comes from a synthetic MP3 containing A4 followed by C5. The generated MIDI contained those two pitches in that order. This fixture is deliberately narrow: it does **not** establish an accuracy rate for songs, polyphonic mixes, drums, noisy recordings, or other converters.

The browser converter and the full test-method narrative are available at [Miditap](https://miditap.com/guides/mp3-to-midi-converter.html).

## Repository layout

| Path | Purpose |
| --- | --- |
| `data/two-note-observation.csv` | Observed note numbers, names, starts, and durations |
| `data/supported-input-extensions.csv` | Extensions accepted by the referenced browser UI |
| `docs/midi-cleanup-checklist.md` | Ordered review checklist for a draft transcription |
| `tools/validate_midi.py` | Structural validator for `.mid` files |
| `fixtures/two-notes.mp3` | Synthetic two-note source used for the observation |
| `fixtures/two-notes.mid` | Generated MIDI output used for the observation |

## Validate a MIDI file

Python 3 is the only requirement.

```bash
python tools/validate_midi.py fixtures/two-notes.mid
```

Expected output for the checked-in fixture:

```text
valid SMF: format=1, tracks=2, division=480, bytes=83, end_markers=2
```

The validator checks the `MThd` signature, six-byte header, declared track count, track chunk boundaries, positive time division, and one end-of-track marker in each track. It is a structural check, not a musical-accuracy score.

## Reusing the data

The text, tables, and code in this repository are released under CC0-1.0. The fixture audio and MIDI are synthetic and included under the same dedication.

## Provenance

The observation was recorded on 2026-10-29 from Miditap's checked-in synthetic fixture. Note inspection used `@tonejs/midi`; the binary structure was checked with the validator in this repository. Values in the CSV are observations from that specific run, not estimates.

