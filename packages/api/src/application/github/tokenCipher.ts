import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { CredentialUnavailableError } from "./repositoryErrors";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class TokenCipher {
  private readonly key: Buffer;
  constructor(value: string) { this.key = parseKey(value); }
  encrypt(value: string) {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
  }
  decrypt(value: string) {
    try {
      const [version, iv, tag, ciphertext] = value.split(".");
      if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Invalid ciphertext");
      const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(iv, "base64url"));
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
    } catch (error) { throw new CredentialUnavailableError("Credential could not be decrypted", { cause: error } as Error); }
  }
}

function parseKey(value: string) {
  const key = Buffer.from(value, "base64url").length === KEY_BYTES ? Buffer.from(value, "base64url") : Buffer.from(value, "hex");
  if (key.length !== KEY_BYTES) throw new Error("GITHUB_REPOSITORY_TOKEN_KEY must contain 32 bytes");
  return key;
}
