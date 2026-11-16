-- Historical reference only. The active baseline already creates this table.
CREATE TABLE public.hmrc_user_tokens (
  user_id bigint PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  access_token_ciphertext text NOT NULL,
  access_token_iv text NOT NULL,
  refresh_token_ciphertext text NOT NULL,
  refresh_token_iv text NOT NULL,
  encryption_key_version text NOT NULL DEFAULT 'v1',
  expires_at timestamptz NOT NULL,
  authorized_at timestamptz NOT NULL DEFAULT now(),
  reauthorization_required boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hmrc_user_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.hmrc_user_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hmrc_user_tokens TO service_role;
