export interface SpecAdmission {
  assertReady(): Promise<void>;
}

export const openAdmission: SpecAdmission = { assertReady: async () => undefined };
