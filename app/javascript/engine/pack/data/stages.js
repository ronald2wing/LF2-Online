/* LF2 Online — Stage data converted from original LF2 stage.dat
 *
 * Each stage defines the enemy waves from the official LF2 campaign.
 * Enemy HP values are from the original stage data (bosses have higher HP).
 * Player: Davis (id=11). All enemies use the single "Computer" AI.
 *
 * Stage data is split per chapter for maintainability.
 */

import chapter5 from "engine/pack/data/stages/chapter-5"
import chapter4 from "engine/pack/data/stages/chapter-4"
import chapter3 from "engine/pack/data/stages/chapter-3"
import chapter1 from "engine/pack/data/stages/chapter-1"
import chapter2 from "engine/pack/data/stages/chapter-2"
import survival from "engine/pack/data/stages/survival"

export default {
  // Chapters 3/4/5 are stored highest-stage-first in their source files;
  // reverse them so the campaign plays 1-1 → 5-5 in order. Survival is last.
  stages: [].concat(
    chapter1,
    chapter2,
    chapter3.slice().reverse(),
    chapter4.slice().reverse(),
    chapter5.slice().reverse(),
    survival
  )
}
