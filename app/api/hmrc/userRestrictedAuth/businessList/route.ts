import { HMRC_CONFIG } from '@/config/hmrc';
import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentHmrcAccessToken,
  markCurrentHmrcAuthorizationRequired,
} from '@/lib/hmrcTokens';
import { getAuthenticatedAppUser } from '@/lib/appUser';
import { pool } from '@/lib/db';
import { buildFraudPreventionHeaders } from '../../../utils/buildFraudPreventionHeaders';
import { isFraudClientData } from '../../../utils/hmrcFraudValidation';
import {
  forwardValidatedHmrcResponse,
  isBusinessListResponse,
  isRecord,
  isValidNino,
  readJsonRecord,
} from '../../../utils/hmrcValidation';

export async function POST(request: NextRequest) {
  const parsed = await readJsonRecord(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { clientData, nino } = parsed.value;
  if (!isValidNino(nino)) {
    return NextResponse.json({ error: 'A valid National Insurance number is required' }, { status: 400 });
  }
  if (!isFraudClientData(clientData)) {
    return NextResponse.json({ error: 'Client fraud-prevention data is invalid' }, { status: 400 });
  }

  try {
    const user = await getAuthenticatedAppUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const account = await pool.query<{ ni_number: string | null }>(
      'SELECT ni_number FROM public.users WHERE id = $1',
      [user.id],
    );
    if (!account.rows[0] || !isValidNino(account.rows[0].ni_number)) {
      return NextResponse.json({ error: 'Save a valid National Insurance number to your account first' }, { status: 400 });
    }
    if (account.rows[0].ni_number !== nino) {
      return NextResponse.json({ error: 'The National Insurance number does not match your account' }, { status: 400 });
    }
    const verifiedNino = account.rows[0].ni_number;

    const fraudPreventionHeaders = await buildFraudPreventionHeaders(clientData, request);
    const tokenResult = await getCurrentHmrcAccessToken();
    if (!tokenResult.ok) {
      return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status });
    }
    const token = tokenResult.accessToken;

    const hmrcResponse = await fetch(
      `${HMRC_CONFIG.testApiUrl}/individuals/business/details/${encodeURIComponent(verifiedNino)}/list`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.hmrc.2.0+json',
          Authorization: `Bearer ${token}`,
          ...fraudPreventionHeaders,
        },
      },
    );

    if (hmrcResponse.ok) {
      const body: unknown = await hmrcResponse.clone().json().catch(() => undefined);
      if (isBusinessListResponse(body)) {
        const businesses = body.listOfBusinesses
          .filter((business) =>
            business.typeOfBusiness === 'self-employment'
            || business.typeOfBusiness === 'uk-property'
            || business.typeOfBusiness === 'foreign-property',
          )
          .map((business) => ({
            businessId: business.businessId,
            typeOfBusiness: business.typeOfBusiness,
            tradingName: typeof business.tradingName === 'string' ? business.tradingName : null,
          }));

        try {
          await pool.query(
            `
              WITH businesses AS MATERIALIZED (
                SELECT "businessId" AS business_id,
                       "typeOfBusiness" AS type_of_business,
                       "tradingName" AS trading_name
                FROM jsonb_to_recordset($2::jsonb) AS item(
                  "businessId" text,
                  "typeOfBusiness" text,
                  "tradingName" text
                )
              ),
              upserted AS (
                INSERT INTO public.record_businesses
                  (user_id, hmrc_business_id, type_of_business, trading_name)
                SELECT $1, business_id, type_of_business, trading_name
                FROM businesses
                ON CONFLICT (user_id, hmrc_business_id)
                DO UPDATE SET
                  type_of_business = EXCLUDED.type_of_business,
                  trading_name = EXCLUDED.trading_name,
                  is_active = true,
                  last_synced_at = now(),
                  updated_at = now()
                RETURNING id
              )
              UPDATE public.record_businesses existing
              SET is_active = false, updated_at = now()
              WHERE existing.user_id = $1
                AND existing.is_active = true
                AND NOT EXISTS (
                  SELECT 1
                  FROM businesses
                  WHERE businesses.business_id = existing.hmrc_business_id
                )
            `,
            [user.id, JSON.stringify(businesses)],
          );
        } catch (error) {
          console.error('Verified HMRC businesses could not be synchronized', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
          });
          return NextResponse.json(
            { error: 'Unable to synchronize your HMRC businesses. Please try again later.' },
            { status: 503 },
          );
        }
      }
    }

    return forwardValidatedHmrcResponse(
      hmrcResponse,
      'business list request',
      isBusinessListResponse,
      [verifiedNino],
      200,
      markCurrentHmrcAuthorizationRequired,
    );
  } catch (error) {
    console.error('HMRC business list request could not be completed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'Unable to retrieve businesses from HMRC. Please try again later.' },
      { status: 502 },
    );
  }
}
