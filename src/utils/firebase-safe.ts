/**
 * Recursively remove `undefined` values from an object before sending to
 * Firebase. RTDB's serializer rejects writes containing `undefined`, but JS
 * allows `undefined` as the value of optional object properties. RTDB treats
 * a missing key the same as a key set to `undefined` would have meant, so
 * stripping is safe and equivalent.
 */
export function stripUndefined<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripUndefined) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    out[k] = stripUndefined(v);
  }
  return out as T;
}
