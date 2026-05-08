/* Pack resource map — resolves asset paths through the Rails asset registry.
 *
 * The engine consumes `.condition` and `.get(name)`. We pin `condition` to
 * the unconditionally-true string the engine recognises so the map is always
 * active, and route lookups through the shared registry that the Stimulus
 * controller seeds with fingerprinted Propshaft URLs.
 */

import { resolveAsset } from "engine/asset-registry"

export default {
  condition: "location contain ://",
  get(name) {
    return resolveAsset(name)
  },
}
