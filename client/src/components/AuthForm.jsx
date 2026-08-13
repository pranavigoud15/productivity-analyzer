import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaEnvelope,
  FaLock,
  FaUser,
  FaEye,
  FaEyeSlash,
} from 'react-icons/fa';
import { Sparkles } from 'lucide-react';
import API from '../services/api';
import ThemeToggle from './ui/ThemeToggle';

const REMEMBER_KEY = 'pa-remember-email';

function AuthForm({ title }) {
  const isLogin = title === 'Login';
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(
    () => Boolean(localStorage.getItem(REMEMBER_KEY)),
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!isLogin) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        const res = await API.post('/auth/signup', { name, email, password });
        alert(res.data.message);
        navigate('/');
      } else {
        const res = await API.post('/auth/login', { email, password });

        localStorage.setItem('token', res.data.token);
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }

        if (rememberMe) {
          localStorage.setItem(REMEMBER_KEY, email);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }

        navigate('/dashboard');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-app">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle compact />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden overflow-hidden bg-[#020617] lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[var(--pa-accent-violet)]/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[var(--pa-accent-blue)]/15 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-violet shadow-pa-md">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">Productivity Analyzer</p>
                <p className="text-sm text-slate-400">AI-powered student workspace</p>
              </div>
            </div>
          </div>

          <div className="relative max-w-lg">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
              Plan Smarter. Track Better. Achieve Faster.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-400">
              Your intelligent productivity workspace for goals, tasks, focus sessions,
              and AI-assisted learning — all in one premium student platform.
            </p>
          </div>

          <p className="relative text-sm text-slate-500">
            Trusted by students building better study habits every day.
          </p>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="inline-flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-primary">Productivity Analyzer</span>
              </div>
            </div>

            <div className="pa-card-elevated p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-primary">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="mt-1.5 text-sm text-secondary">
                {isLogin
                  ? 'Sign in to continue to your productivity workspace.'
                  : 'Start tracking goals, tasks, and focus in one place.'}
              </p>

              {error && (
                <div className="mt-4 rounded-lg border border-[var(--pa-accent-danger)]/30 bg-[var(--pa-accent-danger)]/10 px-3 py-2 text-sm text-[var(--pa-accent-danger)]">
                  {error}
                </div>
              )}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                {!isLogin && (
                  <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-secondary">
                      Full name
                    </label>
                    <div className="relative">
                      <FaUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        id="name"
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pa-input w-full py-2.5 pl-10 pr-3 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-secondary">
                    Email
                  </label>
                  <div className="relative">
                    <FaEnvelope className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pa-input w-full py-2.5 pl-10 pr-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-secondary">
                    Password
                  </label>
                  <div className="relative">
                    <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pa-input w-full py-2.5 pl-10 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-secondary">
                      Confirm password
                    </label>
                    <div className="relative">
                      <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pa-input w-full py-2.5 pl-10 pr-3 text-sm"
                      />
                    </div>
                  </div>
                )}

                {isLogin && (
                  <label className="flex items-center gap-2 text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-default"
                    />
                    Remember email
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="pa-btn-primary w-full py-2.5 text-sm font-semibold"
                >
                  {isSubmitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-secondary">
                {isLogin ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <Link to="/signup" className="font-medium accent-violet hover:underline">
                      Create account
                    </Link>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <Link to="/" className="font-medium accent-violet hover:underline">
                      Sign in
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthForm;
