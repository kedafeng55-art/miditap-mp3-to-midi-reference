import { BasicPitch as TranscriptionModel, addPitchBendsToNoteEvents, noteFramesToTime, outputToNotesPoly } from "note-model";
import { Midi } from "@tonejs/midi";
import { Mp3Encoder } from "@breezystack/lamejs";

const MAX_SECONDS = 600;
const AUDIO_EXTS = new Set(["mp3", "wav", "m4a", "aac", "flac", "aiff", "aif", "ogg", "oga", "opus", "webm", "mp4", "m4v", "mov", "mkv"]);
const PRESETS = {
  mp3: { accept: ".mp3,audio/mpeg", exts: new Set(["mp3"]), title: "Drop one MP3 file", sub: "or click to choose · up to 10 minutes", formats: "MP3 INPUT · LOCAL NOTE DETECTION · MIDI DOWNLOAD" },
  "mp3-to-midi": { accept: ".mp3,.wav,.flac,.ogg,.m4a,.aac,.mp4,.webm,audio/mpeg,audio/wav,audio/flac,audio/ogg,audio/mp4,audio/aac,video/mp4,video/webm", exts: new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac", "mp4", "webm"]), title: "Drop one audio file", sub: "or click to choose · up to 10 minutes", formats: "MP3 · WAV · FLAC · OGG · M4A · AAC · MP4 · WEBM" },
  "core-audio": { accept: ".mp3,.wav,.flac,.ogg,.m4a,audio/mpeg,audio/wav,audio/flac,audio/ogg,audio/mp4", exts: new Set(["mp3", "wav", "flac", "ogg", "m4a"]), title: "Drop one audio file", sub: "or click to choose · up to 10 minutes", formats: "MP3 · WAV · FLAC · OGG · M4A" },
  audio: { accept: ".mp3,.wav,.m4a,.aac,.flac,.aiff,.aif,.ogg,.oga,.opus,.webm,audio/*", exts: new Set(["mp3", "wav", "m4a", "aac", "flac", "aiff", "aif", "ogg", "oga", "opus", "webm"]), title: "Drop one audio file", sub: "or click to choose · up to 10 minutes", formats: "MP3 · WAV · FLAC · OGG · M4A · AAC · AIFF · OPUS" },
  guitar: { accept: ".mp3,.wav,.m4a,.aac,.flac,.aiff,.aif,.ogg,.oga,.opus,.webm,.mp4,.m4v,.mov,.mkv,audio/*,video/mp4,video/quicktime,video/webm", exts: new Set(["mp3", "wav", "m4a", "aac", "flac", "aiff", "aif", "ogg", "oga", "opus", "webm", "mp4", "m4v", "mov", "mkv"]), title: "Drop one guitar recording", sub: "or click to choose · one file up to 10 minutes", formats: "MP3 · WAV · FLAC · OGG · M4A · AIFF · WEBM · MP4 + MORE" },
  wav: { accept: ".wav,audio/wav,audio/x-wav", exts: new Set(["wav"]), title: "Drop one WAV file", sub: "or click to choose · PCM or browser-decodable WAV", formats: "WAV INPUT · LOCAL NOTE DETECTION · MIDI DOWNLOAD" },
  voice: { accept: ".wav,.mp3,.m4a,.ogg,.oga,.opus,.webm,audio/*", exts: new Set(["wav", "mp3", "m4a", "ogg", "oga", "opus", "webm"]), title: "Choose a voice recording", sub: "or record a new sung or hummed line below", formats: "VOICE OR HUM · ONE CLEAR MELODY · MIDI DOWNLOAD" },
  mp4: { accept: ".mp4,video/mp4", exts: new Set(["mp4"]), title: "Drop one MP4 video", sub: "or click to choose · its audio track is transcribed", formats: "MP4 INPUT · AUDIO TRACK ONLY · MIDI DOWNLOAD" }
};

let model = null;

function extOf(name) { return name.split(".").pop().toLowerCase(); }
function baseName(name) { return name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9 _-]/gi, "_") || "converted"; }
function formatTime(seconds) { const m = Math.floor(seconds / 60), s = Math.round(seconds % 60); return `${m}:${String(s).padStart(2, "0")}`; }
function midiName(value) { const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"]; return `${names[value % 12]}${Math.floor(value / 12) - 1}`; }

function componentMarkup(preset, reverse) {
  if (reverse) return `
    <div class="converter-card shared-converter reverse-tool">
      <div class="tone-control"><label for="sharedTone">Choose the output tone</label><select id="sharedTone"><option value="triangle" selected>Warm triangle</option><option value="sine">Soft sine</option><option value="square">Bright square</option><option value="sawtooth">Buzz saw</option></select></div>
      <input id="sharedFileInput" class="visually-hidden" type="file" accept=".mid,.midi,audio/midi,audio/x-midi">
      <label class="drop-zone" id="sharedDropZone" for="sharedFileInput" tabindex="0"><span class="drop-icon" aria-hidden="true"><span></span><span></span><span></span></span><span class="drop-title">Drop one MIDI file</span><span class="drop-sub">or click to choose · .mid and .midi</span><span class="format-line">LOCAL PARSING · SELECTABLE SYNTH · MP3 DOWNLOAD</span></label>
      <div class="reverse-file-summary" id="sharedSummary" hidden aria-label="Parsed MIDI summary"></div>
      <div class="status" id="sharedStatus" hidden aria-live="polite"><div class="status-top"><span id="sharedStatusLabel">Reading MIDI events…</span><span class="tabular" id="sharedStatusPercent"></span></div><p id="sharedStatusDetail">The file stays in this tab.</p></div>
      <div class="result" id="sharedResult" hidden aria-live="polite"><div class="result-head"><div class="result-copy"><span class="result-kicker">MP3 READY</span><strong id="sharedResultName">rendered-midi.mp3</strong><span id="sharedResultMeta">Rendered locally</span></div><a class="download-button" id="sharedDownload" download>Download MP3 <span aria-hidden="true">↓</span></a></div></div>
      <div class="error" id="sharedError" hidden role="alert"><strong id="sharedErrorTitle">Could not render this MIDI.</strong><span id="sharedErrorDetail"></span></div>
      <div class="trust-row"><span>No upload</span><span>No account</span><span>One file at a time</span></div>
    </div>`;

  const recorder = preset === "voice" ? `<div class="recorder-panel"><button type="button" class="record-button" id="sharedRecordButton"><span class="record-dot" aria-hidden="true"></span><span id="sharedRecordLabel">Start recording</span></button><button type="button" class="stop-button" id="sharedStopButton" disabled>Stop and convert</button><span id="sharedRecordTime" aria-live="polite">Microphone is off</span></div><div class="input-divider"><span>or use a saved recording</span></div>` : "";
  const copyAction = preset === "mp3-to-midi" ? `<button class="copy-button" id="sharedCopy" type="button">Copy note list</button>` : "";
  const p = PRESETS[preset] || PRESETS.audio;
  return `
    <div class="converter-card shared-converter">
      ${recorder}
      <input id="sharedFileInput" class="visually-hidden" type="file" accept="${p.accept}">
      <label class="drop-zone" id="sharedDropZone" for="sharedFileInput" tabindex="0"><span class="drop-icon" aria-hidden="true"><span></span><span></span><span></span></span><span class="drop-title">${p.title}</span><span class="drop-sub">${p.sub}</span><span class="format-line">${p.formats}</span></label>
      <div class="status" id="sharedStatus" hidden aria-live="polite"><div class="status-top"><span id="sharedStatusLabel">Preparing…</span><span class="tabular" id="sharedStatusPercent">0%</span></div><div class="progress-track"><div class="progress-fill" id="sharedProgress"></div></div><p id="sharedStatusDetail">The first conversion loads the local note model.</p></div>
      <div class="result" id="sharedResult" hidden aria-live="polite"><div class="result-head"><div class="result-copy"><span class="result-kicker">MIDI READY</span><strong id="sharedResultName">track.mid</strong><span id="sharedResultMeta">Standard MIDI file</span></div><div class="result-actions"><a class="download-button" id="sharedDownload" download>Download .mid <span aria-hidden="true">↓</span></a>${copyAction}</div></div><div class="track-panel"><div class="track-label"><span class="track-dot" aria-hidden="true"></span><div><strong id="sharedTrackName">Track 1</strong><span id="sharedTrackMeta">Detected notes</span></div></div><div class="piano-roll" id="sharedPianoRoll" aria-label="Detected note timeline"></div></div></div>
      <div class="error" id="sharedError" hidden role="alert"><strong id="sharedErrorTitle">Could not convert this file.</strong><span id="sharedErrorDetail"></span></div>
      <div class="trust-row"><span>No upload</span><span>No account</span><span>One file at a time</span></div>
    </div>`;
}

function setup(host) {
  const presetName = host.dataset.preset || "audio";
  const reverse = presetName === "midi-to-mp3";
  host.innerHTML = componentMarkup(presetName, reverse);
  const get = (id) => host.querySelector(`#${id}`);
  const dom = { input: get("sharedFileInput"), drop: get("sharedDropZone"), status: get("sharedStatus"), statusLabel: get("sharedStatusLabel"), statusPercent: get("sharedStatusPercent"), statusDetail: get("sharedStatusDetail"), progress: get("sharedProgress"), result: get("sharedResult"), resultName: get("sharedResultName"), resultMeta: get("sharedResultMeta"), download: get("sharedDownload"), copy: get("sharedCopy"), error: get("sharedError"), errorTitle: get("sharedErrorTitle"), errorDetail: get("sharedErrorDetail"), summary: get("sharedSummary"), tone: get("sharedTone"), trackName: get("sharedTrackName"), trackMeta: get("sharedTrackMeta"), pianoRoll: get("sharedPianoRoll") };
  let currentUrl = null;
  let currentNoteList = "";

  function reset() {
    dom.status.hidden = true; dom.result.hidden = true; dom.error.hidden = true;
    if (dom.summary) dom.summary.hidden = true;
    if (dom.progress) dom.progress.style.width = "0%";
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = null; currentNoteList = "";
  }
  function fail(title, detail = "") { dom.status.hidden = true; dom.result.hidden = true; dom.error.hidden = false; dom.errorTitle.textContent = title; dom.errorDetail.textContent = detail; }
  function progress(label, percent, detail) { dom.error.hidden = true; dom.result.hidden = true; dom.status.hidden = false; dom.statusLabel.textContent = label; if (dom.statusPercent) dom.statusPercent.textContent = Number.isFinite(percent) ? `${Math.round(percent)}%` : ""; if (dom.progress) dom.progress.style.width = `${Math.max(2, percent || 2)}%`; dom.statusDetail.textContent = detail; }
  function finish(blob, filename, meta, events = null) {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(blob); dom.download.href = currentUrl; dom.download.download = filename; dom.resultName.textContent = filename; dom.resultMeta.textContent = meta;
    if (events) {
      renderTrack(dom, events, baseName(filename));
      currentNoteList = ["Note\tStart (s)\tDuration (s)\tVelocity", ...events.map((note) => `${midiName(note.pitchMidi ?? note.pitch_midi)}\t${note.startTimeSeconds.toFixed(3)}\t${note.durationSeconds.toFixed(3)}\t${Math.round(Math.max(0, Math.min(1, note.amplitude)) * 127)}`)].join("\n");
    }
    dom.status.hidden = true; dom.error.hidden = true; dom.result.hidden = false;
  }

  async function handle(file) {
    reset(); dom.input.value = "";
    if (!file) return;
    if (reverse) await midiToMp3(file, dom, finish, fail, progress);
    else await audioToMidi(file, PRESETS[presetName] || PRESETS.audio, dom, finish, fail, progress);
  }

  dom.input.addEventListener("change", (event) => handle(event.target.files[0]));
  dom.drop.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); dom.input.click(); } });
  ["dragenter", "dragover"].forEach((type) => dom.drop.addEventListener(type, (event) => { event.preventDefault(); dom.drop.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((type) => dom.drop.addEventListener(type, (event) => { event.preventDefault(); dom.drop.classList.remove("dragging"); }));
  dom.drop.addEventListener("drop", (event) => handle(event.dataTransfer.files[0]));
  dom.download.addEventListener("click", () => { const original = dom.download.innerHTML; dom.download.textContent = "Downloaded ✓"; setTimeout(() => { dom.download.innerHTML = original; }, 1400); });
  if (dom.copy) dom.copy.addEventListener("click", async () => {
    if (!currentNoteList) return;
    const original = dom.copy.textContent;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(currentNoteList);
      else {
        const area = document.createElement("textarea"); area.value = currentNoteList; area.style.position = "fixed"; area.style.opacity = "0"; document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
      }
      dom.copy.textContent = "Copied ✓";
    } catch { dom.copy.textContent = "Copy failed"; }
    setTimeout(() => { dom.copy.textContent = original; }, 1400);
  });
  if (presetName === "voice") setupRecorder(host, handle, fail);
}

async function decodeAudio(file) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const bytes = await file.arrayBuffer();
  try { return await ctx.decodeAudioData(bytes.slice(0)); }
  catch (error) { if (["aif", "aiff"].includes(extOf(file.name))) return decodePcmAiff(bytes, ctx); throw error; }
  finally { await ctx.close(); }
}

function decodePcmAiff(bytes, ctx) {
  const view = new DataView(bytes), text = (at, n) => String.fromCharCode(...new Uint8Array(bytes, at, n));
  if (text(0, 4) !== "FORM" || text(8, 4) !== "AIFF") throw new Error("Unsupported AIFF container");
  let at = 12, channels = 0, frames = 0, bits = 0, rate = 0, soundAt = 0;
  while (at + 8 <= view.byteLength) { const id = text(at, 4), size = view.getUint32(at + 4, false), start = at + 8; if (id === "COMM") { channels = view.getUint16(start, false); frames = view.getUint32(start + 2, false); bits = view.getUint16(start + 6, false); rate = readExtended80(view, start + 8); } if (id === "SSND") soundAt = start + 8 + view.getUint32(start, false); at = start + size + (size % 2); }
  if (!channels || !frames || !rate || !soundAt || ![8, 16, 24, 32].includes(bits)) throw new Error("Unsupported AIFF encoding");
  const audio = ctx.createBuffer(channels, frames, Math.round(rate)), step = bits / 8, frameStep = step * channels;
  for (let ch = 0; ch < channels; ch += 1) { const out = audio.getChannelData(ch); for (let i = 0; i < frames; i += 1) { const p = soundAt + i * frameStep + ch * step; if (p + step > view.byteLength) break; let sample; if (bits === 8) sample = view.getInt8(p) / 128; else if (bits === 16) sample = view.getInt16(p, false) / 32768; else if (bits === 24) { let v = (view.getUint8(p) << 16) | (view.getUint8(p + 1) << 8) | view.getUint8(p + 2); if (v & 0x800000) v |= 0xff000000; sample = v / 8388608; } else sample = view.getInt32(p, false) / 2147483648; out[i] = sample; } }
  return audio;
}
function readExtended80(view, at) { const exponent = view.getUint16(at, false), hi = view.getUint32(at + 2, false), lo = view.getUint32(at + 6, false); if (exponent === 0 && hi === 0 && lo === 0) return 0; const sign = exponent & 0x8000 ? -1 : 1, exp = (exponent & 0x7fff) - 16383; return sign * (hi * 2 ** (exp - 31) + lo * 2 ** (exp - 63)); }
async function prepareForModel(audio) { const sampleRate = 22050; const ctx = new OfflineAudioContext(1, Math.ceil(audio.duration * sampleRate), sampleRate); const source = ctx.createBufferSource(); source.buffer = audio; source.connect(ctx.destination); source.start(); return ctx.startRendering(); }

async function audioToMidi(file, preset, dom, finish, fail, progress) {
  if (!preset.exts.has(extOf(file.name)) || !AUDIO_EXTS.has(extOf(file.name))) return fail("That file does not match this page.", `Choose ${preset.title.toLowerCase().replace("drop one ", "a ")}.`);
  progress("Decoding in this tab", 4, "No audio is being uploaded.");
  let audio;
  try { audio = await decodeAudio(file); } catch { return fail("This browser could not decode the audio.", "The container opened, but its audio codec is not supported here. Try a browser-decodable MP3 or WAV source."); }
  if (audio.duration > MAX_SECONDS) return fail("The recording is longer than 10 minutes.", `This file is ${formatTime(audio.duration)}. Trim it to 10:00 or less.`);
  if (!audio.duration || !Number.isFinite(audio.duration)) return fail("The file has no readable audio.", "Choose a file with a decodable audio track.");
  progress("Loading note model", 8, "The model is bundled with this page and runs on this device.");
  try {
    const modelAudio = await prepareForModel(audio);
    model ||= new TranscriptionModel("/model/model.json");
    const frames = [], onsets = [], contours = [];
    await model.evaluateModel(modelAudio, (f, o, c) => { frames.push(...f); onsets.push(...o); contours.push(...c); }, (p) => progress("Finding notes", 10 + p * 84, "Longer recordings and phones can take more time."));
    const events = noteFramesToTime(addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets, .5, .3, 5)));
    if (!events.length) return fail("No stable pitched notes were found.", "Try a clearer solo instrument or a sung or hummed line. Drums and spoken audio do not make useful pitched MIDI.");
    progress("Writing MIDI", 97, `${events.length.toLocaleString()} note events detected.`);
    const midi = new Midi(); midi.header.setTempo(120); const track = midi.addTrack(); track.name = baseName(file.name);
    for (const n of events) track.addNote({ midi: n.pitchMidi ?? n.pitch_midi, time: n.startTimeSeconds, duration: Math.max(.02, n.durationSeconds), velocity: Math.max(.05, Math.min(1, n.amplitude)) });
    finish(new Blob([midi.toArray()], { type: "audio/midi" }), `${baseName(file.name)}.mid`, `1 track · ${events.length.toLocaleString()} notes · ${formatTime(audio.duration)} source`, events);
  } catch (error) { console.error(error); fail("Conversion stopped before a MIDI file was made.", "This device may have run out of memory or could not run the note model. Try a shorter file in a current browser."); }
}

function renderTrack(dom, events, name) {
  dom.trackName.textContent = name; const pitches = events.map((note) => note.pitchMidi ?? note.pitch_midi); const low = Math.min(...pitches), high = Math.max(...pitches); dom.trackMeta.textContent = `${events.length.toLocaleString()} notes · ${midiName(low)}–${midiName(high)}`; dom.pianoRoll.replaceChildren(); const end = Math.max(...events.map((note) => note.startTimeSeconds + note.durationSeconds), .1); const span = Math.max(1, high - low + 1);
  for (const note of events.slice(0, 500)) { const pitch = note.pitchMidi ?? note.pitch_midi; const bar = document.createElement("i"); bar.style.left = `${(note.startTimeSeconds / end) * 100}%`; bar.style.width = `${Math.max(.45, (note.durationSeconds / end) * 100)}%`; bar.style.bottom = `${((pitch - low) / span) * 84 + 8}%`; bar.title = `${midiName(pitch)} · ${note.startTimeSeconds.toFixed(2)}s`; dom.pianoRoll.append(bar); }
}

function setupRecorder(host, handle, fail) {
  const start = host.querySelector("#sharedRecordButton"), stop = host.querySelector("#sharedStopButton"), label = host.querySelector("#sharedRecordLabel"), time = host.querySelector("#sharedRecordTime");
  let recorder = null, stream = null, chunks = [], timer = null, startedAt = 0;
  start.addEventListener("click", async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks = []; recorder = new MediaRecorder(stream); recorder.addEventListener("dataavailable", (event) => { if (event.data.size) chunks.push(event.data); }); recorder.addEventListener("stop", () => { clearInterval(timer); stream.getTracks().forEach((track) => track.stop()); start.disabled = false; stop.disabled = true; label.textContent = "Start another recording"; time.textContent = "Recording captured; converting now"; const type = recorder.mimeType || "audio/webm"; const ext = type.includes("ogg") ? "ogg" : "webm"; handle(new File(chunks, `voice-recording.${ext}`, { type })); }); recorder.start(); startedAt = Date.now(); start.disabled = true; stop.disabled = false; label.textContent = "Recording…"; time.textContent = "0:00 recorded"; timer = setInterval(() => { time.textContent = `${formatTime((Date.now() - startedAt) / 1000)} recorded`; }, 500);
    } catch (error) { console.error(error); fail("Microphone access did not start.", "Allow microphone access, or choose a saved voice recording below."); }
  });
  stop.addEventListener("click", () => { if (recorder?.state === "recording") recorder.stop(); });
}

function toPcm16(float32) { const pcm = new Int16Array(float32.length); for (let i = 0; i < float32.length; i += 1) { const value = Math.max(-1, Math.min(1, float32[i])); pcm[i] = value < 0 ? Math.round(value * 32768) : Math.round(value * 32767); } return pcm; }
async function midiToMp3(file, dom, finish, fail, progress) {
  if (!/\.(mid|midi)$/i.test(file.name)) return fail("Choose a Standard MIDI file.", "Use a .mid or .midi file.");
  progress("Reading MIDI events", NaN, "The file stays in this tab.");
  let midi;
  try { midi = new Midi(await file.arrayBuffer()); } catch { return fail("This file could not be parsed as Standard MIDI."); }
  const notes = midi.tracks.flatMap((track) => track.notes); if (!notes.length) return fail("This MIDI file contains no note events to render."); if (midi.duration > MAX_SECONDS) return fail("This browser renderer accepts MIDI files up to 10 minutes.");
  const tone = dom.tone.value, sampleRate = 44100, renderedSeconds = midi.duration + .8; const offline = new OfflineAudioContext(1, Math.ceil(renderedSeconds * sampleRate), sampleRate); const master = offline.createGain(); master.gain.value = .72; master.connect(offline.destination);
  for (const note of notes) { const start = Math.max(0, Number.isFinite(note.time) ? note.time : 0), stop = Math.min(renderedSeconds - .05, start + Math.max(.03, Number.isFinite(note.duration) ? note.duration : .1)), velocity = Number.isFinite(note.velocity) ? note.velocity : .7, frequency = Number.isFinite(note.frequency) ? note.frequency : 440 * (2 ** ((note.midi - 69) / 12)); const oscillator = offline.createOscillator(), voice = offline.createGain(); oscillator.type = tone; oscillator.frequency.value = frequency; const level = .095 * Math.max(.15, velocity); voice.gain.setValueAtTime(.0001, start); voice.gain.exponentialRampToValueAtTime(level, Math.min(stop, start + .018)); voice.gain.setValueAtTime(level, Math.max(start + .018, stop - .08)); voice.gain.exponentialRampToValueAtTime(.0001, stop); oscillator.connect(voice).connect(master); oscillator.start(start); oscillator.stop(stop + .01); }
  dom.summary.hidden = false; dom.summary.innerHTML = `<div><span>Tracks</span><strong>${midi.tracks.length}</strong></div><div><span>Notes</span><strong>${notes.length}</strong></div><div><span>MIDI duration</span><strong>${midi.duration.toFixed(2)}s</strong></div><div><span>Selected tone</span><strong>${dom.tone.options[dom.tone.selectedIndex].text}</strong></div>`;
  progress("Rendering selected tone", NaN, "The synth and MP3 encoder are running in this tab."); const rendered = await offline.startRendering(), pcm = toPcm16(rendered.getChannelData(0)), encoder = new Mp3Encoder(1, sampleRate, 128), chunks = [];
  for (let offset = 0; offset < pcm.length; offset += 1152) { const encoded = encoder.encodeBuffer(pcm.subarray(offset, Math.min(pcm.length, offset + 1152))); if (encoded.length) chunks.push(new Uint8Array(encoded)); }
  const flushed = encoder.flush(); if (flushed.length) chunks.push(new Uint8Array(flushed)); const blob = new Blob(chunks, { type: "audio/mpeg" }); finish(blob, `${baseName(file.name)}.mp3`, `${notes.length} notes · ${renderedSeconds.toFixed(2)}s · ${dom.tone.options[dom.tone.selectedIndex].text}`);
}

document.querySelectorAll("[data-converter]").forEach(setup);
const year = document.getElementById("year"); if (year) year.textContent = new Date().getFullYear();

