import { useEffect, useState } from "react";
import { getHealthStatus } from "../api";

const POLL_INTERVAL_MS = 5_000;

export function ApiStatusIndicator() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let isCurrent = true;

    async function checkHealth() {
      try {
        const isHealthy = await getHealthStatus();
        if (isCurrent) setStatus(isHealthy ? "online" : "offline");
      } catch {
        if (isCurrent) setStatus("offline");
      }
    }

    checkHealth();
    const timer = window.setInterval(checkHealth, POLL_INTERVAL_MS);
    return () => {
      isCurrent = false;
      window.clearInterval(timer);
    };
  }, []);

  const messages = {
    checking: "Checking local API status…",
    online: "Local API is available",
    offline: "Local API is unavailable. Retrying automatically…",
  };

  return (
    <p className={`api-status api-status-${status}`} role="status" aria-live="polite">
      <span className="api-status-dot" aria-hidden="true" />
      {messages[status]}
    </p>
  );
}
