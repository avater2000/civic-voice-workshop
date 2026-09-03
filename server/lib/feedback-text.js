const unsafeMarkup = { "<": "‹", ">": "›" };

export function normalizeFeedbackText(message) {
  return message
    .normalize("NFKC")
    .replace(/[<>]/g, (character) => unsafeMarkup[character])
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}
