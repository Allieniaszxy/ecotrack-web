"use client";

import { useEffect, useState } from "react";

/** Current time in ms, refreshed on an interval so "5s ago" labels stay live. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
