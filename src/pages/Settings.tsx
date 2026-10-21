/**
 * Settings: appearance, tracing defaults, behaviour, camera selection, setup
 * help, capability diagnostics, and the destructive "clear all data" flow.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Check,
  Info,
  Languages,
  Monitor,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings, format } from '@/lib/strings';
import { getCapabilityReport, hasMediaDevices, type BrowserName } from '@/lib/capabilities';
import { formatBytes } from '@/lib/imageUtils';
import { haptics } from '@/lib/haptics';
import { SETTINGS_DEFAULTS, SETTINGS_STORAGE_KEY, useSettingsStore, type ThemePreference } from '@/store/useSettingsStore';
import { useTraceStore } from '@/store/useTraceStore';
import { clearAllData, estimateStorage, type StorageUsage } from '@/db/db';
import type { DeviceInfo, ImageMode } from '@/types';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { InstallCard } from '@/components/home/InstallCard';

const APP_VERSION = '1.0.0';

const THEMES: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'system', label: strings.settings.themeSystem, icon: Monitor },
  { id: 'light', label: strings.settings.themeLight, icon: Sun },
  { id: 'dark', label: strings.settings.themeDark, icon: Moon },
];

const MODES: { id: ImageMode; label: string }[] = [
  { id: 'original', label: strings.modes.original },
  { id: 'outline', label: strings.modes.outline },
  { id: 'grayscale', label: strings.modes.grayscale },
  { id: 'invert', label: strings.modes.invert },
];

const GRID_PRESETS = [2, 3, 4, 6];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2.5xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-semibold text-primary">{title}</h2>
      {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

function CapabilityRow({ label, supported }: { label: string; supported: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="text-secondary">{label}</span>
      <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', supported ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted')}>
        {supported ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
        {supported ? strings.settings.supported : strings.settings.unsupported}
      </span>
    </li>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const report = getCapabilityReport();

  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const defaultOpacity = useSettingsStore((state) => state.defaultOpacity);
  const setDefaultOpacity = useSettingsStore((state) => state.setDefaultOpacity);
  const defaultMode = useSettingsStore((state) => state.defaultMode);
  const setDefaultMode = useSettingsStore((state) => state.setDefaultMode);
  const defaultGridEnabled = useSettingsStore((state) => state.defaultGridEnabled);
  const setDefaultGridEnabled = useSettingsStore((state) => state.setDefaultGridEnabled);
  const defaultGridDivisions = useSettingsStore((state) => state.defaultGridDivisions);
  const setDefaultGridDivisions = useSettingsStore((state) => state.setDefaultGridDivisions);
  const keepScreenOn = useSettingsStore((state) => state.keepScreenOn);
  const setKeepScreenOn = useSettingsStore((state) => state.setKeepScreenOn);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);
  const showTimer = useSettingsStore((state) => state.showTimer);
  const setShowTimer = useSettingsStore((state) => state.setShowTimer);
  const cameraDeviceId = useSettingsStore((state) => state.cameraDeviceId);
  const setCameraDeviceId = useSettingsStore((state) => state.setCameraDeviceId);
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const resetToDefaults = useSettingsStore((state) => state.resetToDefaults);

  const pushToast = useTraceStore((state) => state.pushToast);

  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    haptics.setEnabled(hapticsEnabled);
  }, [hapticsEnabled]);

  const loadDevices = useCallback(async () => {
    if (!hasMediaDevices() || typeof navigator.mediaDevices.enumerateDevices !== 'function') return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        list
          .filter((device) => device.kind === 'videoinput')
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${index + 1}`,
            isDefault: device.deviceId === 'default',
          })),
      );
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
    void estimateStorage().then(setUsage);
  }, [loadDevices]);

  const handleClearAll = useCallback(async () => {
    try {
      await clearAllData();
    } catch {
      /* the connection may already be gone */
    }
    try {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      /* private mode */
    }
    useTraceStore.getState().clearImage();
    resetToDefaults();
    setConfirmOpen(false);
    pushToast(strings.settings.resetDefaultsDone, 'success');
  }, [pushToast, resetToDefaults]);

  const browserLabel: Record<BrowserName, string> = {
    chrome: 'Chrome',
    edge: 'Edge',
    firefox: 'Firefox',
    safari: 'Safari',
    samsung: 'Samsung Internet',
    unknown: 'Unknown',
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),1.25rem)]">
      <header className="flex items-center gap-3">
        <IconButton label={strings.nav.back} icon={<ArrowLeft size={20} />} onClick={() => navigate('/')} />
        <h1 className="text-xl font-bold tracking-tight text-primary">{strings.settings.title}</h1>
      </header>

      <div className="mt-5 space-y-4">
        <Section title={strings.settings.appearance}>
          <div role="radiogroup" aria-label={strings.settings.theme} className="flex flex-wrap gap-2">
            {THEMES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={theme === id}
                onClick={() => setTheme(id)}
                className={cn(
                  'inline-flex min-h-12 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
                  theme === id
                    ? 'border-accent/40 bg-accent text-accent-contrast'
                    : 'border-white/10 bg-white/8 text-secondary hover:bg-white/15',
                )}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title={strings.settings.tracing}>
          <Slider
            label={strings.settings.defaultOpacity}
            min={0}
            max={100}
            step={1}
            value={Math.round(defaultOpacity * 100)}
            valueText={format('{{value}}%', { value: Math.round(defaultOpacity * 100) })}
            onChange={(value) => setDefaultOpacity(value / 100)}
          />

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-secondary">
              {strings.settings.defaultMode}
            </p>
            <div className="flex flex-wrap gap-2">
              {MODES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={defaultMode === id}
                  onClick={() => setDefaultMode(id)}
                  className={cn(
                    'min-h-12 rounded-xl border px-3.5 text-sm font-medium',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
                    defaultMode === id
                      ? 'border-accent/40 bg-accent text-accent-contrast'
                      : 'border-white/10 bg-white/8 text-secondary hover:bg-white/15',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Switch
            label={strings.settings.defaultGrid}
            checked={defaultGridEnabled}
            onCheckedChange={setDefaultGridEnabled}
          />

          {defaultGridEnabled ? (
            <div className="flex flex-wrap gap-2">
              {GRID_PRESETS.map((divisions) => (
                <button
                  key={divisions}
                  type="button"
                  aria-pressed={defaultGridDivisions === divisions}
                  onClick={() => setDefaultGridDivisions(divisions)}
                  className={cn(
                    'min-h-12 min-w-12 rounded-xl border px-3 text-sm font-semibold',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
                    defaultGridDivisions === divisions
                      ? 'border-accent/40 bg-accent text-accent-contrast'
                      : 'border-white/10 bg-white/8 text-secondary hover:bg-white/15',
                  )}
                >
                  {divisions}×{divisions}
                </button>
              ))}
            </div>
          ) : null}
        </Section>

        <Section title={strings.trace.moreControls}>
          <Switch
            label={strings.settings.keepScreenOn}
            description={strings.settings.keepScreenOnHint}
            checked={keepScreenOn}
            onCheckedChange={setKeepScreenOn}
          />
          <Switch
            label={strings.settings.haptics}
            description={strings.settings.hapticsHint}
            checked={hapticsEnabled}
            onCheckedChange={setHapticsEnabled}
          />
          <Switch
            label={strings.settings.showTimer}
            checked={showTimer}
            onCheckedChange={setShowTimer}
          />
        </Section>

        <Section title={strings.settings.camera} description={strings.settings.cameraNote}>
          <div className="flex items-center gap-2">
            <Camera size={16} className="shrink-0 text-muted" aria-hidden="true" />
            <select
              value={cameraDeviceId ?? ''}
              onChange={(event) => setCameraDeviceId(event.target.value || null)}
              aria-label={strings.settings.cameraDevice}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-ink-950/60 px-3 text-sm text-primary focus:border-accent focus:outline-none"
            >
              <option value="">{strings.settings.cameraDefault}</option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
            <Button size="sm" variant="secondary" onClick={() => void loadDevices()}>
              {strings.common.retry}
            </Button>
          </div>
        </Section>

        <Section title={strings.settings.setupTitle}>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
            {strings.settings.setupTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </Section>

        <Section title={strings.settings.language} description={strings.settings.languageNote}>
          <div className="flex items-center gap-2">
            <Languages size={16} className="shrink-0 text-muted" aria-hidden="true" />
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              aria-label={strings.settings.language}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-ink-950/60 px-3 text-sm text-primary focus:border-accent focus:outline-none"
            >
              <option value="en">English</option>
            </select>
          </div>
        </Section>

        <Section title={strings.settings.diagnostics}>
          <ul className="space-y-2">
            <CapabilityRow label="getUserMedia" supported={report.camera} />
            <CapabilityRow label={strings.errors.insecureTitle} supported={report.secureContext} />
            <CapabilityRow label="Screen Wake Lock" supported={report.wakeLock} />
            <CapabilityRow label="Fullscreen API" supported={report.fullscreen} />
            <CapabilityRow label="Vibration" supported={report.vibration} />
            <CapabilityRow label="OffscreenCanvas" supported={report.offscreenCanvas} />
            <CapabilityRow label="Install prompt" supported={report.installPrompt} />
          </ul>
          <p className="text-xs text-muted">
            {browserLabel[report.browser]} · {report.ios ? 'iOS' : report.android ? 'Android' : 'Desktop'}
          </p>
        </Section>

        <Section title={strings.settings.data}>
          {usage ? (
            <p className="text-sm text-secondary">
              {strings.settings.storageUsed}: {formatBytes(usage.usage)} ({Math.round(usage.ratio * 100)}%)
            </p>
          ) : (
            <p className="text-sm text-muted">{strings.settings.storageUsed}: —</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={resetToDefaults}
              leadingIcon={<RotateCcw size={16} aria-hidden="true" />}
            >
              {strings.settings.resetDefaults}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setConfirmOpen(true)}
              leadingIcon={<Trash2 size={16} aria-hidden="true" />}
            >
              {strings.settings.clearData}
            </Button>
          </div>
        </Section>

        <InstallCard />

        <Section title={strings.settings.about}>
          <div className="flex items-start gap-2 text-sm text-muted">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p>
                {strings.settings.version} {APP_VERSION}
              </p>
              <p className="mt-1">{strings.settings.privacy}</p>
            </div>
          </div>
        </Section>
      </div>

      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={strings.settings.clearDataConfirmTitle}
        footer={
          <div className="flex gap-2 pb-1">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setConfirmOpen(false)}
            >
              {strings.settings.cancel}
            </Button>
            <Button variant="danger" fullWidth onClick={() => void handleClearAll()}>
              {strings.settings.clearDataConfirm}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-secondary">
          {strings.settings.clearDataConfirmBody}
        </p>
        <p className="mt-3 text-xs text-muted">
          {SETTINGS_DEFAULTS.language.toUpperCase()} · {strings.settings.privacy}
        </p>
      </BottomSheet>
    </main>
  );
}
