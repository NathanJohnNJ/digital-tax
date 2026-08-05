import crypto from "crypto";
import { percentEncode } from "./percentEncode";

/**
 * Build the Gov-Vendor-License-IDs header.
 *
 * @param licenses - Array of { name: string, key: string }
 */
export function buildVendorLicenseIDs(
  licenses: { name: string; key: string }[]
): string {
  if (!licenses || licenses.length === 0) {
    return "";
  }

  function hashLicense(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
  }

  const parts = licenses.map(({ name, key }) => {
    const encodedName = percentEncode(name);
    const hashed = hashLicense(key);
    const encodedHash = percentEncode(hashed);
    return `${encodedName}=${encodedHash}`;
  });

  return parts.join("&");
}

