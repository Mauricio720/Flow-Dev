import type { SessionLauncher } from "../application/services/terminal/sessionLauncher";

export function lazyReviewLauncher(create: () => SessionLauncher): Pick<SessionLauncher, "launch"> {
  let launcher: SessionLauncher | null = null;
  return {
    launch: (input) => {
      launcher ??= create();
      return launcher.launch(input);
    },
  };
}
