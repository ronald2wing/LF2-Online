# AGENTS.md — LF2 Online

## What this is

Rails 8.1 app serving an LF2 (Little Fighter 2) fighting-game engine. The real application is a JavaScript game engine ported from F.LF, living in `app/javascript/engine/`. Rails provides the HTML shell, asset pipeline, and ActionCable WebSocket signaling for P2P matchmaking. There are **no meaningful ActiveRecord models** — this is not a CRUD app.

## Dev commands

```sh
bin/ci                     # Full CI: lint → security audit → tests → seed check
bin/dev                    # Dev server (Puma, port 3000)
bin/rails test             # Ruby unit tests (Minitest) — no unit tests exist yet
bin/rails test:system      # System tests (Selenium + Capybara) — needs selenium container
bin/rubocop                # Ruby lint (Omakase style via rubocop-rails-omakase)
```

### Devcontainer

The repo includes a `.devcontainer/` setup (Docker Compose: Rails app + Selenium sidecar). The `devcontainer` CLI is the canonical way to run Docker for this project.

```sh
devcontainer up --workspace-folder "/home/bigbrother/Desktop/Rails/LF2 Online"   # build + start containers
devcontainer exec --workspace-folder "/home/bigbrother/Desktop/Rails/LF2 Online" bin/dev   # start dev server
devcontainer exec --workspace-folder "/home/bigbrother/Desktop/Rails/LF2 Online" bin/rails test:system   # run system tests
```

- Port 3000 is forwarded; the Rails server binds `0.0.0.0` inside the container (`BINDING` env in the Dockerfile).
- `bin/dev` runs in the foreground — it will "time out" the shell after ~30s, which is expected (the server keeps running).
- System tests need the `selenium` sidecar. It starts with `devcontainer up`, but it is **flaky**: if `POST /session` hangs, `docker restart lf2_online-selenium-1` + ~20s wait fixes it. The Rails app is at `172.22.0.3:3000`, selenium at `172.22.0.2:4444` on the docker network.

## Architecture

```
app/javascript/engine/Game/     Core game engine (entities, mechanics, AI, sprites, physics)
app/javascript/engine/pack/     Game data: characters, weapons, stages, UI (LF2_19 format)
app/javascript/engine/core/     Engine core libs (sprite renderer, collision, etc.)
app/javascript/engine/network.js   WebSocket/P2P signaling layer
architecture/                  LF2 engine specification docs — read these for game logic, not code
```

The `architecture/` directory is reference documentation for the LF2 engine (frame system, physics constants, hit-validation rules, etc.) derived from the original LF2 v2.0a game files. Treat it as the spec. Engine constants live in `app/javascript/engine/Game/global.js`.

## Engine constraints

- **Do not rename CSS class names** in `app/views/games/index.html.erb` — the JS engine finds its UI regions by selector.
- **Turbo caching is disabled** on the game page (`<meta name="turbo-cache-control" content="no-cache">`) because the engine attaches persistent listeners and a running interval with no teardown.
- **`pin_all_from` does not work for `engine/Game/*`** — every Game module is explicitly pinned in `config/importmap.rb`. Add new Game modules there manually.
- ActionCable mounts at `/cable` for WebSocket P2P signaling. The game client expects `/protocol` (server info) and `/lobby`.

## Engine gotchas (hard-earned)

- **`node --check` does NOT catch duplicate `const` declarations in the same scope** — the module loader does. After editing engine JS, verify the game actually loads in a browser (or `node --input-type=module -e "import ..."`), not just `node --check`.
- **`vol_body` is an array-like buffer object, not a real array** (no `Symbol.iterator`). `Scene.query` (scene.js) must iterate it with an index loop over `.length`, never `for...of` — `for...of` throws "volumes is not iterable" and crashes the match loop every frame (characters never render).
- **The renderer is canvas-based** (sprite-canvas.js) — entities draw to a canvas 2D context, not DOM children. `canvasChildren: 0` is expected.
- **`Match` is not stored on the manager** — it's a local var in `start_match`, driven by `network.startSync` (a single global clockId).
- **Sound** initializes immediately via `new Soundpack({packs, resourcemap})` in manager.js. Audio elements are created detached (never in the DOM), so `querySelectorAll('audio')` returns 0 — expected. `SoundSprite.born()` sets `currentTime` + calls `play()` immediately (does not wait for a `seeked` event).
- **Expand/unexpand** (`resizer()` in manager.js): the game always stays at native 794×550 and is contain-fit scaled with letterboxing. `wideWindow` is disabled (it stretched the HUD). On demaximize the container transform is cleared entirely. The frontpage is moved out of the container when maximized, so it's scaled directly.
- **Touch gamepad** (`touchcontroller.js`): only shows when P1 is set to touch (via the `ontouch` listener on first `touchstart`). The d-pad is a circular joystick disc with a draggable center hub; direction is computed from the hub's offset with a center dead zone. The hub's position must be **disc-relative**, not viewport-relative (viewport coords make it fly off-screen).

## Testing

- **System tests** (`test/system/game_flow_test.rb`, 8 tests) cover the menu flow and expand/unexpand layout. They run in a real browser via the selenium sidecar.
- The engine loads the game pack **asynchronously** — tests must wait for `.frontpage_title` (or use `wait_for_window_layout`) before asserting on layout.
- The gamepad buttons have no per-key class; select them by label text (↑↓←→/J/A/D).
- `bin/ci` runs the system tests (enabled in `config/ci.rb`).

## Environment

- Ruby **4.0.6** (`.ruby-version`), Rails **8.1**, SQLite
- JS bundling: **importmap-rails** (no Node.js build step, no package.json)
- CSS: **propshaft** asset pipeline
- Style: **Omakase** (rubocop-rails-omakase)
- Prod deploy: **Kamal** + **Thruster** (Docker multi-stage build)
- CI: `bin/ci` runs rubocop, bundler-audit, brakeman, importmap audit, test suite, seed replant

## Solid gems (active in production)

The app uses Solid Cache, Solid Queue, and Solid Cable — each with its own SQLite database. Migrations live in `db/cache_migrate`, `db/queue_migrate`, `db/cable_migrate`. Do not move these.
