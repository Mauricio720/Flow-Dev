export type Cursor = { key: string; id?: string };

const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function encodeBase64Url(value: string) {
  const utf8 = encodeURIComponent(value).replace(/%([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  let encoded = "";
  for (let index = 0; index < utf8.length; index += 3) {
    const first = utf8.charCodeAt(index);
    const second = index + 1 < utf8.length ? utf8.charCodeAt(index + 1) : 0;
    const third = index + 2 < utf8.length ? utf8.charCodeAt(index + 2) : 0;
    encoded += BASE64URL_ALPHABET[first >> 2];
    encoded += BASE64URL_ALPHABET[((first & 3) << 4) | (second >> 4)];
    if (index + 1 < utf8.length) encoded += BASE64URL_ALPHABET[((second & 15) << 2) | (third >> 6)];
    if (index + 2 < utf8.length) encoded += BASE64URL_ALPHABET[third & 63];
  }
  return encoded;
}

function decodeBase64Url(value: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) return null;
  let bits = 0;
  let bitCount = 0;
  let encodedUtf8 = "";
  for (const character of value) {
    bits = (bits << 6) | BASE64URL_ALPHABET.indexOf(character);
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      encodedUtf8 += `%${((bits >> bitCount) & 255).toString(16).padStart(2, "0")}`;
    }
  }
  if (bitCount && (bits & ((1 << bitCount) - 1)) !== 0) return null;
  try {
    return decodeURIComponent(encodedUtf8);
  } catch {
    return null;
  }
}

export function encodeCursor(cursor: Cursor) {
  return encodeBase64Url(JSON.stringify(cursor));
}

export function decodeCursor(value: string | undefined): Cursor | null {
  if (!value) return null;
  try {
    const decoded = decodeBase64Url(value);
    if (decoded === null) return null;
    const parsed = JSON.parse(decoded) as Cursor;
    if (!parsed || typeof parsed.key !== "string" || !parsed.key || (parsed.id !== undefined && typeof parsed.id !== "string")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isValidCursor(value: string) {
  return decodeCursor(value) !== null;
}

const FIRST_REPOSITORY_PAGE = 1;
const LAST_REPOSITORY_PAGE = 1000;

export function decodeRepositoryPage(value: string | undefined) {
  if (!value) return FIRST_REPOSITORY_PAGE;
  const decoded = decodeBase64Url(value);
  if (decoded === null) return null;
  const page = Number(decoded);
  return Number.isInteger(page) && page >= FIRST_REPOSITORY_PAGE && page <= LAST_REPOSITORY_PAGE ? page : null;
}

export function isRepositoryPageCursor(value: string) {
  return decodeRepositoryPage(value) !== null;
}

export function isProjectCursor(value: string | undefined) {
  const cursor = decodeCursor(value);
  return !!cursor && !!cursor.id && !Number.isNaN(Date.parse(cursor.key));
}
