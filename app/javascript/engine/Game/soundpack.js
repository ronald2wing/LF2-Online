// soundpack.js — sound spriting and effects management

import Feffects from "engine/core/effects-pool"

const basicSupport = !!(document.createElement('audio').canPlayType)

const MIME = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  aac: 'audio/aac'
}

class SoundSprite {
  constructor(data, resourcemap) {
    const audio = this.audio = document.createElement('audio')
    this.frame = data && data.sound
    audio.preload = 'auto'
    const ext = data && data.ext
    if (Array.isArray(ext)) {
      for (let i = 0; i < ext.length; i++) {
        const source = document.createElement('source')
        let src = data.file + '.' + ext[i]
        if (resourcemap) src = resourcemap.get(src)
        source.src = src
        if (MIME[ext[i]]) source.type = MIME[ext[i]]
        audio.appendChild(source)
      }
    }
    audio.addEventListener('timeupdate', () => this._timeupdate(), true)
    this.die()
  }

  born(id) {
    if (id && this.frame && this.frame[id]) {
      this.current = this.frame[id]
      if (this.audio.readyState >= 4) {
        // Seek to the sound's start and play. The browser seeks asynchronously;
        // _timeupdate only kills the sprite once it passes the sound's end, so
        // the brief seek window (currentTime below start) doesn't kill it.
        this.audio.currentTime = this.current.start
        this.audio.play()
        this.dead = false
        return
      }
    }
    this.parent.die(this)
  }

  die() { this.dead = true }

  _timeupdate() {
    if (this.current) {
      if (this.audio.currentTime > this.current.end) {
        this.audio.pause()
        if (!this.dead) this.parent.die(this)
      }
    }
  }
}

export default class SoundManager {
  constructor(config) {
    if (!config || !basicSupport) {
      return { play() {}, TU() {}, setVolume() {}, volume: 1, dummy: true }
    }
    this.packs = {}
    this.buffer = {}
    this.time = 0
    this._volume = 1
    // Sprites are pooled and reused, so track every constructed sprite here to
    // reach live *and* dormant ones when the volume changes.
    this.sprites = []
    for (let i = 0; i < config.packs.length; i++) {
      this.packs[config.packs[i].id] = new Feffects({
        circular: false,
        init_size: 5,
        batch_size: 5,
        max_size: 15,
        construct: () => {
          const sprite = new SoundSprite(config.packs[i].data, config.resourcemap)
          this.sprites.push(sprite)
          // Apply the current volume up front so sprites created later (pool
          // batch-expansion) never start at the browser default.
          sprite.audio.volume = this._volume
          return sprite
        }
      })
    }
  }

  get volume() {
    return this._volume
  }

  set volume(v) {
    this.setVolume(v)
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v))
    for (let i = 0; i < this.sprites.length; i++) {
      this.sprites[i].audio.volume = this._volume
    }
  }

  play(path) {
    if (!path || this.buffer[path]) return
    this.buffer[path] = true
    const [packId, id] = path.split('/')
    if (this.packs[packId]) this.packs[packId].create(id)
  }

  TU() {
    this.time++
    if (this.time % 5 === 0) {
      for (const key in this.buffer) this.buffer[key] = null
    }
  }
}
