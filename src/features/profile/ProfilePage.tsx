import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sun, Moon, UserCircle, KeyRound, Palette } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { updateProfile, changePassword } from '../../api/users';

const accountSchema = z.object({
  email: z.string().email('Invalid email').or(z.literal('')),
  displayName: z.string().max(60),
});
type AccountValues = z.infer<typeof accountSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type PasswordValues = z.infer<typeof passwordSchema>;

const inputClass = 'block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

function Card({ icon: Icon, title, children }: { icon: typeof Sun; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-indigo-500" />
        <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useSettings();

  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [accountErr, setAccountErr] = useState<string | null>(null);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const accountForm = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: user?.email ?? '', displayName: user?.displayName ?? '' },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onAccountSubmit = async (data: AccountValues) => {
    setAccountMsg(null);
    setAccountErr(null);
    try {
      await updateProfile({ email: data.email, displayName: data.displayName });
      await refreshUser();
      setAccountMsg('Saved.');
      setTimeout(() => setAccountMsg(null), 2500);
    } catch (e) {
      setAccountErr((e as Error).message);
    }
  };

  const onPasswordSubmit = async (data: PasswordValues) => {
    setPwMsg(null);
    setPwErr(null);
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      passwordForm.reset();
      setPwMsg('Password changed.');
      setTimeout(() => setPwMsg(null), 2500);
    } catch (e) {
      const err = e as { response?: { status?: number } };
      setPwErr(err.response?.status === 400
        ? 'Current password is incorrect (or new password too short).'
        : (e as Error).message);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Card icon={UserCircle} title="Account">
        <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
          <div>
            <label className={labelClass}>Username</label>
            <input value={user?.username ?? ''} disabled
              className="block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed" />
            {memberSince && (
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Member since {memberSince}</p>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Display Name</label>
              <input {...accountForm.register('displayName')} placeholder="How the app greets you" className={inputClass} />
              {accountForm.formState.errors.displayName && (
                <p className="mt-1 text-xs text-red-600">{accountForm.formState.errors.displayName.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input {...accountForm.register('email')} placeholder="you@example.com" className={inputClass} />
              {accountForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">{accountForm.formState.errors.email.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {accountMsg && <span className="text-[12px] text-emerald-600 dark:text-emerald-400">{accountMsg}</span>}
            {accountErr && <span className="text-[12px] text-red-600 dark:text-red-400">{accountErr}</span>}
            <button type="submit" disabled={accountForm.formState.isSubmitting}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
              {accountForm.formState.isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Card>

      <Card icon={KeyRound} title="Security">
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          <div>
            <label className={labelClass}>Current Password</label>
            <input type="password" autoComplete="current-password" {...passwordForm.register('currentPassword')} className={inputClass} />
            {passwordForm.formState.errors.currentPassword && (
              <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>New Password</label>
              <input type="password" autoComplete="new-password" {...passwordForm.register('newPassword')} className={inputClass} />
              {passwordForm.formState.errors.newPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Confirm New Password</label>
              <input type="password" autoComplete="new-password" {...passwordForm.register('confirmPassword')} className={inputClass} />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {pwMsg && <span className="text-[12px] text-emerald-600 dark:text-emerald-400">{pwMsg}</span>}
            {pwErr && <span className="text-[12px] text-red-600 dark:text-red-400">{pwErr}</span>}
            <button type="submit" disabled={passwordForm.formState.isSubmitting}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
              {passwordForm.formState.isSubmitting ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </form>
      </Card>

      <Card icon={Palette} title="Appearance">
        <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3">
          Saved to your account — follows you across browsers and devices.
        </p>
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-0.5">
          <button
            onClick={() => setTheme('light')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-semibold transition-colors ${
              theme === 'light' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Sun className="h-3.5 w-3.5" /> Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-semibold transition-colors ${
              theme === 'dark' ? 'bg-slate-700 shadow-sm text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Moon className="h-3.5 w-3.5" /> Dark
          </button>
        </div>
      </Card>
    </div>
  );
}
