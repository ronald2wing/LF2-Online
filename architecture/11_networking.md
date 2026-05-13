# Networking — Lockstep Deterministic P2P

> Source: original LF2 v2.0 networking (DirectPlay), `network.js`, `readme.txt`

## LF2 v2.0 Networking Model

LF2 v2.0 supports IP-based multiplayer for up to **4 computers** (8 players, 2 per machine) using **Microsoft DirectPlay 7** for P2P communication.

### Deterministic Lockstep Architecture

1. **Input synchronization only**: Only key states (hold/click arrays per object) are transmitted between peers, NOT full object state
2. **Deterministic engine**: Fixed 30 TU clock, deterministic physics, identical simulation on all peers
3. **Fixed input delay**: Network latency absorbed by a fixed input buffer — all peers wait for all inputs before advancing
4. **No server authority**: Each client independently runs the full simulation; inputs are the only shared data
5. **Identical PRNG seeding**: All peers seed the PRNG identically so random events stay in sync

### Why Lockstep

The game only needs to transmit **~56 bytes** per player per frame (key state arrays) rather than full object state (~400 objects × ~900 bytes each). This makes lockstep dramatically more bandwidth-efficient than state synchronization.

## Player Count

- **4 computers** in a session
- **2 players per computer** (shared keyboard or controllers)
- Total: up to **8 simultaneous human players**
- Plus up to **8 AI-controlled characters** (C1–C8 in slots 10–17)

## DirectPlay Architecture (Original LF2)

- Host creates a DirectPlay session (peer or client/server mode)
- Clients join via **IP address**
- Input packets sent as DirectPlay messages
- Game state never transmitted — only player inputs
- DirectPlay handles peer discovery, reliable/unreliable messaging, and NAT traversal

## Deterministic Requirements

For lockstep to work correctly across machines:

1. **Identical initial state**: Same data files, same character selections, same stage/background
2. **Identical game logic**: Same code path on all machines (same `.exe` version)
3. **Fixed-point/integer physics**: LF2 uses integer-based physics internally, avoids floating-point nondeterminism
4. **Deterministic PRNG**: Seeds must produce identical sequences on all machines
5. **Deterministic AI**: AI scripts must not depend on system state (time, etc.)

## Modern Implementation (GemFighter / F.LF)

Modern ports replace DirectPlay with **WebSocket** based networking:

### ActionCable (GemFighter)

From the GemFighter app:
- Rails ActionCable mounts at `/cable` for WebSocket signaling
- Game client expects `/protocol` (server info) and `/lobby` endpoints
- WebSocket replaces DirectPlay for peer signaling and input relay

### F.LF WebRTC

F.LF uses WebRTC for browser P2P:
- WebSocket for signaling (offer/answer exchange)
- WebRTC data channels for input transmission
- Same lockstep architecture: transmit inputs only, run identical simulation locally

## Input Packet Format

Each player's input per frame is a compact bitfield encoding:

```
holding_up, holding_down, holding_left, holding_right,
holding_attack, holding_jump, holding_defend,
click_* (edge-triggered events for combo inputs)
```

Click flags are edge-triggered (set to 1 only on the first TU of a key press, then cleared). Hold flags persist while the key is held.

## Combo Determinism

Combos are detected **locally** on each peer using the shared input state. Since all peers receive the same inputs, combo detection produces identical results on all machines. The combo timeout window (10 TU) ensures combos are detected consistently regardless of network jitter.

## Latency and Input Delay

Lockstep inherently adds latency equal to the network round-trip time. LF2 v2.0 uses a **fixed input buffer** approach:
- Peers buffer inputs for a fixed number of frames before processing
- This absorbs network jitter
- Longer buffer = higher latency but fewer stutters

The optimal buffer size depends on network conditions and is typically 2-4 frames (66-133ms at 30fps).

## Recording / Replay

LF2 v2.0's recording feature (from `readme.txt`) is a natural byproduct of lockstep:
- Record all player inputs to a file
- Replay by feeding recorded inputs back into the engine
- Requires identical data files and engine version
- Replay captures exact gameplay since simulation is deterministic
