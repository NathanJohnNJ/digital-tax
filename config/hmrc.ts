export const HMRC_CONFIG = {
  clientId: process.env.HMRC_CLIENT_ID!,
  clientSecret: process.env.HMRC_CLIENT_SECRET!,
  redirectUri: process.env.HMRC_REDIRECT_URI!,
  baseAuthUrl: "https://api.service.hmrc.gov.uk/oauth",
  baseApiUrl: "https://api.service.hmrc.gov.uk",
  testApiUrl: "https://test-api.service.hmrc.gov.uk",
  testAuthUrl: "https://test-www.tax.service.gov.uk/oauth",
  testTokenUrl: "https://test-api.service.hmrc.gov.uk/oauth/token"
};
