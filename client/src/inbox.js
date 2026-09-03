export function sortFeedbackNewestFirst(feedback) {
  return [...feedback].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
}
