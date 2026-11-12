export function cleanText(value: string, max: number) {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function safeNextPath(value: string | undefined | null, fallback: string) {
  if (!value || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
