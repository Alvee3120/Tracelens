/**
 * A real anchor styled like a Button, for links that leave the app.
 *
 * Deliberately an <a> rather than a <button>: it keeps normal link semantics
 * (middle-click, "open in new tab", status-bar preview) and never nests
 * interactive elements. The new-tab hint is announced to screen readers.
 */
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { strings } from '@/lib/strings';
import {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  type ButtonSize,
  type ButtonVariant,
} from '@/components/ui/buttonStyles';

export interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Exclude<ButtonVariant, 'danger'>;
  size?: ButtonSize;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  /** Set false for links that do not open a new tab (e.g. mailto). */
  opensInNewTab?: boolean;
}

export function ExternalLink({
  href,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  leadingIcon,
  opensInNewTab = true,
  className,
  children,
  ...rest
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      {...(opensInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {leadingIcon ? <span className="shrink-0">{leadingIcon}</span> : null}
      <span className="truncate">{children}</span>
      {opensInNewTab ? (
        <>
          <span className="shrink-0" aria-hidden="true">
            <ExternalLinkIcon size={16} />
          </span>
          <span className="sr-only"> {strings.common.opensInNewTab}</span>
        </>
      ) : null}
    </a>
  );
}
