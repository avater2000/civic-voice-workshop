import { useEffect, useState } from "react";
import { getFeedback } from "../api";
import { maskIdentifier } from "../identifier";

export function AdminPage({ user }) {
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadFeedback = () => {
    setIsLoading(true);
    setError("");

    return getFeedback(user)
      .then((response) => setFeedback(response.feedback))
      .catch((requestError) => setError(requestError.message || "We could not load the feedback inbox."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadFeedback();
  }, [user]);

  const visibleFeedback = feedback.filter((item) => {
    const searchableText = `${item.name} ${item.message}`.toLowerCase();
    return searchableText.includes(query.trim().toLowerCase());
  });
  const summary = ["New", "In review", "Closed"].map((status) => ({
    status,
    count: feedback.filter((item) => item.status === status).length,
  }));

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
      {!isLoading && !error && feedback.length === 0 && (
        <section className="inbox-state">
          <h2>No feedback yet</h2>
          <p>New feedback from the public will appear here.</p>
        </section>
      )}
      {!isLoading && !error && feedback.length > 0 && <>
        <section className="inbox-summary" aria-label="Inbox summary">
          <div className="summary-card"><span>Total</span><strong>{feedback.length}</strong></div>
          {summary.map(({ status, count }) => <div className="summary-card" key={status}><span>{status}</span><strong>{count}</strong></div>)}
        </section>
        <section className="feedback-list">
          <div className="list-header"><strong>Latest feedback</strong><span>{visibleFeedback.length} items</span></div>
          <label>
            Search feedback
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages or names" />
          </label>
          {visibleFeedback.length === 0 && <p className="muted">No feedback matches your search.</p>}
          {visibleFeedback.map((item) => (
            <article className="feedback-row" key={item.id}>
              <div>
                <div className="feedback-meta">
                  {item.name} · {maskIdentifier(item.nric)} · {new Date(item.createdAt).toLocaleDateString()}
                </div>
                <p>{item.message}</p>
              </div>
              <span className="status-pill">{item.status}</span>
            </article>
          ))}
        </section>
      </>}
    </main>
  );
}
