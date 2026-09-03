import { useState } from "react";
import { submitFeedback } from "../api";
import { limitFeedbackLength, MAX_FEEDBACK_LENGTH } from "../feedback";

export function CitizenPage({ user }) {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (message.length > MAX_FEEDBACK_LENGTH) {
      setError(`Feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer.`);
      return;
    }
    try {
      await submitFeedback({ nric: user.nric, name: user.name, message });
      setSubmitted(true);
      setMessage("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function submitAnother() {
    setError("");
    setSubmitted(false);
  }

  return (
    <main className="page-shell">
      <div className="page-heading">
        <div className="eyebrow">Public feedback</div>
        <h1>What would you like us to know?</h1>
        <p>Tell us about an issue, an idea, or a positive experience in your community.</p>
      </div>
      <section className="form-card">
        {submitted ? (
          <div className="submission-success">
            <div className="success-banner">Thank you. Your feedback has been received.</div>
            <button className="primary-button" type="button" onClick={submitAnother}>Submit another</button>
          </div>
        ) : <form onSubmit={handleSubmit}>
          <label>Your feedback
            <textarea
              rows="7"
              value={message}
              maxLength={MAX_FEEDBACK_LENGTH}
              onChange={(event) => setMessage(limitFeedbackLength(event.target.value))}
              placeholder="Share your feedback here..."
            />
          </label>
          <div className="form-footer">
            <span className="muted">Please do not include sensitive personal information.</span>
            <div className="form-actions">
              <span className="character-count" aria-live="polite">
                {message.length} / {MAX_FEEDBACK_LENGTH} characters
              </span>
              <button className="primary-button">Submit feedback</button>
            </div>
          </div>
          {error && <p className="error-message">{error}</p>}
        </form>}
      </section>
    </main>
  );
}
