import { describe, expect, it } from "vitest";
import { extractFunctions } from "./complexity";

const complexityOf = (body: string): number => {
  const [fn] = extractFunctions("sample.ts", `function f(a, b) {\n${body}\n}`);
  if (!fn) throw new Error("no function found");
  return fn.complexity;
};

describe("cyclomatic complexity", () => {
  it("is 1 for straight-line code", () => {
    expect(complexityOf("const c = a + b; return c * 2;")).toBe(1);
  });

  it.each([
    ["if", "if (a) { return 1; }"],
    ["ternary", "return a ? 1 : 2;"],
    ["for", "for (let i = 0; i < a; i++) {}"],
    ["for-in", "for (const k in a) {}"],
    ["for-of", "for (const v of a) {}"],
    ["while", "while (a) {}"],
    ["do-while", "do {} while (a);"],
    ["catch", "try { a(); } catch { b(); }"],
    ["&&", "return a && b;"],
    ["||", "return a || b;"],
    ["??", "return a ?? b;"],
    ["&&=", "a &&= b;"],
    ["||=", "a ||= b;"],
    ["??=", "a ??= b;"],
  ])("adds 1 for %s", (_label, body) => {
    expect(complexityOf(body)).toBe(2);
  });

  it("counts each else-if as a separate decision", () => {
    expect(complexityOf("if (a) {} else if (b) {} else {}")).toBe(3);
  });

  it("counts switch cases but not the default clause", () => {
    expect(
      complexityOf(
        "switch (a) { case 1: return 1; case 2: return 2; default: return 0; }",
      ),
    ).toBe(3);
  });

  it("ignores non short-circuit binary operators", () => {
    expect(complexityOf("return (a === b) + (a & b) - (a | b);")).toBe(1);
  });

  it("does not count try/finally without catch", () => {
    expect(complexityOf("try { a(); } finally { b(); }")).toBe(1);
  });

  it("excludes branches inside nested functions from the parent", () => {
    const functions = extractFunctions(
      "sample.ts",
      "function outer(a) {\n  if (a) {}\n  return [1].map((x) => (x ? x : 0));\n}",
    );
    expect(functions.map((fn) => [fn.name, fn.complexity])).toEqual([
      ["outer", 2],
      ["<anonymous>", 2],
    ]);
  });
});

describe("extractFunctions", () => {
  const source = [
    "export function declared() {}", // line 1
    "const arrow = () => 1;", // line 2
    "const expression = function () {};", // line 3
    "class Thing {", // line 4
    "  constructor() {}", // line 5
    "  method() {}", // line 6
    "  get value() { return 1; }", // line 7
    "  set value(v) {}", // line 8
    "}", // line 9
    "const obj = { shorthand() {}, prop: () => 2 };", // line 10
    "declare function ambient(): void;", // line 11
    "function overloaded(a: string): void;", // line 12
    "function overloaded(a: unknown) {}", // line 13
    "interface Shape { area(): number }", // line 14
  ].join("\n");

  const functions = extractFunctions("sample.ts", source);

  it("finds every function with a body and resolves its name", () => {
    expect(functions.map((fn) => fn.name)).toEqual([
      "declared",
      "arrow",
      "expression",
      "constructor",
      "method",
      "value",
      "value",
      "shorthand",
      "prop",
      "overloaded",
    ]);
  });

  it("reports 1-based line numbers", () => {
    expect(functions.map((fn) => fn.line)).toEqual([
      1, 2, 3, 5, 6, 7, 8, 10, 10, 13,
    ]);
  });

  it("reports offsets spanning exactly the function node", () => {
    const [declared, arrow] = functions;
    expect(source.slice(declared?.start, declared?.end)).toBe(
      "export function declared() {}",
    );
    expect(source.slice(arrow?.start, arrow?.end)).toBe("() => 1");
  });

  it("ignores non-function nodes that also have a body", () => {
    const functions = extractFunctions(
      "sample.ts",
      "namespace N { export const x = 1; }\nclass C { static { init(); } }",
    );
    expect(functions).toEqual([]);
  });

  it("labels callbacks without a resolvable name as <anonymous>", () => {
    const [, callback] = extractFunctions(
      "sample.ts",
      "function run() { setTimeout(() => {}, 1); }",
    );
    expect(callback?.name).toBe("<anonymous>");
  });

  it("parses JSX in .tsx files", () => {
    const [component] = extractFunctions(
      "Component.tsx",
      "export function Component({ on }) { return on ? <b>on</b> : <i>off</i>; }",
    );
    expect(component).toMatchObject({ name: "Component", complexity: 2 });
  });
});
