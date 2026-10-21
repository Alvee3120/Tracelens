/**
 * Home: the launcher. Start tracing, pick an image (file / drag-and-drop /
 * sample), and jump back into recent work.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Play, Settings as SettingsIcon, Sparkles, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import { PORTFOLIO_URL } from '@/lib/links';
import { getImage, loadSession } from '@/db/db';
import { useImageImport, type ImportTarget } from '@/lib/useImageImport';
import { useRecents } from '@/lib/useRecents';
import { useTraceStore } from '@/store/useTraceStore';
import { Button } from '@/components/ui/Button';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { IconButton } from '@/components/ui/IconButton';
import { SampleGallery } from '@/components/home/SampleGallery';
import { RecentImages } from '@/components/home/RecentImages';
import { InstallCard } from '@/components/home/InstallCard';

export default function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resumable, setResumable] = useState(false);

  const hasActiveImage = useTraceStore((state) => state.imageId !== null);
  const imageName = useTraceStore((state) => state.imageName);
  const { importFile, importSample, importBlob, isImporting } = useImageImport();
  const { recents, isLoading, remove, clear, refresh } = useRecents();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await loadSession();
        if (!session?.imageId) {
          if (!cancelled) setResumable(false);
          return;
        }
        const stored = await getImage(session.imageId);
        if (!cancelled) setResumable(Boolean(stored));
      } catch {
        if (!cancelled) setResumable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goToTrace = useCallback(
    (params = '') => {
      navigate(`/trace${params}`);
    },
    [navigate],
  );

  const handleFile = useCallback(
    async (file: File) => {
      const ok = await importFile(file);
      if (ok) {
        await refresh();
        goToTrace();
      }
    },
    [goToTrace, importFile, refresh],
  );

  const handleSample = useCallback(
    async (sample: Parameters<typeof importSample>[0]) => {
      const ok = await importSample(sample);
      if (ok) {
        await refresh();
        goToTrace();
      }
    },
    [goToTrace, importSample, refresh],
  );

  const handleRecent = useCallback(
    async (target: ImportTarget) => {
      const ok = await importBlob(target);
      if (ok) goToTrace();
    },
    [goToTrace, importBlob],
  );

  return (
    <main
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const [file] = Array.from(event.dataTransfer.files);
        if (file) void handleFile(file);
      }}
      className={cn(
        'mx-auto w-full max-w-3xl px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.25rem)]',
        isDragging && 'ring-2 ring-inset ring-accent',
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">
            {strings.app.name}
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-primary">
            {strings.app.tagline}
          </h1>
        </div>
        <IconButton
          label={strings.home.openSettings}
          icon={<SettingsIcon size={20} />}
          onClick={() => navigate('/settings')}
        />
      </header>

      <section className="mt-6 space-y-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => goToTrace(hasActiveImage ? '' : '?autostart=1')}
          leadingIcon={<Play size={20} aria-hidden="true" />}
        >
          {hasActiveImage ? strings.home.continueSession : strings.home.startTracing}
        </Button>

        {hasActiveImage && imageName ? (
          <p className="text-center text-xs text-muted">
            {strings.trace.changeImage}: {imageName}
          </p>
        ) : null}

        {resumable && !hasActiveImage ? (
          <Button variant="secondary" fullWidth onClick={() => goToTrace('?resume=1')}>
            {strings.home.continueSession}
          </Button>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            variant="secondary"
            fullWidth
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            leadingIcon={<FolderOpen size={18} aria-hidden="true" />}
          >
            {isImporting ? strings.common.loading : strings.home.pickFromGallery}
          </Button>

          <div className="hidden items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 text-xs text-muted sm:flex">
            <Upload size={15} aria-hidden="true" />
            {strings.home.dropHint}
          </div>
        </div>

        <p className="text-center text-xs text-muted">{strings.install.body}</p>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          {strings.home.samplesTitle}
        </h2>
        <p className="mt-1 text-xs text-muted">{strings.home.samplesBody}</p>
        <SampleGallery className="mt-3" onSelect={(sample) => void handleSample(sample)} />
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
            {strings.home.recentsTitle}
          </h2>
          {recents.length > 0 ? (
            <button
              type="button"
              onClick={() => void clear()}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-white/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {strings.home.clearRecents}
            </button>
          ) : null}
        </div>
        <RecentImages
          className="mt-3"
          recents={recents}
          isLoading={isLoading}
          onSelect={(image) =>
            void handleRecent({ blob: image.blob, name: image.name, source: image.source })
          }
          onDelete={(id) => void remove(id)}
        />
      </section>

      <section className="mt-8">
        <InstallCard />
      </section>

      <section className="mt-8" aria-labelledby="portfolio-heading">
        <div className="rounded-2.5xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-accent/15 text-accent-strong">
              <Sparkles size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="portfolio-heading" className="text-sm font-semibold text-primary">
                {strings.portfolio.title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">{strings.portfolio.body}</p>
            </div>
          </div>

          <ExternalLink className="mt-3" href={PORTFOLIO_URL} variant="primary" size="sm">
            {strings.portfolio.action}
          </ExternalLink>
        </div>
      </section>
    </main>
  );
}
