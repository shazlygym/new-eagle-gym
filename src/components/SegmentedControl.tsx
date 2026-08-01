interface Props<T extends string> {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  className?: string
}

/** iOS-style segmented control. Used for units, language and chart tabs. */
export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: Props<T>) {
  return (
    <div className={`flex rounded-xl bg-ink-800 p-1 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                        ${selected ? 'bg-brand-500 text-ink-950' : 'text-ink-200 active:bg-ink-700'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
