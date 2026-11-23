import { hostname, userInfo } from "node:os";

export function machineIdentity(): string {
  return `${hostname()}:${userInfo().username}`;
}
