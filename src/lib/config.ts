export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Each portal keeps its own session so an admin and a collector can be signed
// in at the same time in different tabs without overwriting each other.
export const ADMIN_TOKEN_KEY = "ecotrack_admin_token";
export const COLLECTOR_TOKEN_KEY = "ecotrack_collector_token";
