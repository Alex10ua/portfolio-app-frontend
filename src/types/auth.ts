export interface User {
  username: string;
  email: string | null;
  displayName: string | null;
  createdAt: string | null;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  passwordHash: string;
}
