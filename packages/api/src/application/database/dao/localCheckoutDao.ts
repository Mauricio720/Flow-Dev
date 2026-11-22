export type StoredLocalCheckout = { userId: string; projectId: string; path: string; verifiedAt: Date; version: number };

export type SaveLocalCheckoutInput = {
  userId: string;
  projectId: string;
  path: string;
  verifiedAt: Date;
  expectedVersion?: number;
};

export interface LocalCheckoutDao {
  find(userId: string, projectId: string): Promise<StoredLocalCheckout | null>;
  save(input: SaveLocalCheckoutInput): Promise<StoredLocalCheckout | null>;
  remove(userId: string, projectId: string): Promise<void>;
}
