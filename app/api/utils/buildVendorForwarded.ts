import { percentEncode } from "./percentEncode";

/**
 * Build the Gov-Vendor-Forwarded header according to HMRC rules.
 *
 * @param clientPublicIP - The public IP of the client (from browser)
 * @param hops - Array of public IPs representing each hop in order
 */
export function buildVendorForwardedHeader(
  clientPublicIP: string,
  hops: string[]
): string {
  if (!clientPublicIP || hops.length === 0) {
    return "";
  }

  const encodedClientIP = percentEncode(clientPublicIP);

  const parts: string[] = [];

  // First hop: by = first hop IP, for = client IP
  const firstHopBy = percentEncode(hops[0]);
  parts.push(`by=${firstHopBy}&for=${encodedClientIP}`);

  // Subsequent hops
  for (let i = 1; i < hops.length; i++) {
    const by = percentEncode(hops[i]);
    const forIP = percentEncode(hops[i - 1]); // previous hop becomes "for"
    parts.push(`by=${by}&for=${forIP}`);
  }

  return parts.join(",");
}
