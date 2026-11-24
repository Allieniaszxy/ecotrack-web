// Admin feedback is stored by the API as a status-history note with this prefix.
export const FEEDBACK_PREFIX = "__feedback__:";

export type Feedback = { from: string; message: string };

export function parseFeedback(note: string | null | undefined): Feedback | null {
  if (!note || !note.startsWith(FEEDBACK_PREFIX)) return null;

  try {
    const parsed = JSON.parse(note.slice(FEEDBACK_PREFIX.length)) as Partial<Feedback>;

    if (typeof parsed.message === "string" && typeof parsed.from === "string") {
      return { from: parsed.from, message: parsed.message };
    }
  } catch {
    // Malformed note: treat as ordinary text.
  }

  return null;
}
