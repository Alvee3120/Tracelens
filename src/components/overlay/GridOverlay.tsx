/** Alignment grid drawn as SVG over the camera feed. */
import { memo, type ReactElement } from 'react';
import { strings } from '@/lib/strings';

export interface GridOverlayProps {
  divisions: number;
  color: string;
  thickness: number;
  visible: boolean;
}

function GridOverlayComponent({ divisions, color, thickness, visible }: GridOverlayProps) {
  if (!visible) return null;

  const count = Math.max(2, Math.min(12, Math.round(divisions)));
  const lines: ReactElement[] = [];

  for (let i = 1; i < count; i += 1) {
    const percent = (i / count) * 100;
    lines.push(
      <line
        key={`v-${i}`}
        x1={`${percent}%`}
        y1="0"
        x2={`${percent}%`}
        y2="100%"
        stroke={color}
        strokeWidth={thickness}
        vectorEffect="non-scaling-stroke"
      />,
    );
    lines.push(
      <line
        key={`h-${i}`}
        x1="0"
        y1={`${percent}%`}
        x2="100%"
        y2={`${percent}%`}
        stroke={color}
        strokeWidth={thickness}
        vectorEffect="non-scaling-stroke"
      />,
    );
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      role="img"
      aria-label={strings.a11y.gridOverlay}
      preserveAspectRatio="none"
    >
      <g opacity={0.85}>{lines}</g>
      <line
        x1="50%"
        y1="0"
        x2="50%"
        y2="100%"
        stroke={color}
        strokeWidth={thickness * 1.4}
        strokeDasharray="6 6"
        vectorEffect="non-scaling-stroke"
        opacity={0.7}
      />
      <line
        x1="0"
        y1="50%"
        x2="100%"
        y2="50%"
        stroke={color}
        strokeWidth={thickness * 1.4}
        strokeDasharray="6 6"
        vectorEffect="non-scaling-stroke"
        opacity={0.7}
      />
    </svg>
  );
}

export const GridOverlay = memo(GridOverlayComponent);
