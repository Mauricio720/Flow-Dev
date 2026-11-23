const SETTLE_POLL_MS = 5;
const SETTLE_MAX_POLLS = 400;

export async function pollUntil(done: () => boolean) {
  for (let poll = 0; poll < SETTLE_MAX_POLLS && !done(); poll += 1) await new Promise((resolve) => setTimeout(resolve, SETTLE_POLL_MS));
}
