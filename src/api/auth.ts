import apiClient, { authAxios } from './client';
import type { User, RegisterPayload } from '../types/auth';

export async function login(username: string, password: string): Promise<void> {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  try {
    await authAxios.post('/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch (error: unknown) {
    const err = error as { response?: { status: number } };
    if (err.response?.status === 401) throw new Error('Invalid credentials');
    throw error;
  }
}

export async function logout(): Promise<void> {
  await authAxios.post('/logout');
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>('/users/me');
  return response.data;
}

export async function register(payload: RegisterPayload): Promise<User> {
  const response = await apiClient.post<User>('/users/createUser', payload);
  return response.data;
}
