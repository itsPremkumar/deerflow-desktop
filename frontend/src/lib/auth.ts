import { get, send, asList, pick } from "./http";

export interface UserInfo {
  id: string;
  username: string;
  isAdmin: boolean;
}

export async function fetchMe(): Promise<UserInfo | null> {
  try {
    const d = await get<Record<string, unknown>>("/auth/me");
    const role = String(pick<string>(d, ["role"], ""));
    return {
      id: String(pick<string>(d, ["id", "user_id"], "")),
      username: String(pick<string>(d, ["username", "name", "email"], "user")),
      isAdmin: pick<boolean>(d, ["is_admin", "admin"], false) === true || role === "admin",
    };
  } catch {
    return null;
  }
}

export async function setupStatus(): Promise<{ initialized: boolean }> {
  try {
    const d = await get<Record<string, unknown>>("/auth/setup-status");
    return { initialized: Boolean(pick(d, ["initialized", "setup_complete"], true)) };
  } catch {
    return { initialized: true };
  }
}

export async function login(username: string, password: string): Promise<void> {
  await send("/auth/login/local", "POST", { username, password });
}

export async function register(username: string, password: string): Promise<void> {
  await send("/auth/register", "POST", { username, password });
}

export async function logout(): Promise<void> {
  try {
    await send("/auth/logout", "POST", {});
  } catch {
    /* best effort */
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await send("/auth/change-password", "POST", { old_password: oldPassword, new_password: newPassword });
}

export interface PatInfo {
  id: string;
  name: string;
  created_at: string;
}

export async function listPats(): Promise<PatInfo[]> {
  try {
    const d = await get<unknown>("/auth/pats");
    return asList(d, ["pats", "data"]).map((p, i) => ({
      id: String(pick(p, ["id", "pat_id"], `pat-${i}`)),
      name: String(pick(p, ["name", "label"], "token")),
      created_at: String(pick(p, ["created_at"], "")),
    }));
  } catch {
    return [];
  }
}

export async function createPat(name: string): Promise<string> {
  const d = await send<Record<string, unknown>>("/auth/pats", "POST", { name });
  return String(pick(d, ["token", "pat", "value"], ""));
}

export async function deletePat(id: string): Promise<void> {
  await send(`/auth/pats/${encodeURIComponent(id)}`, "DELETE");
}
