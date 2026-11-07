# Miditap site source

This branch stores the buildable static source for Miditap's MP3-to-MIDI browser tool.

## Tool page

- Route: `/mp3-to-midi/`
- Processing: browser-local audio decoding, note inference, MIDI writing, piano-roll preview, MIDI download, and note-list copy
- Tested inputs in the current Chrome fixture run: MP3, WAV, FLAC, OGG, M4A, AAC, MP4, and WebM
- No batch upload, login, or history

## Build

```bash
npm install
npm run build
npm run serve
```

Open `http://127.0.0.1:4173/mp3-to-midi/`.

The package installs the bundled transcription model during dependency installation. The generated `dist/` directory is not committed here.
