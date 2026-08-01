import { useT } from '../i18n'

interface Props {
  protein: number
  carbs: number
  fat: number
  /** Leads the line, e.g. "207 kcal" on a food row or "200g" on a diary row. */
  prefix?: string
}

/**
 * The macro summary on a list row: "15P · 20C · 8F".
 *
 * Deliberately *not* wrapped in an LTR isolate, unlike the rep range. The unit
 * letters are translated, so in Arabic every figure is followed by a strong
 * right-to-left letter — and bidi rule W2 retypes a digit run that follows an
 * Arabic letter as an *Arabic* number, which lays out right-to-left no matter
 * what the surrounding isolate says. Forcing LTR here printed the fat figure
 * first and made it read as the protein. Left alone, each figure takes the
 * direction of the language around it and the three read in order in both.
 *
 * This is why the letters have to stay translated: swap the Arabic back to
 * P/C/F and the line becomes a Latin run inside an Arabic paragraph, which is
 * exactly the case that needs the isolate again.
 */
export default function MacroLine({ protein, carbs, fat, prefix }: Props) {
  const { t } = useT()

  const macros =
    `${round(protein)}${t('nutrition.proteinShort')} · ` +
    `${round(carbs)}${t('nutrition.carbsShort')} · ` +
    `${round(fat)}${t('nutrition.fatShort')}`

  return <span className="tabular">{prefix ? `${prefix} · ${macros}` : macros}</span>
}

/** One decimal at most, and no trailing ".0" — "20.5C" is useful, "20.0C" is noise. */
function round(value: number): number {
  return Math.round(value * 10) / 10
}
