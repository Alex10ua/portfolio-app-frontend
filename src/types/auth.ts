export interface User {
  id: number;
  username: string;
  email: string;
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
