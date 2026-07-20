import apiClient from './client';
import type { User } from '../types/auth';
import type { UserSettings } from '../types/settings';

export interface UpdateProfilePayload {
  email?: string;
  displayName?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const response = await apiClient.put<User>('users/me', payload);
  return response.data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await apiClient.post('users/me/password', payload);
}

export async function getSettings(): Promise<UserSettings> {
  const response = await apiClient.get<UserSettings>('users/me/settings');
  return response.data;
}

export async function saveSettings(settings: UserSettings): Promise<UserSettings> {
  const response = await apiClient.put<UserSettings>('users/me/settings', settings);
  return response.data;
}
