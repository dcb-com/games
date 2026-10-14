import type { RuleTester } from "oxlint/plugins-dev";

// The `dcb` JS plugin that defined-types.ts turns on. oxlint runs it in Node,
// the way it runs an ESLint plugin. oxlint does not export its rule types by
// name, so they are read off its RuleTester.
export type Rule = Parameters<RuleTester["run"]>[1];
type Context = Parameters<NonNullable<Rule["create"]>>[0];
type Visitor = ReturnType<NonNullable<Rule["create"]>>;
type Node = Parameters<NonNullable<Visitor["TSUnknownKeyword"]>>[0];

// True when the name this type is written on holds a thrown value: the
// binding of a `catch` clause, or the first parameter of a promise's
// rejection callback (`.catch(cb)`, or the second callback of `.then`).
// JavaScript lets any value be thrown, so `unknown` is the true type there,
// and the code reads it with a check before it uses it.
function holdsThrownValue(node: Node): boolean {
  const annotation = node.parent;
  if (annotation?.type !== "TSTypeAnnotation") return false;
  const param = annotation.parent;
  if (param?.type !== "Identifier") return false;
  const owner = param.parent;
  if (owner?.type === "CatchClause") return owner.param === param;
  if (
    owner?.type !== "ArrowFunctionExpression" &&
    owner?.type !== "FunctionExpression"
  ) {
    return false;
  }
  if (owner.params[0] !== param) return false;
  const call = owner.parent;
  if (call?.type !== "CallExpression") return false;
  const callee = call.callee;
  if (callee.type !== "MemberExpression" || callee.computed) return false;
  if (callee.property.type !== "Identifier") return false;
  const method = callee.property.name;
  if (method === "catch") return call.arguments[0] === owner;
  if (method === "then") return call.arguments[1] === owner;
  return false;
}

const noUnknown: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Refuse the `unknown` type. Define the type, or parse the value with zod.",
    },
    messages: {
      unknown:
        "Give this a defined type, or parse it with zod and use z.infer. If it must stay `unknown`, disable this rule on the line above and say why after `--`.",
      schema:
        "Describe the shape this schema accepts. If it must accept anything, disable this rule on the line above and say why after `--`.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      TSUnknownKeyword(node) {
        if (holdsThrownValue(node)) return;
        context.report({ node, messageId: "unknown" });
      },
      // `z.unknown()` and `z.any()` are the same hole, written as a schema.
      "CallExpression > MemberExpression.callee[object.name='z'][property.name=/^(unknown|any)$/]"(
        node,
      ) {
        context.report({ node, messageId: "schema" });
      },
    };
  },
};

// The rules whose disable comment must give a reason. oxlint takes a
// typescript-eslint rule under either name, so both are listed.
const needReason = new Set(
  [
    "dcb/no-unknown",
    "no-explicit-any",
    "no-unsafe-argument",
    "no-unsafe-assignment",
    "no-unsafe-call",
    "no-unsafe-member-access",
    "no-unsafe-return",
    "no-unsafe-type-assertion",
  ].flatMap((rule) =>
    rule.includes("/")
      ? [rule]
      : [`typescript/${rule}`, `@typescript-eslint/${rule}`],
  ),
);

// oxlint reads both its own directives and ESLint's.
const directive =
  /^\s*(?:oxlint|eslint)-disable(?:-next-line|-line)?\s+([^]*)$/;

const disableNeedsReason: Rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "A comment that turns off a type-safety rule must say why, after `--`.",
    },
    messages: {
      reason:
        "Say why this line may skip `{{rule}}`: put the reason after `--` in the same comment.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const found = directive.exec(comment.value);
          if (!found?.[1]) continue;
          const [rules = "", reason = ""] = found[1].split(/\s--\s?/, 2);
          if (reason.trim().length > 0) continue;
          for (const rule of rules.split(",").map((r) => r.trim())) {
            if (!needReason.has(rule)) continue;
            context.report({
              loc: comment.loc,
              messageId: "reason",
              data: { rule },
            });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: "dcb" },
  rules: {
    "no-unknown": noUnknown,
    "disable-needs-reason": disableNeedsReason,
  },
};
