// Deno lint plugin: no-type-assertion
//
// Forbids raw `value as Type` assertions throughout the codebase.
// Use ExplicitCast (explicit-cast.ts) instead:
//
//   ExplicitCast.fromAny(x).dangerousCast<MyType>()
//   ExplicitCast.from<Shape>(s).downcast<Circle>()
//
// `as const` is explicitly allowed because it is a const assertion
// (a different mechanism that narrows literal types rather than a type cast).

const plugin: Deno.lint.Plugin = {
  name: "dz-tools",
  rules: {
    "no-type-assertion": {
      create(ctx) {
        return {
          TSAsExpression(node) {
            const ann = node.typeAnnotation;
            // Allow `as const` — it is a const assertion, not a dangerous type cast
            if (
              ann.type === "TSTypeReference" &&
              ann.typeName.type === "Identifier" &&
              ann.typeName.name === "const"
            ) {
              return;
            }
            ctx.report({
              node,
              message:
                "Forbidden: use ExplicitCast (explicit-cast.ts) instead of raw `as Type` assertions.",
            });
          },
        };
      },
    },
  },
};

export default plugin;
