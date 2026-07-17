'use client';

import { useState, type ReactNode } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { useT } from '@/lib/useT';
import { signIn, signUp, type AuthFormState } from './actions';

const INITIAL: AuthFormState = { error: null };

function SubmitButton({ label, icon }: { label: string; icon: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-primary"
      disabled={pending}
      style={{ width: '100%', justifyContent: 'center' }}
    >
      {icon} {pending ? '…' : label}
    </button>
  );
}

export function LoginClient({ next }: { next: string }) {
  const t = useT();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [signInState, signInAction] = useFormState(signIn, INITIAL);
  const [signUpState, signUpAction] = useFormState(signUp, INITIAL);
  const state = mode === 'signin' ? signInState : signUpState;

  return (
    <div className="page-wrap anim-up" style={{ maxWidth: 460 }}>
      <div className="page-head">
        <h1>{t('login_title')}</h1>
        <p>{t('login_sub')}</p>
      </div>

      <div className="card anim-up">
        <div className="segmented" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={'seg' + (mode === 'signin' ? ' on' : '')}
            onClick={() => setMode('signin')}
            aria-pressed={mode === 'signin'}
          >
            {t('login_tab_signin')}
          </button>
          <button
            type="button"
            className={'seg' + (mode === 'signup' ? ' on' : '')}
            onClick={() => setMode('signup')}
            aria-pressed={mode === 'signup'}
          >
            {t('login_tab_signup')}
          </button>
        </div>

        <form action={mode === 'signin' ? signInAction : signUpAction} className="stack" style={{ gap: 10 }}>
          <input type="hidden" name="next" value={next} />
          <input
            className="input"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder={t('login_email_ph')}
            aria-label={t('login_email_ph')}
          />
          <input
            className="input"
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder={t('login_password_ph')}
            aria-label={t('login_password_ph')}
          />
          {state.error && (
            <p role="alert" style={{ margin: 0, color: 'var(--error)', fontSize: 13 }}>
              {t(state.error)}
            </p>
          )}
          <SubmitButton
            label={mode === 'signin' ? t('login_btn_signin') : t('login_btn_signup')}
            icon={mode === 'signin' ? <LogIn /> : <UserPlus />}
          />
        </form>
      </div>
    </div>
  );
}
