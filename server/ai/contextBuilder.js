// contextBuilder.js
// Sanitizes and normalizes incoming context before passing to the prompt builder.
// Removes Mongoose internals, large fields, and irrelevant metadata.
// Add module-specific field whitelists here for tighter control.

// Fields that are never useful for AI context
const ALWAYS_STRIP = new Set([
  "__v",
  "updatedAt",
  "createdAt",
  "password",
  "token",
  "refreshToken",
  "__proto__",
]);

// Maximum character length for any single string field
const MAX_FIELD_LENGTH = 2000;

// Maximum total serialized context size in characters
const MAX_CONTEXT_SIZE = 8000;

function sanitizeValue(value) {
  if (typeof value === "string") {
    return value.length > MAX_FIELD_LENGTH
      ? value.slice(0, MAX_FIELD_LENGTH) + "…"
      : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20); // cap arrays at 20 items
  }
  return value;
}

function buildContext({ module, context }) {
  if (!context || typeof context !== "object") return null;

  const clean = {};

  for (const [key, value] of Object.entries(context)) {
    if (ALWAYS_STRIP.has(key)) continue;
    if (key.startsWith("_")) continue; // strip all mongo/internal fields
    if (value === null || value === undefined) continue;

    clean[key] = sanitizeValue(value);
  }

  // Guard against oversized payloads
  const serialized = JSON.stringify(clean);
  if (serialized.length > MAX_CONTEXT_SIZE) {
    // Return only the first N chars worth of fields
    const trimmed = {};
    let total = 0;
    for (const [key, value] of Object.entries(clean)) {
      const chunk = JSON.stringify({ [key]: value }).length;
      if (total + chunk > MAX_CONTEXT_SIZE) break;
      trimmed[key] = value;
      total += chunk;
    }
    return trimmed;
  }

  return clean;
}

module.exports = { buildContext };