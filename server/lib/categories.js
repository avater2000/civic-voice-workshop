export const FEEDBACK_CATEGORIES = ["Estate", "Transport", "Environment", "Other"];

export function isFeedbackCategory(category) {
  return FEEDBACK_CATEGORIES.includes(category);
}
