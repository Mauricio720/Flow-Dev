import { z } from "zod";
import { isValidCursor } from "../application/pagination/cursor";

const cursor = z.string().max(200).refine(isValidCursor, "invalid_cursor").optional();

export const localMachineConfirmPairingSchema = z.object({ code: z.string().trim().min(6).max(64), requestKey: z.string().uuid() }).strict();
export const localMachinePairingPreviewSchema = z.object({ code: z.string().trim().min(6).max(64) }).strict();
export const localMachineListSchema = z.object({ cursor, limit: z.number().int().min(1).max(50).default(20) }).strict();
export const localMachineRevokeSchema = z.object({ machineId: z.string().uuid(), expectedRevision: z.number().int().positive(), requestKey: z.string().uuid() }).strict();
