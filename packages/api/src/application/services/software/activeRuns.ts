export interface ActiveRunCounter {
  countActive(connectionId: string): Promise<number>;
}

export const NO_ACTIVE_RUNS: ActiveRunCounter = { countActive: async () => 0 };
