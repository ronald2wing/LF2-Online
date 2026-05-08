// soundpack.js — sound spriting and effects management

import Feffects from "engine/core/effects-pool"

const basic_support = !!(document.createElement('audio').canPlayType)

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
    if (!config || !basic_support) {
      return { play() {}, TU() {}, dummy: true }
    }
    this.packs = {}
    this.buffer = {}
    this.time = 0
    for (let i = 0; i < config.packs.length; i++) {
      this.packs[config.packs[i].id] = new Feffects({
        circular: false,
        init_size: 5,
        batch_size: 5,
        max_size: 15,
        construct: () => new SoundSprite(config.packs[i].data, config.resourcemap)
      })
    }
  }

  play(path) {
    if (!path || this.buffer[path]) return
    this.buffer[path] = true
    let I, id
    if (path.charAt(1) === '/') {
      I = path.charAt(0)
      id = path.slice(2)
    } else {
      const str = path.split('/')
      I = str[0]
      id = str[1]
    }
    if (this.packs[I]) this.packs[I].create(id)
  }

  TU() {
    this.time++
    if (this.time % 5 === 0) {
      for (const I in this.buffer) this.buffer[I] = null
    }
  }
}
