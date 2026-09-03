import { useEffect, useState } from "react";
import { getFeedback, getFeedbackCsv, updateFeedbackStatus } from "../api";
import { maskIdentifier } from "../identifier";
import { sortFeedbackNewestFirst } from "../inbox";

const FILTER_CATEGORIES = ["Estate", "Transport", "Environment", "Other"];
const FILTER_STATUSES = ["New", "In review", "Closed"];

export function AdminPage({ user }) {
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [statusError, setStatusError] = useState("");

  const loadFeedback = () => {
    setIsLoading(true);
    setError("");

    return getFeedback(user, { category, status })
      .then((response) => setFeedback(sortFeedbackNewestFirst(response.feedback)))
      .catch((requestError) => setError(requestError.message || "We could not load the feedback inbox."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadFeedback();
  }, [user, category, status]);

  async function updateStatus(feedbackId, status) {
    setStatusError("");
    setUpdatingId(feedbackId);
    try {
      const response = await updateFeedbackStatus(user, feedbackId, status);
      setFeedback((items) => items.map((item) => item.id === feedbackId ? response.feedback : item));
    } catch (requestError) {
      setStatusError(requestError.message || "We could not update the feedback status.");
    } finally {
      setUpdatingId("");
    }
  }

  const visibleFeedback = feedback.filter((item) => {
    const searchableText = `${item.name} ${item.message}`.toLowerCase();
    return searchableText.includes(query.trim().toLowerCase());
  });
  const summary = ["New", "In review", "Closed"].map((status) => ({
    status,
    count: feedback.filter((item) => item.status === status).length,
  }));
  const hasActiveFilters = Boolean(category || status);

  function clearFilters() {
    setCategory("");
    setStatus("");
  }

  async function exportFeedback() {
    setIsExporting(true);
    setExportError("");
    try {
      const blob = await getFeedbackCsv(user, { category, status, query });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "civicvoice-feedback.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setExportError(requestError.message || "We could not export the visible feedback.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="page-shell admin-shell">
      <div className="page-heading">
        <div className="eyebrow">Admin workspace</div>
        <h1>Feedback inbox</h1>
        <p>A simple view of feedback received from members of the public.</p>
      </div>
      {isLoading && (
        <section className="inbox-state" role="status" aria-live="polite">
          <span className="loading-indicator" aria-hidden="true" />
          <h2>Loading feedback</h2>
          <p>Fetching the latest messages for the inbox.</p>
        </section>
      )}
      {!isLoading && error && (
        <section className="inbox-state inbox-error" role="alert">
          <h2>We couldn’t load the inbox</h2>
          <p>{error}</p>
          <button className="primary-button" type="button" onClick={loadFeedback}>Try again</button>
        </section>
      )}
      {!isLoading && !error && (
        <section className="inbox-filters" aria-label="Inbox filters">
          <label>
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {FILTER_CATEGORIES.map((filterCategory) => <option key={filterCategory} value={filterCategory}>{filterCategory}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {FILTER_STATUSES.map((filterStatus) => <option key={filterStatus} value={filterStatus}>{filterStatus}</option>)}
            </select>
          </label>
          {hasActiveFilters && <button className="text-button clear-filters" type="button" onClick={clearFilters}>Clear filters</button>}
        </section>
      )}
      {!isLoading && !error && feedback.length === 0 && (
        <section className="inbox-state">
          <h2>{hasActiveFilters ? "No matching feedback" : "No feedback yet"}</h2>
          <p>{hasActiveFilters ? "Try clearing a filter to view all feedback." : "New feedback from the public will appear here."}</p>
        </section>
      )}
      {!isLoading && !error && feedback.length > 0 && <>
        <section className="inbox-summary" aria-label="Inbox summary">
          <div className="summary-card"><span>Total</span><strong>{feedback.length}</strong></div>
          {summary.map(({ status, count }) => <div className="summary-card" key={status}><span>{status}</span><strong>{count}</strong></div>)}
        </section>
        <section className="feedback-list">
          <div className="list-header">
            <strong>Latest feedback</strong>
            <div className="list-actions">
              <span>{visibleFeedback.length} items</span>
              <button className="text-button" type="button" onClick={exportFeedback} disabled={isExporting || visibleFeedback.length === 0}>
                {isExporting ? "Preparing CSV…" : "Download CSV"}
              </button>
            </div>
          </div>
          <label>
            Search feedback
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages or names" />
          </label>
          {statusError && <p className="error-message" role="alert">{statusError}</p>}
          {visibleFeedback.length === 0 && <p className="muted">No feedback matches your search.</p>}
          {exportError && <p className="error-message" role="alert">{exportError}</p>}
          {visibleFeedback.map((item) => (
            <article className="feedback-row" key={item.id}>
              <div>
                <div className="feedback-meta">
                  {item.name} · {maskIdentifier(item.nric)} · {item.category ?? "Uncategorised"} · {new Date(item.createdAt).toLocaleDateString()}
                </div>
                <p>{item.message}</p>
              </div>
              <label className="status-control">
                <span className="visually-hidden">Status for feedback from {item.name}</span>
                <select
                  value={item.status}
                  disabled={updatingId === item.id}
                  onChange={(event) => updateStatus(item.id, event.target.value)}
                >
                  <option>New</option>
                  <option>In review</option>
                  <option>Closed</option>
                </select>
              </label>
            </article>
          ))}
        </section>
      </>}
    </main>
  );
}
