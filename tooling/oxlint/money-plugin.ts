// An oxlint JS plugin with one rule, `dcb-money/no-raw-money-math`. Money
// is converted in one place, @dcb/money, and nowhere else.
// This rule flags the four shapes every hand-rolled conversion takes:
//
//   x * 100, x / 100   dollars to cents and back
//   x.toFixed(...)     a dollar float turned into text
//   parseFloat(...)    text turned into a dollar float
//
// Something that is not money, such as a percent or hours, says so on the
// line: `// oxlint-disable-next-line dcb-money/no-raw-money-math -- percent`.

interface Node {
  type: string;
  [key: string]: unknown;
}

interface Context {
  report(problem: { node: Node; message: string }): void;
}

const MESSAGE =
  "Money is converted only in @dcb/money: Money.fromDollarNumber, Money.fromDollarString, Money.parseInput, .toDollarNumber, .format. If this is not money, disable the rule on this line and say what it is.";

function isHundred(node: unknown): boolean {
  const n = node as Node | undefined;
  return n?.type === "Literal" && (n.value === 100 || n.value === 0.01);
}

function memberName(node: unknown): string | undefined {
  const n = node as Node | undefined;
  if (n?.type !== "MemberExpression" || n.computed) return undefined;
  const property = n.property as Node;
  return property.type === "Identifier" ? (property.name as string) : undefined;
}

const noRawMoneyMath = {
  meta: {
    type: "problem",
    docs: { description: "Money conversions go through @dcb/money." },
  },
  create(context: Context) {
    return {
      BinaryExpression(node: Node) {
        if (node.operator !== "*" && node.operator !== "/") return;
        if (
          isHundred(node.right) ||
          (node.operator === "*" && isHundred(node.left))
        ) {
          context.report({ node, message: MESSAGE });
        }
      },
      AssignmentExpression(node: Node) {
        if (node.operator !== "*=" && node.operator !== "/=") return;
        if (isHundred(node.right)) context.report({ node, message: MESSAGE });
      },
      CallExpression(node: Node) {
        const callee = node.callee as Node;
        const isParseFloat =
          (callee.type === "Identifier" && callee.name === "parseFloat") ||
          (memberName(callee) === "parseFloat" &&
            ((callee.object as Node).name as string) === "Number");
        if (isParseFloat || memberName(callee) === "toFixed") {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
};

export default {
  meta: { name: "dcb-money" },
  rules: { "no-raw-money-math": noRawMoneyMath },
};
