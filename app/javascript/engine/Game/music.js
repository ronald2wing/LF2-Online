// music.js — background music channel.
//
// A single dedicated <audio> element loops the current track. The existing
// Soundpack is a fixed-offset sound-sprite (short SFX that dies at `end`), so
// it cannot loop a 2-3 minute track — hence this separate channel.

import { resolveAsset } from "engine/asset-registry"

// Survival music schedule — verbatim `music:` values from the decoded original
// stage.dat. Wave numbers are 0-based and index Match#stage_wave (the
// survival.js "Stage N" waves). Each entry switches the track for that wave and
// every later wave until the next entry.
const SURVIVAL_TRACKS = [
  [0, 'stage4'],
  [7, 'boss1'],
  [10, 'boss2'],
  [11, 'stage4'],
  [17, 'boss1'],
  [20, 'boss2'],
  [21, 'stage4'],
  [28, 'boss1'],
  [30, 'boss2'],
  [31, 'stage4'],
  [39, 'boss1'],
  [40, 'boss2'],
  [41, 'stage4'],
  [50, 'boss2'],
  [51, 'stage4'],
  [58, 'boss1'],
  [60, 'boss2'],
  [61, 'stage4'],
  [69, 'boss1'],
  [70, 'boss2'],
  [71, 'stage4'],
  [80, 'boss2'],
  [81, 'stage4'],
  [82, 'boss1'],
  [85, 'boss2'],
  [90, 'stage4'],
  [92, 'boss1'],
  [94, 'boss2'],
]

// Track for a survival wave: the last schedule entry at or before `wave`.
// Waves before the first entry start on stage4.
export function survivalTrack(wave) {
  let track = 'stage4'
  for (let i = 0; i < SURVIVAL_TRACKS.length; i++) {
    if (wave >= SURVIVAL_TRACKS[i][0]) track = SURVIVAL_TRACKS[i][1]
    else break
  }
  return track
}

// Music selector — the original LF2 lets the player pick the background track
// in the control settings, navigated with Left/Right. The options, in the
// original's order, map display names to `bgm/<track>.mp3` keys. `Random`
// picks one of the eight concrete tracks per match. The stored setting is an
// index into this list, or `undefined` when the player hasn't chosen (then
// each stage keeps its own track).
export const MUSIC_OPTIONS = [
  { name: 'Final Boss', track: 'boss2' },
  { name: 'Boss', track: 'boss1' },
  { name: 'Stage 5', track: 'stage5' },
  { name: 'Stage 4', track: 'stage4' },
  { name: 'Stage 3', track: 'stage3' },
  { name: 'Stage 2', track: 'stage2' },
  { name: 'Stage 1', track: 'stage1' },
  { name: 'Main Theme', track: 'main' },
  { name: 'Random', track: null }
]

// The eight concrete tracks, used by `Random`.
const MUSIC_TRACKS = MUSIC_OPTIONS.filter(o => o.track)

// Display name for a stored choice (a MUSIC_OPTIONS index, or undefined/null
// for "not chosen" — follow each stage's own track).
export function musicOptionName(choice) {
  if (choice === undefined || choice === null) return 'Default'
  const option = MUSIC_OPTIONS[choice]
  return option ? option.name : 'Default'
}

// Resolve the track a match should start on. `choice` is the stored music
// setting (a MUSIC_OPTIONS index, or undefined). Returns null to keep the
// per-stage / per-wave default wiring, or a concrete track key (a specific
// pick, or a per-match `Random` pick). `random` is a non-simulation RNG
// (Math.random), so the pick never touches the lockstep seed and cannot
// desync networked peers.
export function matchMusicOverride(choice, random) {
  const option = MUSIC_OPTIONS[choice]
  if (!option) return null
  if (option.track) return option.track
  return MUSIC_TRACKS[Math.floor(random() * MUSIC_TRACKS.length)].track
}

export default class Music {
  constructor() {
    this._audio = null     // the <audio> element; undefined = audio unavailable
    this._loaded = null    // track currently loaded into the element
    this._pending = null   // track awaiting a user gesture (autoplay policy)
    this._gestureBound = null
    this._volume = 1 // shared master volume — F11/F12 drive SFX and music together
  }

  // Play `track`, looping until stop() or the next play(). No-op when audio is
  // unavailable. Autoplay-blocked starts are retried on the first user gesture.
  play(track) {
    if (!track) return
    this._pending = track
    const audio = this._ensureAudio()
    if (!audio) return
    if (track !== this._loaded) {
      this._loaded = track
      audio.src = resolveAsset(`bgm/${track}.mp3`)
      audio.load()
    }
    audio.volume = this._volume
    this._start()
  }

  stop() {
    this._pending = null
    this._loaded = null
    if (this._audio) {
      this._audio.pause()
      this._audio.removeAttribute('src')
      try { this._audio.load() } catch (e) { /* removing src may throw in some engines */ }
    }
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v))
    if (this._audio) this._audio.volume = this._volume
  }

  _start() {
    const audio = this._audio
    if (!audio) return
    const p = audio.play()
    // Older engines return undefined from play(); modern ones return a promise
    // that rejects (NotAllowedError) when autoplay is blocked.
    if (p && typeof p.catch === 'function') {
      p.catch(() => this._waitForGesture())
    }
  }

  _waitForGesture() {
    if (this._gestureBound) return
    const events = ['keydown', 'pointerdown', 'click', 'touchend']
    const onGesture = () => {
      for (const ev of events) window.removeEventListener(ev, onGesture, true)
      this._gestureBound = null
      if (this._pending) this._start()
    }
    this._gestureBound = onGesture
    for (const ev of events) window.addEventListener(ev, onGesture, true)
  }

  _ensureAudio() {
    if (this._audio === undefined) return null // already determined unavailable
    if (this._audio) return this._audio        // already created
    if (typeof document === 'undefined') { this._audio = undefined; return null }
    const probe = document.createElement('audio')
    if (!probe.canPlayType) { this._audio = undefined; return null }
    const audio = document.createElement('audio')
    audio.loop = true
    audio.preload = 'auto'
    // A missing/corrupt track fires `error` on the element without throwing;
    // pause and forget so a later play() can recover cleanly.
    audio.addEventListener('error', () => { audio.pause() }, false)
    this._audio = audio
    return audio
  }
}
