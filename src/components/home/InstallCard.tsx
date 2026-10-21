/** Install prompt (Chrome/Android) with iOS "Add to Home Screen" fallback. */
import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import { useInstallPrompt } from '@/lib/useInstallPrompt';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

export interface InstallCardProps {
  className?: string;
  dismissible?: boolean;
}

export function InstallCard({ className, dismissible = true }: InstallCardProps) {
  const { canInstall, installed, standalone, isIOSDevice, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (dismissed || installed || standalone) return null;
  // Nothing to offer: no prompt available and not iOS.
  if (!canInstall && !isIOSDevice) return null;

  const handleInstall = async () => {
    setBusy(true);
    await promptInstall();
    setBusy(false);
  };

  return (
    <section
      className={cn(
        'relative rounded-2.5xl border border-white/10 bg-white/5 p-4 backdrop-blur',
        className,
      )}
      aria-label={strings.install.title}
    >
      {dismissible ? (
        <div className="absolute right-2 top-2">
          <IconButton
            label={strings.install.dismiss}
            icon={<X size={18} />}
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
          />
        </div>
      ) : null}

      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-accent/15 text-accent-strong">
          {isIOSDevice ? <Share size={20} aria-hidden="true" /> : <Download size={20} aria-hidden="true" />}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-primary">{strings.install.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{strings.install.body}</p>
        </div>
      </div>

      {canInstall ? (
        <Button
          className="mt-3"
          variant="primary"
          size="sm"
          disabled={busy}
          onClick={() => void handleInstall()}
        >
          {strings.install.button}
        </Button>
      ) : (
        <div className="mt-3 rounded-xl border border-white/10 bg-ink-950/40 p-3">
          <p className="text-xs font-semibold text-secondary">{strings.install.iosTitle}</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted">
            <li>{strings.install.iosStep1}</li>
            <li>{strings.install.iosStep2}</li>
            <li>{strings.install.iosStep3}</li>
          </ol>
        </div>
      )}
    </section>
  );
}
