// Minimal DOM stand-ins for the engine modules that touch `HTMLElement` or
// `Image` at construction time (the sprite stack: sprite-canvas →
// sprite-resource → animator). Node provides neither, so every test that
// instantiates a sprite-backed object installs these first.
//
// `width`/`height` become `naturalWidth`/`naturalHeight`, which the sprite
// stack reads to size a frame that fits its image. Omit them when the test
// does not exercise rendering — the engine then computes a NaN size, which is
// the same thing it does for a not-yet-decoded image in the browser.
//
// Each test file runs in its own process, so these globals never leak.
export function installDomStubs({ width, height = width } = {}) {
  globalThis.HTMLElement = class HTMLElement {}
  globalThis.Image = class Image {
    constructor() {
      if (width) {
        this.naturalWidth = width
        this.naturalHeight = height
      }
    }
    set src(value) { this._src = value }
    get src() { return this._src }
  }
}
