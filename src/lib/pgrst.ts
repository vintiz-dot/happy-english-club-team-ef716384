/**
 * PostgREST relation helpers.
 *
 * An embedded relation comes back as an object for a to-one join and an
 * array for a to-many one, and the generated types often cannot tell
 * which — so call sites across this codebase settled on `(row as any)`
 * and lost every other guarantee on that row with it. `one()` narrows
 * just the relation and leaves the rest of the row typed.
 */
export function one<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}
