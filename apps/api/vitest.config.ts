import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  // Vitest's default esbuild transform strips decorators but does not
  // emit TypeScript's `design:paramtypes` metadata — NestJS's DI
  // resolves a constructor parameter with no explicit @Inject() token
  // (Reflector, or this app's own services) purely from that metadata.
  // Without it, those params silently resolve to `undefined` at
  // runtime under test, even though the exact same code works in the
  // real, tsc-compiled app (nest build honors emitDecoratorMetadata).
  // SWC's transform does emit it — this is the standard NestJS+Vitest
  // fix, not a workaround specific to this repo.
  plugins: [swc.vite()],
  test: {
    passWithNoTests: true,
    environment: "node",
    // Every e2e spec shares ONE real Postgres + Redis instance (this
    // repo's whole testing philosophy — no mocked repository). Each
    // file's own beforeEach flushes Redis for its own isolation; running
    // spec FILES in parallel (vitest's default) means one file's flush
    // can wipe out another file's just-created state mid-test — a real,
    // observed flake, not a hypothetical one. Serializing file execution
    // removes the whole race category rather than papering over one
    // symptom of it.
    fileParallelism: false,
  },
});
