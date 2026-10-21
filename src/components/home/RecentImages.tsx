/** Recent-imports strip / sheet contents with a delete affordance per item. */
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import type { StoredImage } from '@/types';
import { useBlobUrls, type BlobEntry } from '@/lib/useBlobUrls';

export interface RecentImagesProps {
  recents: StoredImage[];
  isLoading?: boolean;
  onSelect: (image: StoredImage) => void;
  onDelete?: (id: string) => void;
  onClear?: () => void;
  layout?: 'row' | 'grid';
  className?: string;
}

export function RecentImages({
  recents,
  isLoading = false,
  onSelect,
  onDelete,
  onClear,
  layout = 'row',
  className,
}: RecentImagesProps) {
  const entries: BlobEntry[] = recents.map((item) => ({ key: item.id, blob: item.blob }));
  const urls = useBlobUrls(entries);

  if (isLoading) {
    return (
      <div className={cn('flex gap-3 overflow-hidden', className)} aria-busy="true">
        {[0, 1, 2, 3].map((key) => (
          <div
            key={key}
            className="h-20 w-20 shrink-0 animate-pulse rounded-2xl bg-white/10 motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  }

  if (recents.length === 0) {
    return <p className={cn('text-sm text-muted', className)}>{strings.home.recentsEmpty}</p>;
  }

  return (
    <div className={className}>
      {onClear && layout === 'grid' ? (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {strings.home.clearRecents}
          </button>
        </div>
      ) : null}

      <ul
        className={cn(
          'gap-3',
          layout === 'row'
            ? 'flex snap-x snap-mandatory overflow-x-auto pb-1'
            : 'grid grid-cols-3 sm:grid-cols-4',
        )}
      >
        {recents.map((image, index) => (
          <li key={image.id} className={cn(layout === 'row' && 'shrink-0 snap-start')}>
            <div className="group relative">
              <button
                type="button"
                onClick={() => onSelect(image)}
                className={cn(
                  'block overflow-hidden rounded-2xl border border-white/10 bg-white/5',
                  layout === 'row' ? 'h-20 w-20' : 'aspect-square w-full',
                  'transition-colors duration-150 ease-swift hover:border-accent/40',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
                )}
                title={image.name}
              >
                {urls[index] ? (
                  <img
                    src={urls[index] ?? undefined}
                    alt={image.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </button>

              {onDelete ? (
                <button
                  type="button"
                  aria-label={`${strings.common.delete}: ${image.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(image.id);
                  }}
                  className={cn(
                    'absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-ink-900/90 text-secondary backdrop-blur',
                    'hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  )}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
