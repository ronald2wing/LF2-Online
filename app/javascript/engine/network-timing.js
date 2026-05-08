// Pure input-delay helper for the delay-based lockstep netcode.
//
// Extracted from network.js so the delay formula is unit-testable in Node
// without pulling in the DOM-dependent engine. This module must load in
// isolation: no imports from engine modules.

// Bounds for the delay-based lockstep input delay, in frames.
const MIN_DELAY = 2
const MAX_DELAY = 6
// Extra slack (ms) added to half the round-trip time before converting the
// one-way latency to whole frames, to absorb jitter.
const SLACK_MS = 8

// Computes the lockstep input delay in frames for a measured round-trip time.
// Half the RTT is the one-way latency a packet must travel; that latency plus
// slack is rounded up to whole frames, plus one frame of safety margin, then
// clamped to [MIN_DELAY, MAX_DELAY].
export function computeInputDelay(rttMs, tickMs) {
  if (!Number.isFinite(rttMs) || rttMs < 0) rttMs = 0
  if (!Number.isFinite(tickMs) || tickMs <= 0) return MIN_DELAY
  const delay = Math.ceil((rttMs / 2 + SLACK_MS) / tickMs) + 1
  return Math.min(MAX_DELAY, Math.max(MIN_DELAY, delay))
}
