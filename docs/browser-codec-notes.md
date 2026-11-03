# Browser decoding and codec scope

An extension names a container or common file type; it does not by itself guarantee which codec is inside the file. Browser decoding therefore has to be tested with a specific file, codec, browser build, and operating environment.

The format rows in this repository report files that were selected in the tested Chrome build and completed with a downloadable MIDI result. They do not claim support for every file sharing the same extension or for every browser.

For a controlled comparison, keep the performance, trim points, loudness, and converter build fixed. Change only the encoding, then compare detected pitches, extra short notes, missed notes, start times, durations, event counts, and MIDI byte size where those values were recorded.

The observations here are transcription results, not a lossless conversion benchmark or a general accuracy score.
