import { HMRC_CONFIG } from "@/config/hmrc";
import { percentEncode } from '../../../utils/percentEncode';

export async function GET() {
  const url = new URL(`${HMRC_CONFIG.testAuthUrl}/authorize`);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", HMRC_CONFIG.clientId);
  url.searchParams.set("scope", percentEncode("read:self-assessment write:self-assessment read:vat read:business-details"));
  url.searchParams.set("redirect_uri", HMRC_CONFIG.redirectUri);

  return Response.redirect(url.toString());
}

