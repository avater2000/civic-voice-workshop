import { useEffect, useRef, useState } from "react";
import { requestFeedbackSpeech, submitFeedback } from "../api";
import { hasFeedbackContent, limitFeedbackLength, MAX_FEEDBACK_LENGTH } from "../feedback";

const categories = ["Estate", "Transport", "Environment", "Other"];

export function CitizenPage({ user }) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [spokenMessage, setSpokenMessage] = useState("");
  const [audioError, setAudioError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const successHeading = useRef(null);
  const audio = useRef(null);

  useEffect(() => {
    if (submitted) successHeading.current?.focus();
  }, [submitted]);

  useEffect(() => () => {
    audio.current?.pause();
    if (audio.current?.src) URL.revokeObjectURL(audio.current.src);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!hasFeedbackContent(message)) {
      setError("Please enter feedback that is more than spaces or line breaks.");
      return;
    }
    if (message.length > MAX_FEEDBACK_LENGTH) {
      setError(`Feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer.`);
      return;
    }
    try {
      const response = await submitFeedback({ nric: user.nric, name: user.name, message, category });
      setReference(response.feedback.reference);
      setSpokenMessage(message);
      setSubmitted(true);
      setMessage("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function submitAnother() {
    setError("");
    setReference("");
    setSpokenMessage("");
    setAudioError("");
    audio.current?.pause();
    audio.current = null;
    setIsSpeaking(false);
    setSubmitted(false);
  }

  async function toggleSpeech() {
    setAudioError("");
    if (audio.current) {
      if (isSpeaking) {
        audio.current.pause();
        setIsSpeaking(false);
      } else {
        await audio.current.play();
        setIsSpeaking(true);
      }
      return;
    }
    setIsPreparingAudio(true);
    try {
      const blob = await requestFeedbackSpeech(spokenMessage);
      const player = new Audio(URL.createObjectURL(blob));
      player.addEventListener("ended", () => setIsSpeaking(false));
      audio.current = player;
      await player.play();
      setIsSpeaking(true);
    } catch (requestError) {
      setAudioError(requestError.message || "Audio playback could not be created.");
    } finally {
      setIsPreparingAudio(false);
    }
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
            <button className="text-button" type="button" onClick={toggleSpeech} disabled={isPreparingAudio}>
              {isPreparingAudio ? "Preparing audio…" : isSpeaking ? "Pause feedback audio" : "Read feedback aloud"}
            </button>
            {audioError && <p className="error-message" role="alert">{audioError}</p>}
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
          <label htmlFor="feedback-category">Category
            <select
              id="feedback-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((option) => <option key={option}>{option}</option>)}
            </select>
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
