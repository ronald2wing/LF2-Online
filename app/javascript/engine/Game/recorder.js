// Deterministic replay recording for LF2 Online.
//
// LF2 records gameplay as a stream of per-frame player inputs, not video: the
// engine is a deterministic lockstep simulation (fixed 30fps clock + seeded
// PRNG), so re-feeding the recorded inputs through the same seed reproduces the
// match exactly. This mirrors the original LF2 ".lfr" approach.
//
// A recording is a JSON object:
//   { version, seed, players, background, difficulty, mode, frames }
// where `frames` is one entry per match frame, each an array of 4 input masks
// (one per session.control[i]); a mask is a 7-bit flags word for the keys
// up/down/left/right/att/jump/def.

const INPUT_KEYS = ["up", "down", "left", "right", "att", "jump", "def"]

// Encode a controller state object ({ key: 0|1 }) into a 7-bit mask.
export function inputMask(state) {
  let mask = 0
  for (let i = 0; i < INPUT_KEYS.length; i++) {
    if (state && state[INPUT_KEYS[i]]) mask |= (1 << i)
  }
  return mask
}

// Decode a 7-bit mask back into a controller state object.
export function maskInput(mask) {
  const state = {}
  for (let i = 0; i < INPUT_KEYS.length; i++) {
    state[INPUT_KEYS[i]] = (mask >> i) & 1
  }
  return state
}

// Records a match by snapshotting session.control inputs every frame.
export class Recorder {
  constructor(meta) {
    this.meta = meta
    this.frames = []
  }

  // Called every frame (from match.onframe) with the session.control array.
  frame(control) {
    const masks = []
    for (let i = 0; i < control.length; i++) {
      masks.push(inputMask(control[i] && control[i].state))
    }
    this.frames.push(masks)
  }

  toJSON() {
    return { version: 1, ...this.meta, frames: this.frames }
  }
}

// A controller that replays recorded inputs instead of reading the keyboard.
// It replaces a human player's session.control[i] during playback; its fetch()
// (called once per frame by the match loop) injects that frame's recorded
// input into its children.
export class ReplayController {
  constructor(frames, controlIndex) {
    this.frames = frames
    this.controlIndex = controlIndex
    this.state = {}
    this.child = []
    this.config = {}
    this.frameIndex = 0
  }

  type = "replay"

  fetch() {
    const frame = this.frames[this.frameIndex]
    this.frameIndex++
    if (!frame) return
    const next = maskInput(frame[this.controlIndex])
    for (const key of INPUT_KEYS) {
      if (next[key] !== this.state[key]) {
        this.state[key] = next[key]
        for (const child of this.child) child.key(key, next[key])
      }
    }
  }

  key() { return 0 }
  clear_states() {}
  destroy() {}
}

// Download a recording as a JSON file.
export function downloadRecording(recording, filename) {
  const blob = new Blob([JSON.stringify(recording)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
