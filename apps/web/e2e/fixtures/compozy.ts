import { test as projectTest } from "./index";
import { COMPOZY_SKIP_REASON, e2eCompozyUrl } from "./environment";
import { startFakeCompozy, type FakeCompozyControl } from "./compozyDaemon";
import { disposableCheckout, type GitCheckout } from "./gitCheckout";

type CompozyFixtures = { fakeCompozy: FakeCompozyControl; checkoutFor: (repository: string) => Promise<GitCheckout> };

export const test = projectTest.extend<CompozyFixtures>({
  fakeCompozy: [async ({}, provide) => {
    projectTest.skip(!e2eCompozyUrl, COMPOZY_SKIP_REASON);
    const { stop, control } = await startFakeCompozy(e2eCompozyUrl ?? "");
    try { await provide(control); } finally { await stop(); }
  }, { auto: true }],
  checkoutFor: async ({}, provide) => {
    const removals: (() => Promise<void>)[] = [];
    await provide(async (repository) => {
      const { checkout, remove } = await disposableCheckout(repository);
      removals.push(remove);
      return checkout;
    });
    await Promise.all(removals.map((remove) => remove()));
  },
});

export { expect } from "./index";
