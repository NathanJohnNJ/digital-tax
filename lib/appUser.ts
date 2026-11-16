import { auth0 } from "@/lib/auth0";
import { pool } from "@/lib/db";

type AuthenticatedUser = {
  sub?: string;
  email?: string;
  name?: string;
};

export async function ensureAppUser(user: AuthenticatedUser): Promise<{ id: string }> {
  if (!user.sub) {
    throw new Error("Authenticated user is missing an Auth0 subject");
  }

  const name = user.name?.trim() || user.email?.trim() || user.sub;
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO public.users (auth_id, email, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (auth_id) DO UPDATE
      SET email = COALESCE(EXCLUDED.email, public.users.email),
          name = EXCLUDED.name,
          updated_at = now()
      RETURNING id
    `,
    [user.sub, user.email || null, name],
  );

  const appUser = result.rows[0];
  if (!appUser) {
    throw new Error("Database did not return the authenticated user");
  }

  return appUser;
}

export async function getAuthenticatedAppUser(): Promise<{ id: string } | null> {
  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    return null;
  }

  return ensureAppUser(session.user);
}
