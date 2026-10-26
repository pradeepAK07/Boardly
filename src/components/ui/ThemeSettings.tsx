import { useTheme } from '@/theme/context';
import { THEMES, type BoardTheme } from '@/theme/themes';

const THEME_ORDER: BoardTheme[] = ['wood', 'glass'];

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-settings" role="group" aria-label="Board theme">
      <span className="theme-settings__label">Board theme</span>
      <div className="theme-settings__options">
        {THEME_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            className={`theme-swatch${theme === key ? ' is-active' : ''}`}
            aria-pressed={theme === key}
            onClick={() => setTheme(key)}
            title={`${THEMES[key].label} board`}
          >
            <span
              className={`theme-swatch__preview theme-swatch__preview--${key}`}
              aria-hidden="true"
            />
            <span className="theme-swatch__name">{THEMES[key].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
