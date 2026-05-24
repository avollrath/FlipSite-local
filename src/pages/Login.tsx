import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
import { demoAccountEmail } from '@/lib/demoMode'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'signup'

export function Login() {
 const { user, loading, signIn, signUp } = useAuth()
 const navigate = useNavigate()
 const location = useLocation()
 const [mode, setMode] = useState<AuthMode>(() =>
 new URLSearchParams(location.search).get('tab') === 'signup'
  ? 'signup'
  : 'login',
 )
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [submitting, setSubmitting] = useState(false)

 const destination =
 (location.state as { from?: { pathname?: string } } | null)?.from
 ?.pathname ?? '/items'
 const features = [
 'Track what you own and what you have sold',
 'Bundle-aware profit calculations',
 'Photos, receipts and files per item',
 ]

 function changeMode(nextMode: AuthMode) {
 setMode(nextMode)
 setPassword('')
 }

 const tabClass = (active: boolean) =>
 cn(
 'flex-1 py-2 text-sm font-medium transition-colors',
 active
  ? 'text-accent border-b-2 border-accent'
  : 'text-muted hover:text-[hsl(var(--text))]',
 )

 if (!loading && user) {
 return <Navigate to={destination} replace />
 }

 async function handleSubmit(event: FormEvent<HTMLFormElement>) {
 event.preventDefault()
 setSubmitting(true)

 try {
 if (mode === 'login') {
  await signIn(email, password)
  toast.success('Welcome back to FlipSite')
 } else {
  await signUp(email, password)
  toast.success('Account created')
 }

 navigate(destination, { replace: true })
 } catch (error) {
 if (import.meta.env.DEV) {
  console.error(error)
 }
 const message =
  mode === 'login'
  ? 'Invalid email or password'
  : 'Unable to create account. Please try again.'
 toast.error(message)
 } finally {
 setSubmitting(false)
 }
 }

 async function handleDemoLogin() {
 setSubmitting(true)

 try {
 await signIn(demoAccountEmail, 'demo1234')
 toast.success('Demo mode ready')
 navigate(destination, { replace: true })
 } catch (error) {
 if (import.meta.env.DEV) {
  console.error(error)
 }
 toast.error('Unable to start demo mode. Please try again.')
 } finally {
 setSubmitting(false)
 }
 }

 return (
 <main className="min-h-screen text-base bg-surface lg:flex">
 <section className="relative hidden w-1/2 overflow-hidden border-r lg:flex border-subtle bg-surface-2">
  <div
  className="absolute inset-0"
  style={{
   background:
   'radial-gradient(circle at center, hsl(var(--accent) / 0.15), transparent 42%)',
  }}
  />
  <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-12 text-center">
  <Logo size={72} />
  <h1 className="mt-10 text-2xl font-bold text-base">
   Your inventory. Your numbers.
  </h1>
  <div className="mt-8 space-y-3 text-left">
   {features.map((feature) => (
   <div key={feature} className="flex items-center gap-3 text-sm text-muted">
    <Check className="w-4 h-4 text-positive" aria-hidden="true" />
    <span>{feature}</span>
   </div>
   ))}
  </div>
  </div>
  <p className="absolute text-xs bottom-6 left-8 text-muted opacity-50">
  FlipSite 2026
  </p>
 </section>

 <section className="flex flex-col min-h-screen lg:w-1/2 bg-surface lg:bg-card">
  <div className="relative overflow-hidden border-b lg:hidden border-subtle bg-surface-2">
  <div
   className="absolute inset-0"
   style={{
   background:
    'radial-gradient(circle at center, hsl(var(--accent) / 0.15), transparent 58%)',
   }}
  />
  <div className="relative flex flex-col items-center px-6 py-8 text-center">
   <Logo size={43} />
   <p className="mt-4 text-xl font-bold text-base">
   Your inventory. Your numbers.
   </p>
  </div>
  </div>

  <div className="flex items-center justify-center flex-1 px-6 py-10">
  <div className="w-full max-w-[420px] animate-auth-card">
   <div className="mb-8 text-center">
   <div className="flex justify-center mb-6 lg:hidden">
    <Logo size={29} />
   </div>
   <h2 className="text-2xl font-bold text-base">Welcome back</h2>
   <p className="mt-2 text-sm text-muted">Sign in to your inventory</p>
   </div>

   <div className="flex min-h-[36px] mb-6 border-b border-subtle">
  <button
   type="button"
   className={tabClass(mode === 'login')}
   onClick={() => changeMode('login')}
  >
   Login
  </button>
  <button
   type="button"
   className={tabClass(mode === 'signup')}
   onClick={() => changeMode('signup')}
  >
   Sign Up
  </button>
  </div>

  <form className="space-y-4 animate-auth-form" onSubmit={handleSubmit}>
  <div>
   <label
   className="text-sm font-medium text-base"
   htmlFor="email"
   >
   Email
   </label>
   <input
   id="email"
   type="email"
   autoComplete="email"
   className="w-full h-11 px-3 mt-2 text-sm transition border rounded-lg outline-none border-border-base bg-surface focus:border-accent focus:ring-1 focus:ring-accent"
   value={email}
   onChange={(event) => setEmail(event.target.value)}
   required
   />
  </div>

  <div>
   <label
   className="text-sm font-medium text-base"
   htmlFor="password"
   >
   Password
   </label>
   <input
   id="password"
   type="password"
   autoComplete={
   mode === 'login' ? 'current-password' : 'new-password'
   }
   className="w-full h-11 px-3 mt-2 text-sm transition border rounded-lg outline-none border-border-base bg-surface focus:border-accent focus:ring-1 focus:ring-accent"
   value={password}
   onChange={(event) => setPassword(event.target.value)}
   required
   minLength={6}
   />
  </div>

  <button
   type="submit"
   disabled={submitting}
   className="flex items-center justify-center w-full gap-2 px-4 text-sm font-medium transition rounded-lg h-11 bg-accent text-accent-fg hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
  >
   {submitting ? (
   <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
   ) : (
   <ArrowRight className="w-4 h-4" aria-hidden="true" />
   )}
   {mode === 'login' ? 'Login' : 'Create Account'}
  </button>
  </form>

   <div className="flex items-center justify-center gap-2 mt-6 text-xs">
   <span className="text-muted">Just want to look around?</span>
   <button
    type="button"
    onClick={handleDemoLogin}
    disabled={submitting}
    className="font-medium text-accent hover:underline"
   >
    Try demo mode →
   </button>
  </div>
  </div>
  </div>
 </section>
 </main>
 )
}
