// Unit tests for the survival music schedule (music.js).
// Run with: node --test test/javascript/
import { test } from "node:test"
import assert from "node:assert/strict"
import { survivalTrack, MUSIC_OPTIONS, musicOptionName, matchMusicOverride } from "../../app/javascript/engine/Game/music.js"

const BOSS1 = [7, 17, 28, 39, 58, 69, 82, 92]
const BOSS2 = [10, 20, 30, 40, 50, 60, 70, 80, 85, 94]
const STAGE4 = [11, 21, 31, 41, 51, 61, 71, 81, 90]

test("survival starts on stage4", () => {
  assert.equal(survivalTrack(0), "stage4")
  assert.equal(survivalTrack(1), "stage4")
})

test("survival schedule maps every transition wave to its track", () => {
  for (const w of BOSS1) assert.equal(survivalTrack(w), "boss1", `wave ${w}`)
  for (const w of BOSS2) assert.equal(survivalTrack(w), "boss2", `wave ${w}`)
  for (const w of STAGE4) assert.equal(survivalTrack(w), "stage4", `wave ${w}`)
})

test("a track persists until the next transition wave", () => {
  assert.equal(survivalTrack(8), "boss1")   // after 7, before 10
  assert.equal(survivalTrack(12), "stage4") // after 11, before 17
  assert.equal(survivalTrack(29), "boss1")  // after 28, before 30
  assert.equal(survivalTrack(52), "stage4") // after 51, before 58
  assert.equal(survivalTrack(83), "boss1")  // after 82, before 85
  assert.equal(survivalTrack(95), "boss2")  // after 94, holds to the end
  assert.equal(survivalTrack(99), "boss2")
})

test("negative/undefined waves fall back to stage4", () => {
  assert.equal(survivalTrack(-1), "stage4")
  assert.equal(survivalTrack(undefined), "stage4")
})

test("music options list the original selector order", () => {
  assert.deepEqual(MUSIC_OPTIONS.map(o => o.name), [
    "Final Boss", "Boss", "Stage 5", "Stage 4", "Stage 3",
    "Stage 2", "Stage 1", "Main Theme", "Random"
  ])
  assert.deepEqual(MUSIC_OPTIONS.map(o => o.track), [
    "boss2", "boss1", "stage5", "stage4", "stage3",
    "stage2", "stage1", "main", null
  ])
})

test("musicOptionName maps a choice to its display name", () => {
  assert.equal(musicOptionName(undefined), "Default")
  assert.equal(musicOptionName(null), "Default")
  assert.equal(musicOptionName(0), "Final Boss")
  assert.equal(musicOptionName(7), "Main Theme")
  assert.equal(musicOptionName(8), "Random")
})

test("matchMusicOverride returns null when no choice is made", () => {
  assert.equal(matchMusicOverride(undefined, Math.random), null)
  assert.equal(matchMusicOverride(null, Math.random), null)
})

test("matchMusicOverride maps each specific choice to its track", () => {
  for (let i = 0; i < 8; i++) {
    assert.equal(matchMusicOverride(i, Math.random), MUSIC_OPTIONS[i].track)
  }
})

test("matchMusicOverride Random picks among the eight tracks", () => {
  assert.equal(matchMusicOverride(8, () => 0.999), "main")   // last track
  assert.equal(matchMusicOverride(8, () => 0), "boss2")      // first track
})

test("matchMusicOverride ignores out-of-range choices", () => {
  assert.equal(matchMusicOverride(9, Math.random), null)
  assert.equal(matchMusicOverride(-1, Math.random), null)
})
