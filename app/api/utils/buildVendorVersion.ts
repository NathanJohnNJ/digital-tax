import { percentEncode } from "./percentEncode";
import packageJson from '../../../package.json';

export function buildVendorVersion(appName: string): string {
  if (!appName) return "";

  const encodedName = percentEncode(appName);
  const encodedVersion = percentEncode(packageJson.version);

  return `${encodedName}=${encodedVersion}`;
}
