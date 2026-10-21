import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Platform, type ColorValue } from 'react-native';

import { colors } from '@/theme/tokens';

export type AppIconName =
  | 'home'
  | 'cards'
  | 'pet'
  | 'trophy'
  | 'settings'
  | 'star'
  | 'fire'
  | 'volume'
  | 'heart'
  | 'back'
  | 'close'
  | 'lock'
  | 'gift'
  | 'play'
  | 'clock'
  | 'check'
  | 'explore'
  | 'psychology'
  | 'book'
  | 'sparkle'
  | 'stars'
  | 'check_circle'
  | 'arrow_back'
  | 'arrow_forward'
  | 'redeem';

type Props = { name: AppIconName; size?: number; color?: ColorValue };

export function AppIcon({ name, size = 28, color = colors.ink }: Props) {
  const stroke = { stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...(Platform.OS === 'web'
        ? { 'aria-hidden': true }
        : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const })}
    >
      {name === 'home' && <><Path d="M3 11.5 12 4l9 7.5" fill="none" {...stroke} /><Path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6" fill="none" {...stroke} /></>}
      {name === 'cards' && <><Rect x="5" y="4" width="13" height="16" rx="2.5" fill="none" {...stroke} /><Path d="M9 8h5M9 12h5M9 16h3" {...stroke} /></>}
      {name === 'pet' && <><Circle cx="8" cy="8" r="2" fill="none" {...stroke} /><Circle cx="16" cy="8" r="2" fill="none" {...stroke} /><Circle cx="5" cy="13" r="2" fill="none" {...stroke} /><Circle cx="19" cy="13" r="2" fill="none" {...stroke} /><Path d="M8 18c0-3 2-5 4-5s4 2 4 5c0 1.5-1.2 2-4 2s-4-.5-4-2Z" fill="none" {...stroke} /></>}
      {name === 'trophy' && <><Path d="M8 4h8v4c0 4-2 6-4 6S8 12 8 8V4Z" fill="none" {...stroke} /><Path d="M8 6H4c0 4 1.5 6 5 6M16 6h4c0 4-1.5 6-5 6M12 14v4M8 20h8" fill="none" {...stroke} /></>}
      {name === 'settings' && <><Circle cx="12" cy="12" r="3" fill="none" {...stroke} /><Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" {...stroke} /></>}
      {name === 'star' && <Path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" fill={color} stroke={color} strokeLinejoin="round" />}
      {name === 'fire' && <Path d="M13 3c1 4-2 5-2 8 0 1.2.8 2 2 2 2 0 2.5-2.5 2-4 3 2 4 4 4 6.5A7 7 0 0 1 5 16c0-5 4-8 8-13Z" fill={color} />}
      {name === 'volume' && <><Path d="M4 10v4h4l5 4V6l-5 4H4Z" fill="none" {...stroke} /><Path d="M16 9c1.5 1.5 1.5 4.5 0 6M19 6c3 3 3 9 0 12" fill="none" {...stroke} /></>}
      {name === 'heart' && <Path d="M12 20S4 15 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15 12 20 12 20Z" fill="none" {...stroke} />}
      {name === 'back' && <Path d="m14.5 5-7 7 7 7" fill="none" {...stroke} />}
      {name === 'close' && <Path d="M18 6 6 18M6 6l12 12" fill="none" {...stroke} />}
      {name === 'lock' && <><Rect x="6" y="10" width="12" height="10" rx="2" fill="none" {...stroke} /><Path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" fill="none" {...stroke} /></>}
      {name === 'gift' && <><Rect x="4" y="9" width="16" height="11" rx="2" fill="none" {...stroke} /><Path d="M3 9h18M12 9v11M12 9H8.5C5 9 5 4 8 4c2 0 4 5 4 5Zm0 0h3.5C19 9 19 4 16 4c-2 0-4 5-4 5Z" fill="none" {...stroke} /></>}
      {name === 'play' && <Path d="m8 5 11 7-11 7V5Z" fill={color} />}
      {name === 'clock' && <><Circle cx="12" cy="12" r="9" fill="none" {...stroke} /><Path d="M12 7v5l3 2" fill="none" {...stroke} /></>}
      {name === 'check' && <Path d="m5 12 4 4L19 6" fill="none" {...stroke} />}
      {name === 'explore' && <><Circle cx="12" cy="12" r="9" fill="none" {...stroke} /><Path d="m15 9-2.5 5.5L9 15l2.5-5.5L15 9Z" fill="none" {...stroke} /></>}
      {name === 'psychology' && <><Path d="M12 3a7.5 7.5 0 0 0-7.5 7.5c0 2.8 1.5 5.2 3.8 6.5V18a1.5 1.5 0 0 0 1.5 1.5h4.4a1.5 1.5 0 0 0 1.5-1.5v-1c2.3-1.3 3.8-3.7 3.8-6.5A7.5 7.5 0 0 0 12 3Z" fill="none" {...stroke} /><Circle cx="12" cy="10.5" r="2" fill="none" {...stroke} /></>}
      {name === 'book' && <><Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none" {...stroke} /><Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" fill="none" {...stroke} /></>}
      {name === 'sparkle' && <Path d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z" fill={color} />}
      {name === 'stars' && <><Path d="m12 3 2 4.5 5 .7-3.6 3.5.8 5-4.2-2.3-4.2 2.3.8-5L5 8.2l5-.7L12 3Z" fill={color} /><Path d="m19 15 1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2-1.6-1.6 2.2-.3 1-2Z" fill={color} opacity={0.8} /></>}
      {name === 'check_circle' && <><Circle cx="12" cy="12" r="9" fill={color} /><Path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></>}
      {name === 'arrow_back' && <Path d="M19 12H5M12 19l-7-7 7-7" fill="none" {...stroke} />}
      {name === 'arrow_forward' && <Path d="M5 12h14M12 5l7 7-7 7" fill="none" {...stroke} />}
      {name === 'redeem' && <><Rect x="3" y="8" width="18" height="4" rx="1" fill="none" {...stroke} /><Path d="M12 8v12M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" fill="none" {...stroke} /><Path d="M7.5 8C6 8 5 6.5 6 5s3 1 6 3c3-2 5-3.5 6-3s0 3-1.5 3" fill="none" {...stroke} /></>}
    </Svg>
  );
}
