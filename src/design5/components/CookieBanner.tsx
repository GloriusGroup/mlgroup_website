import React, { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";

export function CookieBanner({ analyticsEnabled }: { analyticsEnabled: boolean }) {
  const posthog = usePostHog();
  const [visible, setVisible] = useState(() => {
    if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return false;
    return !localStorage.getItem("analytics_consent");
  });

  useEffect(() => {
    const consent = localStorage.getItem("analytics_consent");
    if (consent === "accepted" && posthog) {
      posthog.opt_in_capturing();
    }
  }, [posthog]);

  if (!visible || !analyticsEnabled) return null;

  const accept = () => {
    localStorage.setItem("analytics_consent", "accepted");
    posthog?.opt_in_capturing();
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("analytics_consent", "declined");
    posthog?.opt_out_capturing();
    setVisible(false);
  };

  return (
    <div className="cookie-banner">
      <p>
        We use cookies for anonymous usage statistics.{" "}
        <a href="https://www.uni-muenster.de/datenschutz/en/" target="_blank" rel="noopener noreferrer">
          Privacy&nbsp;Statement
        </a>
      </p>
      <div className="cookie-banner__actions">
        <button onClick={decline}>Decline</button>
        <button className="cookie-banner__accept" onClick={accept}>Accept</button>
      </div>
    </div>
  );
}
