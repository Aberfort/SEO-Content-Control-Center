import type { AppUser } from "./types";

export type AuthContext = {
  user: AppUser;
};

const defaultDevUser: AppUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "owner@example.com",
  name: "Dev Owner"
};

export async function requireCurrentUser(): Promise<AuthContext> {
  return {
    user: {
      id: process.env.SCCC_DEV_USER_ID ?? defaultDevUser.id,
      email: process.env.SCCC_DEV_USER_EMAIL ?? defaultDevUser.email,
      name: process.env.SCCC_DEV_USER_NAME ?? defaultDevUser.name
    }
  };
}
