/** Built-in sketch gallery. Thumbnails are the inline SVGs, rendered to blob URLs. */
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { SAMPLES, sampleDisplayUrl, type Sample } from '@/lib/samples';

export interface SampleGalleryProps {
  onSelect: (sample: Sample) => void;
  className?: string;
  /** Limit the number of samples shown (memoized per count). */
  limit?: number;
  compact?: boolean;
}

export function SampleGallery({ onSelect, className, limit, compact = false }: SampleGalleryProps) {
  const samples = useMemo(() => (limit ? SAMPLES.slice(0, limit) : SAMPLES), [limit]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const created: Record<string, string> = {};
    samples.forEach((sample) => {
      created[sample.id] = sampleDisplayUrl(sample);
    });
    setUrls(created);
    return () => {
      Object.values(created).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [samples]);

  return (
    <ul
      className={cn(
        'grid gap-3',
        compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3',
        className,
      )}
    >
      {samples.map((sample) => (
        <li key={sample.id}>
          <button
            type="button"
            onClick={() => onSelect(sample)}
            className={cn(
              'group flex w-full flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 text-center',
              'transition-colors duration-150 ease-swift hover:border-accent/40 hover:bg-white/10',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
            )}
          >
            <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {urls[sample.id] ? (
                <img
                  src={urls[sample.id]}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain p-2 transition-transform duration-200 ease-swift group-hover:scale-105 motion-reduce:transition-none"
                />
              ) : null}
            </span>
            <span className="text-xs font-medium text-secondary">{sample.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
