import type { CSSProperties } from 'react';
import IsometricButton from './originkit/keycap-button';
import './keycap.css';

// The site's preset for the Originkit Keycap Button (src/components/originkit/keycap-button.tsx,
// used as shipped). Colours follow the neon-blue → white palette in styles/global.css.

const FONT: CSSProperties = {
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};

interface KeycapProps {
  label: string;
  /** renders the keycap as a link */
  href?: string;
  newTab?: boolean;
  /** the vendored button has no onClick prop: clicks (mouse, Enter, Space) bubble to this wrapper */
  onClick?: () => void;
  /** a text symbol drawn on the keycap, e.g. "↗" */
  icon?: string;
  /** symbol only; `label` still names the control for assistive tech */
  iconOnly?: boolean;
  size?: 'sm' | 'md';
  /** solid blue face for the main call to action */
  primary?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Keycap({ label, href, newTab = false, onClick, icon, iconOnly = false, size = 'md', primary = false, disabled = false, className = '' }: KeycapProps) {
  const sm = size === 'sm';
  return (
    <span
      className={`keycap keycap--${size} ${disabled ? 'is-disabled' : ''} ${className}`}
      onClick={disabled ? undefined : onClick}
    >
      <IsometricButton
        label={label}
        link={href ?? ''}
        newTab={newTab}
        showText={!iconOnly}
        addIcon={!!icon}
        icon={{
          type: 'symbol', symbol: icon ?? '→', side: 'left', size: iconOnly ? 18 : sm ? 13 : 15,
          color: primary ? '#ffffff' : '#7cc6ff', hoverColor: '#ffffff', padding: 0, rounded: 0,
        }}
        // charcoal face like the site's panels; primary = the old solid-blue CTA
        colors={primary
          ? { fill: '#1257ff', textColor: '#ffffff', hoverTextColor: '#ffffff' }
          : { fill: '#14161c', textColor: '#d6e9ff', hoverTextColor: '#ffffff' }}
        prism={{ color: primary ? '#7cc6ff' : '#1f8bff', float: sm ? 6 : 8, hoverFloat: sm ? 5 : 7, thickness: sm ? 10 : 14, intensity: primary ? 90 : 75 }}
        padding={iconOnly ? '12px 14px' : sm ? '10px 16px' : '15px 24px'}
        rounded={20}
        // flat camera: the keycap faces the viewer straight on; the underglow reads as a neon halo
        camera={{ tilt: 0, rotate: 0 }}
        gap={10}
        font={{ ...FONT, fontSize: sm ? 11.5 : 13 }}
      />
    </span>
  );
}
