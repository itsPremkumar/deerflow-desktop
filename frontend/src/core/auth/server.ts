import { AUTH_DISABLED_USER } from "./auth-disabled-user";
import { type AuthResult } from "./types";

/**
 * Direct chat AI agent execution mode:
 * Always returns the default authenticated administrator user profile.
 * Login screens and password workflows are completely bypassed.
 */
export async function getServerSideUser(): Promise<AuthResult> {
  return {
    tag: "authenticated",
    user: AUTH_DISABLED_USER,
  };
}
