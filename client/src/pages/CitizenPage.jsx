import { useEffect, useRef, useState } from "react";
import { submitFeedback } from "../api";
import { limitFeedbackLength, MAX_FEEDBACK_LENGTH } from "../feedback";

export function CitizenPage({ user }) {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const successHeading = useRef(null);

  useEffect(() => {
    if (submitted) successHeading.current?.focus();
  }, [submitted]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (message.length > MAX_FEEDBACK_LENGTH) {
      setError(`Feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer.`);
      return;
    }
    try {
      const response = await submitFeedback({ nric: user.nric, name: user.name, message });
      setReference(response.feedback.reference);
      setSubmitted(true);
      setMessage("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function submitAnother() {
    setError("");
    setReference("");
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
          <div className="submission-success" role="status" aria-live="polite">
            <h2 ref={successHeading} tabIndex="-1">Feedback received</h2>
            <div className="success-banner">Thank you. Your feedback has been received.</div>
            <p className="submission-reference">Your reference number: <strong>{reference}</strong></p>
            <button className="primary-button" type="button" onClick={submitAnother}>Submit another</button>
          </div>
        ) : <form onSubmit={handleSubmit}>
          <label htmlFor="feedback-message">Your feedback
            <textarea
              id="feedback-message"
              rows="7"
              value={message}
              maxLength={MAX_FEEDBACK_LENGTH}
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "feedback-guidance feedback-error" : "feedback-guidance"}
              onChange={(event) => setMessage(limitFeedbackLength(event.target.value))}
              placeholder="Share your feedback here..."
            />
          </label>
          <p id="feedback-guidance" className="visually-hidden">
            Please do not include sensitive personal information. Maximum {MAX_FEEDBACK_LENGTH} characters.
          </p>
          {error && <p id="feedback-error" className="error-message" role="alert">{error}</p>}
          <div className="form-footer">
            <span className="muted">Please do not include sensitive personal information.</span>
            <div className="form-actions">
              <span className="character-count" aria-live="polite">
                {message.length} / {MAX_FEEDBACK_LENGTH} characters
              </span>
              <button className="primary-button">Submit feedback</button>
            </div>
          </div>
        </form>}
      </section>
    </main>
  );
}
