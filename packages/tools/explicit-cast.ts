// ExplicitCast - Visible, auditable type casting utility
//
// Based on RFC XXX – Explicit Type Casting in TypeScript.
//
// Replaces all `value as Type` assertions with explicit, searchable calls.
// The `as` keywords are isolated here and guarded by ESLint disable directives.
//
// Usage:
//   ExplicitCast.fromAny(jsonParseResult).dangerousCast<MyType>()
//   ExplicitCast.from<Shape>(shape).downcast<Circle>()
//   ExplicitCast.from<unknown>(value).dangerousCast<MyType>()

/* eslint-disable @typescript-eslint/consistent-type-assertions */
export const ExplicitCast = {
  /** Starts a cast from a value of type `any` */
  fromAny: <TParam>(value: TParam) => ({
    /** Converts `any` to `unknown` — prefer this, then validate at runtime */
    asUnknown: (): 0 extends 1 & TParam ? unknown : TypeError =>
      value as 0 extends 1 & TParam ? unknown : TypeError,

    /** Casts `any` directly to `TResult` — last resort */
    dangerousCast: <TResult>(): 0 extends 1 & TParam ? TResult : TypeError =>
      value as 0 extends 1 & TParam ? TResult : TypeError,
  }),

  /** Casts a value within a type hierarchy (parent → child) */
  from: <TParam = never>(value: NoInfer<TParam>) => ({
    /** Downcast to a subtype — compile-time error if TResult doesn't extend TParam */
    downcast: <TResult>(): TResult extends TParam ? TResult : TypeError =>
      value as unknown as TResult extends TParam ? TResult : TypeError,

    /** Use only when downcast() is not possible — explicitly marked as dangerous */
    dangerousCast: <TResult>(): TResult => value as unknown as TResult,
  }),
};
/* eslint-enable @typescript-eslint/consistent-type-assertions */
