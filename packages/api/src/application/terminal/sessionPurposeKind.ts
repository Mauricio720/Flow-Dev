export const SESSION_PURPOSES = ["route", "generate_tasks", "plan_item", "review", "review_execute"] as const;

export type SessionPurposeKind = (typeof SESSION_PURPOSES)[number];
