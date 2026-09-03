export function maskIdentifier(identifier) {
  if (typeof identifier !== "string" || identifier.length < 4) return "••••";

  return `${identifier.slice(0, 1)}${"•".repeat(identifier.length - 3)}${identifier.slice(-2)}`;
}
