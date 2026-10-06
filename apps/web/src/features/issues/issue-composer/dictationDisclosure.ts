const DISCLOSURE_KEY = "flow-dev:dictation-disclosure";
const ACCEPTED = "accepted";

export function disclosureAccepted() {
  try {
    return window.localStorage.getItem(DISCLOSURE_KEY) === ACCEPTED;
  } catch {
    return false;
  }
}

export function acceptDisclosure() {
  try {
    window.localStorage.setItem(DISCLOSURE_KEY, ACCEPTED);
  } catch {}
}
