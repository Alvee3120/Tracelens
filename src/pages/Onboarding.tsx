/**
 * Three-step onboarding. The camera permission is only ever requested from the
 * explicit "Start camera" action — never on load — and the screen degrades
 * gracefully when the camera cannot be used at all.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft, ChevronRight, ImagePlus, PencilRuler, ShieldAlert } from 'lucide-react';
import type { ReactElement } from 'react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import { getCapabilityReport, hasMediaDevices, isSecureCameraContext } from '@/lib/capabilities';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

function PropPhoneIllustration(): ReactElement {
  return (
    <svg viewBox="0 0 220 140" role="img" aria-label={strings.onboarding.steps[0].title}>
      <rect x="0" y="0" width="220" height="140" rx="16" fill="rgba(255,255,255,0.04)" />
      <rect x="46" y="104" width="128" height="10" rx="5" fill="#334155" />
      <rect x="52" y="114" width="10" height="14" rx="3" fill="#1e293b" />
      <rect x="158" y="114" width="10" height="14" rx="3" fill="#1e293b" />
      <rect x="80" y="86" width="60" height="20" rx="4" fill="#e2e8f0" />
      <rect x="86" y="90" width="48" height="4" rx="2" fill="#94a3b8" />
      <rect x="86" y="97" width="32" height="4" rx="2" fill="#94a3b8" />
      <rect x="88" y="40" width="44" height="72" rx="10" fill="#0f172a" stroke="#5eead4" strokeWidth="2" />
      <rect x="93" y="48" width="34" height="52" rx="4" fill="#134e4a" />
      <circle cx="110" cy="110" r="3" fill="#5eead4" />
      <path d="M96 32 L86 20 M124 32 L134 20" stroke="#5eead4" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function PickImageIllustration(): ReactElement {
  return (
    <svg viewBox="0 0 220 140" role="img" aria-label={strings.onboarding.steps[1].title}>
      <rect x="0" y="0" width="220" height="140" rx="16" fill="rgba(255,255,255,0.04)" />
      <rect x="18" y="28" width="84" height="84" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="2" />
      <path d="M32 96 L56 62 L72 84 L84 70 L92 96 Z" fill="#5eead4" opacity="0.85" />
      <circle cx="42" cy="48" r="7" fill="#99f6e4" />
      <rect x="118" y="28" width="84" height="84" rx="10" fill="#0f172a" stroke="#5eead4" strokeWidth="2" />
      <rect x="130" y="40" width="60" height="60" rx="6" fill="#1e293b" />
      <path d="M138 88 L158 60 L172 78 L182 68 L182 92 L138 92 Z" fill="#5eead4" opacity="0.7" />
      <path d="M102 70 L114 70" stroke="#5eead4" strokeWidth="3" strokeLinecap="round" />
      <path d="M108 64 L114 70 L108 76" stroke="#5eead4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function TraceIllustration(): ReactElement {
  return (
    <svg viewBox="0 0 220 140" role="img" aria-label={strings.onboarding.steps[2].title}>
      <rect x="0" y="0" width="220" height="140" rx="16" fill="rgba(255,255,255,0.04)" />
      <rect x="40" y="22" width="140" height="96" rx="10" fill="#f1f5f9" opacity="0.14" />
      <path
        d="M64 92 C86 44 108 108 132 56 C142 36 152 40 160 52"
        fill="none"
        stroke="#5eead4"
        strokeWidth="3"
        strokeDasharray="7 6"
        strokeLinecap="round"
      />
      <path
        d="M64 92 C86 44 108 108 132 56"
        fill="none"
        stroke="#0f172a"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M132 56 L146 44 L156 54 L142 66 Z" fill="#5eead4" />
      <rect x="152" y="30" width="22" height="14" rx="4" fill="#1e293b" />
    </svg>
  );
}

const ILLUSTRATIONS = [PropPhoneIllustration, PickImageIllustration, TraceIllustration];

export default function Onboarding() {
  const navigate = useNavigate();
  const setHasCompletedOnboarding = useSettingsStore((state) => state.setHasCompletedOnboarding);
  const [step, setStep] = useState(0);

  const report = getCapabilityReport();
  const cameraUsable = hasMediaDevices() && isSecureCameraContext();

  const finish = (autostart: boolean) => {
    setHasCompletedOnboarding(true);
    navigate(`/trace${autostart ? '?autostart=1' : '?overlayOnly=1'}`, { replace: true });
  };

  const Illustration = ILLUSTRATIONS[step] ?? PropPhoneIllustration;
  const current = strings.onboarding.steps[step] ?? strings.onboarding.steps[0];

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">
          {strings.app.name}
        </p>
        <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-primary">
          {strings.onboarding.title}
        </h1>
      </header>

      {!cameraUsable ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-950/40 p-4">
          <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
          <div className="text-sm leading-relaxed text-amber-100">
            <p className="font-semibold">
              {report.secureContext ? strings.errors.unsupportedTitle : strings.errors.insecureTitle}
            </p>
            <p className="mt-1 text-amber-200/90">
              {report.secureContext ? strings.errors.unsupportedBody : strings.errors.insecureBody}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex-1">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-800/60 p-3">
          <Illustration />
        </div>

        <div className="mt-5 text-center">
          <h2 className="text-lg font-semibold text-primary">{current.title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{current.body}</p>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2" role="tablist" aria-label={strings.nav.onboarding}>
          {strings.onboarding.steps.map((item, index) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={index === step}
              aria-label={item.title}
              onClick={() => setStep(index)}
              className={cn(
                'flex h-12 min-w-12 items-center justify-center px-1',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'block h-2.5 rounded-full transition-all duration-200 ease-swift',
                  index === step ? 'w-7 bg-accent' : 'w-2.5 bg-white/25 hover:bg-white/40',
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3">
          <IconButton
            label={strings.nav.back}
            icon={<ChevronLeft size={20} />}
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            disabled={step === 0}
          />

          {step < strings.onboarding.steps.length - 1 ? (
            <Button
              className="flex-1"
              variant="primary"
              onClick={() => setStep((prev) => prev + 1)}
              trailingIcon={<ChevronRight size={18} aria-hidden="true" />}
            >
              {strings.onboarding.next}
            </Button>
          ) : (
            <Button
              className="flex-1"
              variant="primary"
              onClick={() => finish(true)}
              disabled={!cameraUsable}
              leadingIcon={<Camera size={18} aria-hidden="true" />}
            >
              {strings.onboarding.startCamera}
            </Button>
          )}
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => finish(false)}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm text-muted underline-offset-4 hover:text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ImagePlus size={16} aria-hidden="true" />
            {strings.onboarding.continueWithout}
          </button>

          <button
            type="button"
            onClick={() => finish(false)}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm text-muted hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <PencilRuler size={16} aria-hidden="true" />
            {strings.onboarding.skip}
          </button>
        </div>

        <p className="text-center text-xs text-muted">{strings.onboarding.permissionNote}</p>
      </div>
    </main>
  );
}
