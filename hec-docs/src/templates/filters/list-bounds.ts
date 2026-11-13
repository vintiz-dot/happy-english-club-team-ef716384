// Jinja2's `min` and `max` list filters, which Nunjucks lacks. ui.meter in
// components/ui.njk clamps its bar width with `[0, [pct, 100] | min] | max`;
// without these the macro fails to render. Pure.

const nums = (v: unknown): number[] => (Array.isArray(v) ? v : [v]).map(Number).filter((n) => !Number.isNaN(n));

export const filters = {
  min: (v: unknown): number | undefined => (nums(v).length ? Math.min(...nums(v)) : undefined),
  max: (v: unknown): number | undefined => (nums(v).length ? Math.max(...nums(v)) : undefined),
};
