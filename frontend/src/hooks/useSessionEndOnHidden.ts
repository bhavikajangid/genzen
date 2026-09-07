"use client";

import * as React from "react";

/** Fires `onHidden` synchronously the instant the tab is hidden, with no grace period, while `active`. */
export function useSessionEndOnHidden(active: boolean, onHidden: () => void) {
  const onHiddenRef = React.useRef(onHidden);
  onHiddenRef.current = onHidden;

  React.useEffect(() => {
    if (!active) return;

    const handleVisibility = () => {
      if (document.hidden) onHiddenRef.current();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [active]);
}
