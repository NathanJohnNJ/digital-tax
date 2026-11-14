import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { auth0 } from "@/lib/auth0";
import { HMRC_CONFIG } from "@/config/hmrc";
import { pool } from "@/lib/db";
import { ensureAppUser } from "@/lib/appUser";

const ACCESS_TOKEN_REFRESH_BUFFER_SECONDS = 60;
const ENCRYPTION_KEY_VERSION = "v1";

export type HmrcTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type HmrcAccessTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; status: number; error: string };

type EncryptedToken = {
  ciphertext: string;
  iv: string;
};

type HmrcTokenRow = {
  access_token_ciphertext: string;
  access_token_iv: string;
  refresh_token_ciphertext: string;
  refresh_token_iv: string;
  expires_at: Date;
  reauthorization_required: boolean;
  encryption_key_version: string;
};

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.HMRC_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) {
    throw new Error("HMRC_TOKEN_ENCRYPTION_KEY is not configured");
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new Error("HMRC_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }

  return key;
}

function encryptToken(token: string): EncryptedToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final(), cipher.getAuthTag()]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
  };
}

function decryptToken(ciphertext: string, iv: string, keyVersion: string): string {
  if (keyVersion !== ENCRYPTION_KEY_VERSION) {
    throw new Error(`Unsupported HMRC token encryption key version: ${keyVersion}`);
  }

  const encrypted = Buffer.from(ciphertext, "base64");
  if (encrypted.length <= 16) {
    throw new Error("Stored HMRC token ciphertext is invalid");
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(encrypted.subarray(encrypted.length - 16));
  return Buffer.concat([
    decipher.update(encrypted.subarray(0, encrypted.length - 16)),
    decipher.final(),
  ]).toString("utf8");
}

function isHmrcTokens(value: unknown): value is HmrcTokens {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const tokens = value as Record<string, unknown>;
  return typeof tokens.access_token === "string"
    && tokens.access_token.trim().length > 0
    && typeof tokens.refresh_token === "string"
    && tokens.refresh_token.trim().length > 0
    && typeof tokens.expires_in === "number"
    && Number.isSafeInteger(tokens.expires_in)
    && tokens.expires_in > 0;
}

async function readHmrcResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getOAuthErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const value = body as Record<string, unknown>;
  if (typeof value.error === "string") return value.error;
  if (typeof value.code === "string") return value.code;
  return undefined;
}

export async function saveHmrcTokens(userId: string, tokens: HmrcTokens): Promise<void> {
  const accessToken = encryptToken(tokens.access_token);
  const refreshToken = encryptToken(tokens.refresh_token);

  await pool.query(
    `
      INSERT INTO public.hmrc_user_tokens (
        user_id,
        access_token_ciphertext,
        access_token_iv,
        refresh_token_ciphertext,
        refresh_token_iv,
        encryption_key_version,
        expires_at,
        reauthorization_required,
        authorized_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 * interval '1 second'), false, now(), now())
      ON CONFLICT (user_id) DO UPDATE
      SET access_token_ciphertext = EXCLUDED.access_token_ciphertext,
          access_token_iv = EXCLUDED.access_token_iv,
          refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
          refresh_token_iv = EXCLUDED.refresh_token_iv,
          encryption_key_version = EXCLUDED.encryption_key_version,
          expires_at = EXCLUDED.expires_at,
          reauthorization_required = false,
          authorized_at = now(),
          updated_at = now()
    `,
    [
      userId,
      accessToken.ciphertext,
      accessToken.iv,
      refreshToken.ciphertext,
      refreshToken.iv,
      ENCRYPTION_KEY_VERSION,
      tokens.expires_in,
    ],
  );
}

async function refreshHmrcTokens(
  userId: string,
  forceRefresh: boolean,
): Promise<HmrcAccessTokenResult> {
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const result = await client.query<HmrcTokenRow>(
      `
        SELECT access_token_ciphertext, access_token_iv,
               refresh_token_ciphertext, refresh_token_iv,
               expires_at, reauthorization_required, encryption_key_version
        FROM public.hmrc_user_tokens
        WHERE user_id = $1
        FOR UPDATE
      `,
      [userId],
    );
    const stored = result.rows[0];

    if (!stored || stored.reauthorization_required) {
      await client.query("COMMIT");
      transactionOpen = false;
      return {
        ok: false,
        status: 401,
        error: "HMRC authorisation is missing or needs renewing. Please link your HMRC account.",
      };
    }

    const accessExpiresAt = new Date(stored.expires_at).getTime();
    const shouldRefresh = forceRefresh
      || accessExpiresAt <= Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_SECONDS * 1000;

    if (!shouldRefresh) {
      const accessToken = decryptToken(
        stored.access_token_ciphertext,
        stored.access_token_iv,
        stored.encryption_key_version,
      );
      await client.query("COMMIT");
      transactionOpen = false;
      return { ok: true, accessToken };
    }

    const refreshToken = decryptToken(
      stored.refresh_token_ciphertext,
      stored.refresh_token_iv,
      stored.encryption_key_version,
    );
    let response: Response;
    try {
      response = await fetch(`${HMRC_CONFIG.testApiUrl}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: HMRC_CONFIG.clientId,
          client_secret: HMRC_CONFIG.clientSecret,
        }),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch (error) {
      console.error("HMRC token refresh request could not be completed", {
        userId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      await client.query("ROLLBACK");
      transactionOpen = false;
      return { ok: false, status: 502, error: "Unable to reach HMRC to refresh your authorisation." };
    }

    let body: unknown;
    try {
      body = await readHmrcResponse(response);
    } catch (error) {
      console.error("HMRC token refresh response could not be read", {
        userId,
        status: response.status,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      await client.query("ROLLBACK");
      transactionOpen = false;
      return { ok: false, status: 502, error: "Unable to read HMRC's token refresh response." };
    }

    if (!response.ok) {
      const errorCode = getOAuthErrorCode(body);
      console.error("HMRC token refresh failed", { userId, status: response.status, errorCode });
      if (errorCode === "invalid_grant") {
        await client.query(
          `
            UPDATE public.hmrc_user_tokens
            SET reauthorization_required = true, updated_at = now()
            WHERE user_id = $1
          `,
          [userId],
        );
        await client.query("COMMIT");
        transactionOpen = false;
        return {
          ok: false,
          status: 401,
          error: "HMRC authorisation has expired. Please link your HMRC account again.",
        };
      }

      await client.query("ROLLBACK");
      transactionOpen = false;
      return { ok: false, status: 502, error: "HMRC could not refresh your authorisation." };
    }

    if (!isHmrcTokens(body)) {
      console.error("HMRC token refresh returned an invalid token response", {
        userId,
        status: response.status,
      });
      await client.query("ROLLBACK");
      transactionOpen = false;
      return { ok: false, status: 502, error: "HMRC returned an invalid token response." };
    }

    const accessToken = encryptToken(body.access_token);
    const replacementRefreshToken = encryptToken(body.refresh_token);
    await client.query(
      `
        UPDATE public.hmrc_user_tokens
        SET access_token_ciphertext = $2,
            access_token_iv = $3,
            refresh_token_ciphertext = $4,
            refresh_token_iv = $5,
            encryption_key_version = $6,
            expires_at = now() + ($7 * interval '1 second'),
            reauthorization_required = false,
            updated_at = now()
        WHERE user_id = $1
      `,
      [
        userId,
        accessToken.ciphertext,
        accessToken.iv,
        replacementRefreshToken.ciphertext,
        replacementRefreshToken.iv,
        ENCRYPTION_KEY_VERSION,
        body.expires_in,
      ],
    );

    await client.query("COMMIT");
    transactionOpen = false;
    return { ok: true, accessToken: body.access_token };
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK");
    }
    console.error("Unable to load or update stored HMRC authorisation", {
      userId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false, status: 500, error: "Unable to access your stored HMRC authorisation." };
  } finally {
    client.release();
  }
}

export async function getCurrentHmrcAccessToken(
  options: { forceRefresh?: boolean } = {},
): Promise<HmrcAccessTokenResult> {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.sub) {
      return { ok: false, status: 401, error: "Sign in before using your HMRC account." };
    }

    const user = await ensureAppUser(session.user);
    return await refreshHmrcTokens(user.id, options.forceRefresh ?? false);
  } catch (error) {
    console.error("Unable to resolve the signed-in user for HMRC authorisation", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false, status: 500, error: "Unable to load your HMRC authorisation." };
  }
}

export async function hasHmrcAuthorization(userId: string): Promise<boolean> {
  const result = await pool.query<{ reauthorization_required: boolean }>(
    `
      SELECT reauthorization_required
      FROM public.hmrc_user_tokens
      WHERE user_id = $1
    `,
    [userId],
  );
  return result.rows[0]?.reauthorization_required === false;
}

export async function markCurrentHmrcAuthorizationRequired(): Promise<void> {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.sub) return;

    await pool.query(
      `
        UPDATE public.hmrc_user_tokens
        SET reauthorization_required = true, updated_at = now()
        WHERE user_id = (
          SELECT id FROM public.users WHERE auth_id = $1
        )
      `,
      [session.user.sub],
    );
  } catch (error) {
    console.error("Unable to mark the HMRC connection as requiring reauthorization", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
