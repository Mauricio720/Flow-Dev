import { z } from "zod";

const availabilityState = z.enum(["available_live", "available_stale", "unavailable_live", "unavailable_stale", "unknown"]);

const modelRow = z.object({
  provider_id: z.string().min(1),
  model_id: z.string().min(1),
  display_name: z.string().optional(),
  reasoning_efforts: z.array(z.string().min(1)).nullish(),
  availability_state: availabilityState,
  stale: z.boolean().optional(),
  hidden: z.boolean().optional(),
  deprecated: z.boolean().optional(),
});

export const modelListSchema = z.object({ models: z.array(modelRow) });

export const providerProbeSchema = z.object({ auth_status: z.object({ state: z.string().min(1) }) });

export type CompozyModelRow = z.infer<typeof modelRow>;

export const providerOverlaySchema = z.unknown();
