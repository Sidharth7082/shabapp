/**
 * A one-shot flag so the login screen can explain why the employee was signed
 * out. It is written just before the store is cleared and consumed on the next
 * login-screen mount, so a manual visit to /login never shows a stale warning.
 */
const KEY = 'shabh-session-expired'

export function markSessionExpired(): void {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // storage unavailable: the redirect still happens, only the notice is lost
  }
}

export function consumeSessionExpired(): boolean {
  try {
    const value = sessionStorage.getItem(KEY) === '1'
    if (value) sessionStorage.removeItem(KEY)
    return value
  } catch {
    return false
  }
}
