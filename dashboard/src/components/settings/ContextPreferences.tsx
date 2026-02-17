import type { ContextPreferences } from '@agenttailor/shared';

export interface ContextPreferencesProps {
  values: ContextPreferences;
  onChange: (updated: Partial<ContextPreferences>) => void;
  disabled?: boolean;
}

interface SliderFieldProps {
  label: string;
  id: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

function SliderField({
  label,
  id,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onChange,
  formatValue,
}: SliderFieldProps) {
  const displayValue = formatValue ? formatValue(value) : String(value);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-secondary-700">
          {label}
        </label>
        <span className="text-sm font-mono text-primary-600 bg-primary-50 border border-primary-100 rounded px-2 py-0.5 min-w-[3rem] text-center">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer accent-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex justify-between text-xs text-secondary-400">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}

type CompressionLevel = 'none' | 'light' | 'aggressive';

const COMPRESSION_OPTIONS: { value: CompressionLevel; label: string; description: string }[] = [
  {
    value: 'none',
    label: 'None',
    description: 'Include all content as-is. Best when token budget is large.',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Remove redundancy and boilerplate. Recommended for most cases.',
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    description: 'Summarise and condense heavily. Use when token budget is tight.',
  },
];

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        checked ? 'bg-primary-600' : 'bg-secondary-300',
        'disabled:cursor-not-allowed disabled:opacity-60',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-0.5',
          checked ? 'translate-x-4.5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

export function ContextPreferences({ values, onChange, disabled = false }: ContextPreferencesProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Max chunks */}
      <SliderField
        id="max-chunks"
        label="Max Chunks"
        value={values.maxChunks}
        min={5}
        max={50}
        step={1}
        disabled={disabled}
        onChange={(v) => onChange({ maxChunks: v })}
      />

      {/* Compression level */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-secondary-700">Compression Level</span>
        <div className="flex flex-col gap-2">
          {COMPRESSION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={[
                'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                values.compressionLevel === option.value
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-secondary-200 bg-white hover:bg-secondary-50',
                disabled ? 'cursor-not-allowed opacity-60' : '',
              ].join(' ')}
            >
              <input
                type="radio"
                name="compression-level"
                value={option.value}
                checked={values.compressionLevel === option.value}
                disabled={disabled}
                onChange={() => onChange({ compressionLevel: option.value })}
                className="mt-0.5 accent-primary-600"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-secondary-800">{option.label}</span>
                <span className="text-xs text-secondary-500">{option.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Web search toggle */}
      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-secondary-700">Web Search</span>
            <span className="text-xs text-secondary-500">
              Augment context with live web results when documents are insufficient.
            </span>
          </div>
          <ToggleSwitch
            checked={values.webSearchEnabled}
            onChange={(v) => onChange({ webSearchEnabled: v })}
            disabled={disabled}
          />
        </label>

        {/* Max results slider — only enabled when web search is on */}
        <div className={values.webSearchEnabled && !disabled ? '' : 'opacity-50 pointer-events-none'}>
          <SliderField
            id="web-search-max-results"
            label="Max Web Results"
            value={values.webSearchMaxResults}
            min={1}
            max={10}
            step={1}
            disabled={disabled || !values.webSearchEnabled}
            onChange={(v) => onChange({ webSearchMaxResults: v })}
          />
        </div>
      </div>

      {/* Relevance threshold */}
      <SliderField
        id="chunk-weight-threshold"
        label="Relevance Threshold"
        value={values.chunkWeightThreshold}
        min={0.1}
        max={0.9}
        step={0.05}
        disabled={disabled}
        onChange={(v) => onChange({ chunkWeightThreshold: Math.round(v * 100) / 100 })}
        formatValue={(v) => v.toFixed(2)}
      />
    </div>
  );
}
