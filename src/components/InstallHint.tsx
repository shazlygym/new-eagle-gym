import { Share, X } from 'lucide-react'
import { useT } from '../i18n'
import { useAppStore } from '../stores/appStore'

type IOSNavigator = Navigator & { standalone?: boolean }

/**
 * iOS has no beforeinstallprompt event and no install button — the only route to
 * the Home Screen is the Share menu, which most people never think to open. This
 * card is the substitute, and it matters beyond polish: an installed PWA gets
 * noticeably better protection from Safari's storage eviction, and this app's
 * data exists nowhere else.
 */
export default function InstallHint() {
  const { t } = useT()
  const dismissed = useAppStore((state) => state.installHintDismissed)
  const dismiss = useAppStore((state) => state.dismissInstallHint)

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const alreadyInstalled =
    (navigator as IOSNavigator).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches

  if (dismissed || alreadyInstalled || !isIOS) return null

  // Deliberately in the normal document flow on Home only. As a fixed overlay it
  // sat on top of the tab bar and covered the bottom of every screen.
  return (
    <div className="card animate-fade-in flex gap-3 border-brand-500/30 p-4">
      <Share size={18} className="mt-0.5 shrink-0 text-brand-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-50">{t('install.title')}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-200">{t('install.body')}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('install.dismiss')}
        className="-me-1 -mt-1 h-8 w-8 shrink-0 rounded-full text-ink-300 active:bg-ink-600"
      >
        <X size={16} className="mx-auto" />
      </button>
    </div>
  )
}
