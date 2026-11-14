SELECT to_regclass('public.hmrc_user_tokens') AS table_name;

SELECT relrowsecurity
FROM pg_class
WHERE oid = 'public.hmrc_user_tokens'::regclass;

SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'hmrc_user_tokens'
ORDER BY grantee, privilege_type;