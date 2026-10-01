// Simple, collision-resistant ID generator (no native crypto dependency).
export function newId(prefix = "id"): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${t}${r}`;
}
