/** Pure, side-effect-free formatting helpers. */

/** Capitalize the first character of a string. */
export function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Truncate a string to `max` characters, appending an ellipsis when cut. */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}
