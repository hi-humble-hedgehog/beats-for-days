/**
 * Architecture boundaries, enforced by `pnpm deps:check`.
 * The intended layering is documented in docs/architecture/overview.md.
 * When you add a rule, explain *why* in `comment` — agents read it.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  extends: "dependency-cruiser/configs/recommended-strict",
  forbidden: [
    {
      name: "no-orphans",
      comment:
        "Modules nothing depends on are usually dead code. Next.js route files are entry points, so they are exempt.",
      severity: "error",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)[.][^/]+[.](?:js|cjs|mjs|ts|cts|mts|json)$",
          "[.]d[.]ts$",
          "(^|/)tsconfig[.]json$",
          "^src/app/",
          "^scripts/.+/cli[.]ts$",
        ],
      },
      to: {},
    },
    {
      name: "lib-is-ui-agnostic",
      comment:
        "src/lib holds framework-agnostic logic (audio engine, API clients). It must not depend on React components or routes, so it stays unit-testable and reusable by the stream worker.",
      severity: "error",
      from: { path: "^src/lib/" },
      to: { path: "^src/(app|components)/" },
    },
    {
      name: "components-not-to-app",
      comment:
        "Components are reusable building blocks; routes compose them, never the other way around.",
      severity: "error",
      from: { path: "^src/components/" },
      to: { path: "^src/app/" },
    },
    {
      name: "server-code-not-in-client",
      comment:
        "Secrets and server-only clients (env, ElevenLabs) must never be bundled into client code. Access them from route handlers / server components only.",
      severity: "error",
      from: { path: "^src/(components|lib/audio|lib/visualizer)/" },
      to: { path: "^src/lib/(env|elevenlabs)" },
    },
    {
      name: "app-code-not-to-tooling",
      comment:
        "Repo tooling (scripts/, test/) is not part of the shipped application.",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "^(scripts|test)/" },
    },
    {
      name: "stream-worker-is-isolated",
      comment:
        "The stream worker deploys separately; share code via an explicit package, not deep imports.",
      severity: "error",
      from: { path: "^stream-worker/" },
      to: { path: "^src/" },
    },
  ],
  options: {
    doNotFollow: { path: ["node_modules"] },
    exclude: {
      path: ["^[.]next/", "^coverage/", "^reports/", "^[.]stryker-tmp/"],
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
    skipAnalysisNotInRules: true,
  },
};
