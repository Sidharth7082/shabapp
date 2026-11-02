/** Opens a URL outside the app (Custom Tab on Android, new tab on web). */
export async function openExternal(url: string): Promise<void> {
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean }
  }).Capacitor
  if (capacitor?.isNativePlatform?.()) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
    return
  }
  window.open(url, '_blank', 'noopener')
}
