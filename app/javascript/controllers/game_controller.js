import { Controller } from "@hotwired/stimulus"

import util from "engine/Game/util"
import GameManager from "engine/Game/manager"
import { loadPack } from "engine/Game/loader"
import { setAssetRegistry, resetAssetRegistry } from "engine/asset-registry"

export default class extends Controller {
  static targets = ["canvas"]
  static values = {
    packRoot: { type: String, default: "engine/pack/" },
  }

  connect() {
    if (this.#started) return
    this.#started = true
    this.#boot()
  }

  disconnect() {
    this.#shutdown()
  }

  #started = false
  #engine = null

  async #boot() {
    this.#loadAssetManifest()

    try {
      const pack = await loadPack(this.packRootValue)
      pack.path = util.normalizePath(this.packRootValue)
      pack.location = "/assets/" + pack.path

      this.#engine = new GameManager(pack)
      // reveal the game once the engine has rendered its first frame
      this.element.classList.add("ready")
    } catch (error) {
      console.error("LF2 Online: engine failed to start", error)
      this.#started = false
    }
  }

  #shutdown() {
    this.#engine?.destroy?.()
    this.#engine = null
    this.#started = false
    resetAssetRegistry()
  }

  #loadAssetManifest() {
    const node = this.element.querySelector("#engine-pack-assets")
    if (!node) return

    try {
      setAssetRegistry(JSON.parse(node.textContent ?? "{}"))
    } catch (error) {
      console.warn("LF2 Online: failed to parse asset manifest", error)
    }
  }
}
