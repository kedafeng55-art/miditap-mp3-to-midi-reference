# Miditap Audio-to-MIDI Test Data

This repository collects small, machine-readable observations from browser-based audio-to-MIDI tests. The data is intended for format comparisons, reproducibility checks, and realistic expectations about note-transcription output.

The full test narratives and browser converter are available on [Miditap's audio-to-MIDI test page](https://miditap.com/audio-to-midi/).

## Data files

| Path | Contents | Use |
| --- | --- | --- |
| `data/audio-format-observations.csv` | OGG, M4A/AAC, FLAC, AIFF, and AIF results | Compare observed browser decoding and MIDI output across tested encodings |
| `data/guitar-transcription-observations.csv` | Single-note and chord acoustic-guitar results | Compare intended material, detected event counts, output duration, matches, and cleanup notes |
| `docs/browser-codec-notes.md` | Scope and interpretation notes | Avoid treating a tested extension as a universal codec-support claim |
| `data/two-note-observation.csv` | Earlier controlled two-note MP3 observation | Inspect note names, starts, and durations from the original fixture |
| `data/supported-input-extensions.csv` | Extensions accepted by the browser UI | Read the UI input list in machine-readable form |
| `docs/midi-cleanup-checklist.md` | Ordered review checklist | Review a draft transcription before further editing |
| `tools/validate_midi.py` | Dependency-free Standard MIDI File validator | Check the structure of a `.mid` file |
| `fixtures/two-notes.mp3` | Synthetic source for the earlier observation | Reproduce the original input |
| `fixtures/two-notes.mid` | MIDI output for the earlier observation | Exercise the validator and inspect the output |

## What the new observations show

- The tested 4.003-second Ogg/Vorbis guitar file completed with one MIDI track and 33 detected events.
- The M4A/AAC and FLAC versions of the 4.8-second controlled fixture both produced E4, G4, B4, and E5 at starts of 0.244s, 1.300s, 2.277s, and 3.426s; each MIDI was 118 bytes.
- The same 4.000-second PCM AIFF guitar recording completed as both `.aiff` and `.aif`; each MIDI contained 29 detected events.
- The 4.000-second separated-note guitar input produced 30 events over 3.936 seconds.
- The 9.366-second four-chord guitar input produced 40 events over 8.922 seconds.

These are observations from specific files in the stated browser environment. They are not accuracy rates and do not predict results for other recordings, codecs, browsers, instruments, rooms, microphones, or effects chains.

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

## Reuse

The text, tables, code, and synthetic fixtures in this repository are released under CC0-1.0.

## Provenance

The format observations are transcribed from the dated Miditap browser tests published on October 30, 2026. The guitar observations are transcribed from the two real acoustic-guitar tests published on November 3, 2026. Values are reported observations from those specific runs, not estimates.
