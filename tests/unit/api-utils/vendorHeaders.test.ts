import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildVendorForwardedHeader } from '../../../app/api/utils/buildVendorForwarded';
import { buildVendorLicenseIDs } from '../../../app/api/utils/buildVendorLicenseIDs';
import { buildVendorVersion } from '../../../app/api/utils/buildVendorVersion';
import { percentEncode } from '../../../app/api/utils/percentEncode';

describe('HMRC vendor header helpers', () => {
  it('percent-encodes values', () => {
    expect(percentEncode('Digital Tax/UK')).toBe('Digital%20Tax%2FUK');
  });

  it('builds forwarded hops in order', () => {
    expect(buildVendorForwardedHeader('198.51.100.5', ['203.0.113.1', '203.0.113.2']))
      .toBe('by=203.0.113.1&for=198.51.100.5,by=203.0.113.2&for=203.0.113.1');
  });

  it('returns an empty forwarded header without a client IP or hops', () => {
    expect(buildVendorForwardedHeader('', ['203.0.113.1'])).toBe('');
    expect(buildVendorForwardedHeader('198.51.100.5', [])).toBe('');
  });

  it('hashes and formats vendor license identifiers', () => {
    const digest = createHash('sha256').update('test-license-key').digest('hex').toUpperCase();
    expect(buildVendorLicenseIDs([{ name: 'Digital Tax', key: 'test-license-key' }]))
      .toBe(`Digital%20Tax=${digest}`);
    expect(buildVendorLicenseIDs([])).toBe('');
  });

  it('formats the vendor version with the app version', () => {
    expect(buildVendorVersion('Digital Tax')).toMatch(/^Digital%20Tax=\d+\.\d+\.\d+/);
    expect(buildVendorVersion('')).toBe('');
  });
});