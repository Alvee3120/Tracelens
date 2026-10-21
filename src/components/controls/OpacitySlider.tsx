import { useCallback } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { strings } from '@/lib/strings';
import { format } from '@/lib/strings';
import { useTraceStore } from '@/store/useTraceStore';
import { Slider } from '@/components/ui/Slider';

export interface OpacitySliderProps {
  className?: string;
  /** Called when the user finishes adjusting, so the session can be saved. */
  onCommit?: () => void;
}

export function OpacitySlider({ className, onCommit }: OpacitySliderProps) {
  const opacity = useTraceStore((state) => state.opacity);
  const setOpacity = useTraceStore((state) => state.setOpacity);

  const handleChange = useCallback((value: number) => setOpacity(value / 100), [setOpacity]);

  return (
    <Slider
      className={className}
      label={strings.trace.opacity}
      icon={<SlidersHorizontal size={13} aria-hidden="true" />}
      min={0}
      max={100}
      step={1}
      value={Math.round(opacity * 100)}
      valueText={format('{{value}}%', { value: Math.round(opacity * 100) })}
      onChange={handleChange}
      onPointerUp={onCommit}
    />
  );
}
