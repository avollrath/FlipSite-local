import { toast } from 'sonner'

export const demoAccountEmail = 'demo@flipsite.app'

export class DemoModeBlockedError extends Error {
  constructor() {
    super('Demo mode is read-only')
    this.name = 'DemoModeBlockedError'
  }
}

export function isDemoModeEmail(email: string | undefined | null) {
  return email?.toLowerCase() === demoAccountEmail
}

export function isDemoModeBlockedError(error: unknown) {
  return error instanceof DemoModeBlockedError
}

export function showDemoModeToast(navigate?: (path: string) => void) {
  toast.info('Demo mode - sign up to add your own items', {
    action: {
      label: 'Sign up',
      onClick: () => {
        if (navigate) {
          navigate('/login?tab=signup')
        } else {
          window.location.assign(`${import.meta.env.BASE_URL}login?tab=signup`)
        }
      },
    },
  })
}

export function blockDemoMode(navigate?: (path: string) => void): never {
  showDemoModeToast(navigate)
  throw new DemoModeBlockedError()
}
