import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import plugin from "./defined-types-plugin.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

tester.run("no-unknown", plugin.rules["no-unknown"], {
  valid: [
    "try { f(); } catch (err: unknown) { g(err); }",
    "p.catch((err: unknown) => g(err));",
    "p.catch(async (err: unknown) => { await g(err); });",
    "p.catch(function (err: unknown) { g(err); });",
    "p.then((v) => v, (err: unknown) => g(err));",
    "type Shape = { name: string };",
  ],
  invalid: [
    { code: "type Thrown = unknown;", errors: [{ messageId: "unknown" }] },
    {
      code: "function f(err: unknown) { return err; }",
      errors: [{ messageId: "unknown" }],
    },
    {
      code: "const f = (err: unknown) => err;",
      errors: [{ messageId: "unknown" }],
    },
    // Only the rejection callback of `.then`, not the one for a value.
    {
      code: "p.then((v: unknown) => v);",
      errors: [{ messageId: "unknown" }],
    },
    // Only the first parameter holds the thrown value.
    {
      code: "p.catch((err, extra: unknown) => extra);",
      errors: [{ messageId: "unknown" }],
    },
    // A wider type built around the binding is still refused.
    {
      code: "p.catch((err: unknown[]) => err);",
      errors: [{ messageId: "unknown" }],
    },
    {
      code: "const errors: unknown[] = [];",
      errors: [{ messageId: "unknown" }],
    },
    { code: "z.unknown();", errors: [{ messageId: "schema" }] },
  ],
});
