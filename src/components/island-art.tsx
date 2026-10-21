import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export function IslandArt({ width = 280, height = 190 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 300 205" accessibilityLabel="蓝天白云下的绿色冒险岛和小精灵">
      <Circle cx="244" cy="38" r="24" fill={colors.yellow} opacity={0.9} />
      <Path d="M15 80c15-22 31-22 46 0 17-25 38-21 45 5H15Z" fill="#FFFFFF" opacity={0.9} />
      <Path d="M0 164c55-62 115-50 146-6 44-55 101-42 154 6v41H0Z" fill="#90D678" />
      <Path d="M0 178c61-32 107-20 147 2 43-23 92-35 153-3v28H0Z" fill="#5EBB67" />
      <Ellipse cx="151" cy="181" rx="62" ry="14" fill="#B97A4B" opacity={0.25} />
      <Path d="M123 135c9-20 45-20 54 0l6 32c2 15-12 25-33 25s-35-10-32-25l5-32Z" fill="#FFFFFF" />
      <Circle cx="133" cy="127" r="14" fill="#28313B" />
      <Circle cx="167" cy="127" r="14" fill="#28313B" />
      <Circle cx="150" cy="141" r="31" fill="#FFFFFF" />
      <Ellipse cx="139" cy="139" rx="7" ry="9" fill="#28313B" />
      <Ellipse cx="161" cy="139" rx="7" ry="9" fill="#28313B" />
      <Circle cx="141" cy="136" r="2" fill="#FFFFFF" />
      <Circle cx="163" cy="136" r="2" fill="#FFFFFF" />
      <Ellipse cx="150" cy="152" rx="6" ry="4" fill="#28313B" />
      <Path d="M143 160c4 5 10 5 14 0" fill="none" stroke="#28313B" strokeWidth="2.5" strokeLinecap="round" />
      <G opacity={0.8}>
        <Circle cx="87" cy="112" r="5" fill={colors.orange} />
        <Circle cx="211" cy="105" r="6" fill={colors.blue} />
        <Circle cx="229" cy="137" r="4" fill={colors.yellow} />
      </G>
    </Svg>
  );
}
