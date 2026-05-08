// Preload module for Node unit tests: registers the engine importmap-alias
// resolver so tests can import modules that use "engine/..." specifiers
// (e.g. AI.js → engine/core/util). Run tests with:
//   node --import ./test/javascript/loader.mjs --test test/javascript/*.test.js
import { register } from "node:module"

register(new URL("./engine-resolve.mjs", import.meta.url))
