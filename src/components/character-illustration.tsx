import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { getCharacterImageSource } from '@/content';
import type { CharacterContent, IllustrationMotif } from '@/content/models';
import { colors, fonts, radii } from '@/theme/tokens';

type Motif = IllustrationMotif;

export type IllustrationSpec = {
  readonly key: string;
  readonly motif: Motif;
  readonly variant: string;
  readonly word: string;
  readonly seed: number;
  readonly accent: string;
  readonly soft: string;
};

const NUMBER_VALUES: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  few: 2,
  many: 8,
  half: 5,
};

const MOTIF_PALETTES: Readonly<Record<Motif, { accent: string; soft: string }>> = {
  number: { accent: colors.orange, soft: colors.orangeSoft },
  direction: { accent: colors.blue, soft: colors.blueSoft },
  person: { accent: colors.orange, soft: colors.orangeSoft },
  family: { accent: colors.orange, soft: colors.orangeSoft },
  body: { accent: colors.yellow, soft: colors.yellowSoft },
  sun: { accent: colors.yellow, soft: colors.yellowSoft },
  moon: { accent: colors.blue, soft: colors.blueSoft },
  weather: { accent: colors.blue, soft: colors.blueSoft },
  water: { accent: colors.blue, soft: colors.blueSoft },
  fire: { accent: colors.orange, soft: colors.orangeSoft },
  mountain: { accent: colors.green, soft: colors.greenSoft },
  plant: { accent: colors.green, soft: colors.greenSoft },
  animal: { accent: colors.orange, soft: colors.orangeSoft },
  fish: { accent: colors.blue, soft: colors.blueSoft },
  bird: { accent: colors.orange, soft: colors.orangeSoft },
  food: { accent: colors.yellow, soft: colors.yellowSoft },
  school: { accent: colors.blue, soft: colors.blueSoft },
  transport: { accent: colors.orange, soft: colors.orangeSoft },
  place: { accent: colors.green, soft: colors.greenSoft },
  emotion: { accent: colors.yellow, soft: colors.yellowSoft },
  action: { accent: colors.blue, soft: colors.blueSoft },
  time: { accent: colors.orange, soft: colors.orangeSoft },
  color: { accent: colors.blue, soft: colors.blueSoft },
  daily: { accent: colors.blue, soft: colors.blueSoft },
};

const COLOR_SWATCHES: Readonly<Record<string, string>> = {
  red: '#F25F5C',
  yellow: colors.yellow,
  blue: colors.blue,
  green: colors.green,
  white: '#FFFFFF',
  black: '#24272C',
  cyan: '#26C6DA',
  teal: '#26A69A',
  rainbow: '#F25F5C',
  color: colors.blue,
};

function stableSeed(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function paletteFor(motif: Motif, variant: string) {
  if (motif === 'color') {
    const swatch = COLOR_SWATCHES[variant] ?? colors.blue;
    return { accent: swatch === '#FFFFFF' ? colors.blue : swatch, soft: MOTIF_PALETTES.color.soft };
  }
  return MOTIF_PALETTES[motif];
}

export function getCharacterIllustrationSpec(character: CharacterContent): IllustrationSpec {
  const motif = character.illustration.motif ?? 'daily';
  const variant = character.illustration.variant || motif;
  const caption = character.illustration.caption ?? '';
  const seed = stableSeed(`${character.id}:${motif}:${variant}`);
  const palette = paletteFor(motif, variant);

  return {
    key: `${character.id}:${motif}:${variant}:${caption}`,
    motif,
    variant,
    word: caption || character.hanzi,
    seed,
    accent: palette.accent,
    soft: palette.soft,
  };
}

function Decor({ seed, accent }: { seed: number; accent: string }) {
  const x1 = 16 + (seed % 16);
  const y1 = 18 + ((seed >>> 4) % 14);
  const x2 = 124 + ((seed >>> 8) % 18);
  const y2 = 18 + ((seed >>> 12) % 20);
  return (
    <G opacity={0.55}>
      <Circle cx={x1} cy={y1} r="4" fill={accent} />
      <Path d={`M ${x2} ${y2} l 3 6 7 1 -5 5 1 7 -7 -3 -6 3 1 -7 -5 -5 7 -1 Z`} fill={accent} />
    </G>
  );
}

function NumberArt({ variant, accent }: { variant: string; accent: string }) {
  const count = NUMBER_VALUES[variant] ?? 6;
  const dots = Array.from({ length: Math.min(count, 10) }, (_, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    return <Circle key={index} cx={56 + col * 13} cy={53 + row * 18} r="5.5" fill={accent} />;
  });
  return <G>{dots}</G>;
}

function DirectionArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'center') {
    return (
      <G>
        <Circle cx="80" cy="64" r="10" fill={accent} />
        <Line x1="80" y1="28" x2="80" y2="48" stroke={accent} strokeWidth="6" strokeLinecap="round" />
        <Line x1="80" y1="80" x2="80" y2="100" stroke={accent} strokeWidth="6" strokeLinecap="round" />
        <Line x1="44" y1="64" x2="64" y2="64" stroke={accent} strokeWidth="6" strokeLinecap="round" />
        <Line x1="96" y1="64" x2="116" y2="64" stroke={accent} strokeWidth="6" strokeLinecap="round" />
      </G>
    );
  }
  if (variant === 'inside') {
    return (
      <G>
        <Rect x="44" y="34" width="72" height="60" rx="10" fill="none" stroke={accent} strokeWidth="6" />
        <Path d="M80 46 L80 82 M68 70 L80 82 L92 70" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </G>
    );
  }
  if (variant === 'out') {
    return (
      <G>
        <Rect x="50" y="42" width="60" height="44" rx="8" fill="none" stroke={accent} strokeWidth="6" />
        <Path d="M80 28 L80 52 M68 40 L80 28 L92 40" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </G>
    );
  }
  const rotate =
    variant === 'down' || variant === 'south' ? 180
    : variant === 'left' || variant === 'west' ? 270
    : variant === 'right' || variant === 'east' || variant === 'side' ? 90
    : variant === 'back' ? 180
    : 0;
  return (
    <G rotation={rotate} origin="80,64">
      <Path d="M80 34 L110 68 H94 V92 H66 V68 H50 Z" fill={accent} />
    </G>
  );
}

function PersonFigure({ x, accent, size = 12, bow = false, crown = false, hat = false }: { x: number; accent: string; size?: number; bow?: boolean; crown?: boolean; hat?: boolean }) {
  const body = size > 10 ? 16 : 12;
  return (
    <G>
      {crown ? <Polygon points={`${x - 10},${42} ${x},${30} ${x + 10},${42}`} fill={colors.yellow} /> : null}
      {hat ? <Rect x={x - 14} y={34} width={28} height={8} rx={3} fill={accent} /> : null}
      {bow ? <Circle cx={x + 10} cy={40} r="5" fill="#F25F5C" /> : null}
      <Circle cx={x} cy={48} r={size} fill={accent} />
      <Path d={`M${x - body} 91 Q ${x} 62 ${x + body} 91 Z`} fill={accent} />
    </G>
  );
}

function PersonArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'family' || variant === 'home') {
    return (
      <G>
        <PersonFigure x={58} accent={accent} size={9} />
        <PersonFigure x={82} accent={accent} size={11} />
        <PersonFigure x={106} accent={accent} size={8} />
      </G>
    );
  }
  if (variant === 'friend') {
    return (
      <G>
        <PersonFigure x={64} accent={accent} size={11} />
        <PersonFigure x={96} accent={accent} size={11} />
      </G>
    );
  }
  if (variant === 'king') return <PersonFigure x={80} accent={accent} crown />;
  if (variant === 'worker') return <PersonFigure x={80} accent={accent} hat />;
  if (variant === 'girl' || variant === 'mom' || variant === 'sister' || variant === 'grandma') {
    return <PersonFigure x={80} accent={accent} bow size={variant === 'grandma' ? 11 : variant === 'mom' ? 12 : 10} />;
  }
  if (variant === 'child') return <PersonFigure x={80} accent={accent} size={9} />;
  if (variant === 'dad' || variant === 'grandpa' || variant === 'brother') {
    return <PersonFigure x={80} accent={accent} size={variant === 'brother' ? 10 : 12} hat={variant === 'grandpa'} />;
  }
  if (variant === 'boy') return <PersonFigure x={80} accent={accent} />;
  return <PersonFigure x={80} accent={accent} />;
}

function BodyArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'mouth' || variant === 'tooth') {
    return (
      <G>
        <Circle cx="80" cy="63" r="31" fill="#FFFFFF" stroke={accent} strokeWidth="6" />
        <Circle cx="68" cy="54" r="3" fill={colors.ink} />
        <Circle cx="92" cy="54" r="3" fill={colors.ink} />
        {variant === 'tooth' ? (
          <G>
            <Rect x="62" y="68" width="10" height="12" rx="2" fill={accent} />
            <Rect x="75" y="68" width="10" height="12" rx="2" fill={accent} />
            <Rect x="88" y="68" width="10" height="12" rx="2" fill={accent} />
          </G>
        ) : (
          <Path d="M63 70 Q80 87 97 70" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        )}
      </G>
    );
  }
  if (variant === 'ear') {
    return <Path d="M88 35 C58 28 51 48 57 63 C61 74 73 71 73 83 C73 98 96 98 96 79 C96 65 79 67 80 56 C80 49 90 48 92 56" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />;
  }
  if (variant === 'eye') {
    return (
      <G>
        <Path d="M40 65 Q80 34 120 65 Q80 96 40 65 Z" fill="#FFFFFF" stroke={accent} strokeWidth="5" />
        <Circle cx="80" cy="65" r="14" fill={accent} />
        <Circle cx="84" cy="61" r="4" fill="#FFFFFF" />
      </G>
    );
  }
  if (variant === 'hand') {
    return <Path d="M57 85 V60 C57 52 67 52 67 60 V70 V47 C67 39 77 39 77 47 V68 V43 C77 35 87 35 87 43 V69 V49 C87 41 97 41 97 49 V76 C97 99 72 105 57 85 Z" fill={accent} />;
  }
  if (variant === 'head' || variant === 'hair' || variant === 'face' || variant === 'neck') {
    return (
      <G>
        <Circle cx="80" cy="58" r="24" fill={accent} />
        {variant === 'hair' || variant === 'head' ? <Path d="M56 50 Q80 22 104 50" fill={accent} /> : null}
        {variant === 'neck' ? <Rect x="72" y="80" width="16" height="18" rx="4" fill={accent} /> : null}
        <Circle cx="72" cy="56" r="3" fill="#FFFFFF" />
        <Circle cx="88" cy="56" r="3" fill="#FFFFFF" />
      </G>
    );
  }
  if (variant === 'foot') {
    return (
      <G>
        <Ellipse cx="80" cy="70" rx="28" ry="16" fill={accent} />
        <Circle cx="56" cy="62" r="8" fill={accent} />
        <Circle cx="64" cy="52" r="7" fill={accent} />
        <Circle cx="78" cy="48" r="7" fill={accent} />
        <Circle cx="92" cy="52" r="7" fill={accent} />
      </G>
    );
  }
  if (variant === 'belly') return <Ellipse cx="80" cy="70" rx="28" ry="24" fill={accent} />;
  if (variant === 'clothes') {
    return (
      <G>
        <Path d="M52 48 L80 38 L108 48 L118 96 H42 Z" fill={accent} />
        <Rect x="72" y="60" width="16" height="36" fill="#FFFFFF" opacity={0.5} />
      </G>
    );
  }
  return <PersonFigure x={80} accent={accent} />;
}

function SunArt({ accent }: { accent: string }) {
  return (
    <G>
      <Circle cx="80" cy="63" r="24" fill={accent} />
      {[0, 45, 90, 135].map((angle) => (
        <Line key={angle} x1="80" y1="24" x2="80" y2="13" stroke={accent} strokeWidth="5" strokeLinecap="round" rotation={angle} origin="80,63" />
      ))}
    </G>
  );
}

function MoonArt({ accent, soft }: { accent: string; soft: string }) {
  return (
    <G>
      <Circle cx="76" cy="62" r="30" fill={accent} />
      <Circle cx="90" cy="50" r="28" fill={soft} />
      <Circle cx="118" cy="34" r="4" fill={accent} />
    </G>
  );
}

function WeatherArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'snow') {
    return (
      <G stroke={accent} strokeWidth="5" strokeLinecap="round">
        <Line x1="80" y1="37" x2="80" y2="91" />
        <Line x1="56" y1="51" x2="104" y2="78" />
        <Line x1="56" y1="78" x2="104" y2="51" />
      </G>
    );
  }
  if (variant === 'bolt') {
    return <Path d="M83 28 L61 66 H79 L70 101 L104 55 H85 Z" fill={accent} />;
  }
  if (variant === 'star') {
    return <Path d="M80 28 L88 56 H118 L94 74 L102 102 L80 84 L58 102 L66 74 L42 56 H72 Z" fill={accent} />;
  }
  if (variant === 'sun') return <SunArt accent={accent} />;
  if (variant === 'wind') {
    return (
      <G fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round">
        <Path d="M42 48 C70 36 90 44 122 40" />
        <Path d="M42 68 C74 56 96 72 122 62" />
        <Path d="M42 88 C68 78 94 90 122 82" />
      </G>
    );
  }
  if (variant === 'sky') {
    return (
      <G>
        <Circle cx="80" cy="46" r="16" fill={colors.yellow} />
        <Circle cx="52" cy="70" r="14" fill={accent} />
        <Circle cx="70" cy="64" r="18" fill={accent} />
        <Circle cx="92" cy="68" r="14" fill={accent} />
      </G>
    );
  }
  return (
    <G>
      <Circle cx="67" cy="53" r="17" fill={accent} />
      <Circle cx="84" cy="47" r="21" fill={accent} />
      <Circle cx="102" cy="56" r="15" fill={accent} />
      <Rect x="54" y="55" width="60" height="18" rx="9" fill={accent} />
      {variant === 'rain' ? [64, 82, 100].map((x) => <Line key={x} x1={x} y1="80" x2={x - 6} y2="94" stroke={accent} strokeWidth="4" strokeLinecap="round" />) : null}
    </G>
  );
}

function WaterArt({ accent }: { accent: string }) {
  return (
    <G fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round">
      <Path d="M38 52 C50 42 60 42 72 52 C84 62 94 62 106 52 C114 45 120 44 126 47" />
      <Path d="M38 75 C50 65 60 65 72 75 C84 85 94 85 106 75 C114 68 120 67 126 70" />
    </G>
  );
}

function FireArt({ accent }: { accent: string }) {
  return <Path d="M82 26 C94 45 91 52 105 60 C117 67 114 91 97 100 C78 111 51 99 50 78 C49 63 61 57 67 45 C72 58 80 55 82 26 Z M80 65 C72 74 70 86 81 90 C92 86 92 76 80 65 Z" fill={accent} fillRule="evenodd" />;
}

function MountainArt({ variant, accent, soft }: { variant: string; accent: string; soft: string }) {
  if (variant === 'rock') {
    return (
      <G>
        <Polygon points="44,92 58,48 92,42 118,92" fill={accent} />
        <Polygon points="62,92 80,58 104,92" fill={soft} opacity={0.7} />
      </G>
    );
  }
  if (variant === 'soil') {
    return (
      <G>
        <Ellipse cx="80" cy="82" rx="42" ry="16" fill={accent} />
        <Ellipse cx="58" cy="74" rx="12" ry="6" fill={soft} />
        <Ellipse cx="96" cy="76" rx="14" ry="7" fill={soft} />
      </G>
    );
  }
  return (
    <G>
      <Polygon points="33,92 67,43 91,92" fill={accent} />
      <Polygon points="68,92 101,53 129,92" fill={accent} opacity={0.72} />
      <Polygon points="55,59 67,43 77,58 69,55 64,61" fill={soft} />
    </G>
  );
}

function PlantArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'flower' || variant === 'lotus') {
    return (
      <G>
        {[0, 72, 144, 216, 288].map((angle) => <Ellipse key={angle} cx="80" cy="48" rx="9" ry="20" fill={accent} rotation={angle} origin="80,65" />)}
        <Circle cx="80" cy="65" r="8" fill={colors.yellow} />
        <Line x1="80" y1="74" x2="80" y2="98" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      </G>
    );
  }
  if (variant === 'field') {
    return (
      <G>
        <Rect x="34" y="52" width="92" height="44" rx="6" fill={accent} />
        <Line x1="34" y1="66" x2="126" y2="66" stroke="#FFFFFF" strokeWidth="3" opacity={0.6} />
        <Line x1="34" y1="80" x2="126" y2="80" stroke="#FFFFFF" strokeWidth="3" opacity={0.6} />
        <Line x1="64" y1="52" x2="64" y2="96" stroke="#FFFFFF" strokeWidth="3" opacity={0.6} />
        <Line x1="96" y1="52" x2="96" y2="96" stroke="#FFFFFF" strokeWidth="3" opacity={0.6} />
      </G>
    );
  }
  if (variant === 'bamboo') {
    return (
      <G>
        <Rect x="72" y="28" width="16" height="70" rx="6" fill={accent} />
        <Line x1="72" y1="50" x2="88" y2="50" stroke="#FFFFFF" strokeWidth="4" />
        <Line x1="72" y1="72" x2="88" y2="72" stroke="#FFFFFF" strokeWidth="4" />
        <Ellipse cx="58" cy="44" rx="14" ry="8" fill={accent} />
        <Ellipse cx="104" cy="58" rx="14" ry="8" fill={accent} />
      </G>
    );
  }
  if (variant === 'leaf' || variant === 'grass') {
    return (
      <G>
        <Path d="M80 96 C52 78 48 50 80 28 C112 50 108 78 80 96 Z" fill={accent} />
        <Line x1="80" y1="34" x2="80" y2="90" stroke="#FFFFFF" strokeWidth="3" opacity={0.6} />
      </G>
    );
  }
  if (variant === 'seedling' || variant === 'grain' || variant === 'seed') {
    return (
      <G>
        <Line x1="80" y1="46" x2="80" y2="98" stroke={accent} strokeWidth="6" strokeLinecap="round" />
        <Ellipse cx="66" cy="52" rx="14" ry="8" fill={accent} />
        <Ellipse cx="94" cy="58" rx="14" ry="8" fill={accent} />
      </G>
    );
  }
  if (variant === 'forest' || variant === 'pine') {
    return (
      <G>
        <Polygon points="46,92 62,42 78,92" fill={accent} />
        <Polygon points="70,92 90,30 110,92" fill={accent} />
        <Polygon points="92,92 108,48 124,92" fill={accent} opacity={0.8} />
      </G>
    );
  }
  if (variant === 'apple' || variant === 'melon') {
    return (
      <G>
        <Circle cx="80" cy="66" r="26" fill={variant === 'apple' ? '#F25F5C' : accent} />
        <Path d="M80 42 Q88 28 98 34" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      </G>
    );
  }
  return (
    <G>
      <Rect x="74" y="61" width="12" height="37" rx="5" fill={accent} />
      <Circle cx="80" cy="51" r="26" fill={accent} />
      <Circle cx="62" cy="61" r="18" fill={accent} />
      <Circle cx="98" cy="61" r="18" fill={accent} />
    </G>
  );
}

function AnimalArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'horse') {
    return (
      <G>
        <Ellipse cx="86" cy="70" rx="30" ry="18" fill={accent} />
        <Path d="M62 62 L48 40 L58 38 L72 58" fill={accent} />
        <Rect x="70" y="84" width="7" height="18" rx="3" fill={accent} />
        <Rect x="98" y="84" width="7" height="18" rx="3" fill={accent} />
        <Circle cx="50" cy="38" r="3" fill="#FFFFFF" />
      </G>
    );
  }
  if (variant === 'cow') {
    return (
      <G>
        <Ellipse cx="84" cy="70" rx="32" ry="20" fill={accent} />
        <Circle cx="54" cy="54" r="14" fill={accent} />
        <Polygon points="44,44 38,30 52,42" fill={accent} />
        <Polygon points="64,42 70,30 74,44" fill={accent} />
        <Rect x="70" y="86" width="8" height="16" rx="3" fill={accent} />
        <Rect x="96" y="86" width="8" height="16" rx="3" fill={accent} />
      </G>
    );
  }
  if (variant === 'sheep') {
    return (
      <G>
        <Circle cx="62" cy="66" r="16" fill={accent} />
        <Circle cx="80" cy="58" r="18" fill={accent} />
        <Circle cx="98" cy="66" r="16" fill={accent} />
        <Circle cx="80" cy="76" r="16" fill={accent} />
        <Circle cx="52" cy="52" r="10" fill={accent} />
        <Circle cx="48" cy="50" r="2.5" fill="#FFFFFF" />
      </G>
    );
  }
  if (variant === 'bug') {
    return (
      <G>
        <Ellipse cx="80" cy="66" rx="22" ry="16" fill={accent} />
        <Circle cx="104" cy="58" r="10" fill={accent} />
        <Line x1="58" y1="54" x2="44" y2="42" stroke={accent} strokeWidth="4" strokeLinecap="round" />
        <Line x1="58" y1="78" x2="44" y2="90" stroke={accent} strokeWidth="4" strokeLinecap="round" />
        <Line x1="110" y1="48" x2="118" y2="36" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      </G>
    );
  }
  if (variant === 'snake') {
    return <Path d="M40 78 C58 50 78 96 98 58 C108 42 122 48 126 58" fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round" />;
  }
  if (variant === 'elephant') {
    return (
      <G>
        <Ellipse cx="86" cy="70" rx="30" ry="20" fill={accent} />
        <Circle cx="58" cy="56" r="16" fill={accent} />
        <Path d="M46 62 Q34 88 52 94" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" />
        <Rect x="74" y="86" width="8" height="16" rx="3" fill={accent} />
        <Rect x="98" y="86" width="8" height="16" rx="3" fill={accent} />
      </G>
    );
  }
  if (variant === 'frog' || variant === 'tadpole') {
    return (
      <G>
        <Ellipse cx="80" cy="72" rx="26" ry="18" fill={accent} />
        <Circle cx="64" cy="52" r="10" fill={accent} />
        <Circle cx="96" cy="52" r="10" fill={accent} />
        <Circle cx="64" cy="50" r="3" fill="#FFFFFF" />
        <Circle cx="96" cy="50" r="3" fill="#FFFFFF" />
      </G>
    );
  }
  if (variant === 'paw' || variant === 'shell') {
    return (
      <G>
        <Ellipse cx="80" cy="74" rx="22" ry="16" fill={accent} />
        <Circle cx="58" cy="56" r="8" fill={accent} />
        <Circle cx="74" cy="48" r="8" fill={accent} />
        <Circle cx="92" cy="48" r="8" fill={accent} />
        <Circle cx="106" cy="56" r="8" fill={accent} />
      </G>
    );
  }
  const roundEars = variant === 'cat' || variant === 'rabbit';
  const tallEars = variant === 'rabbit' || variant === 'hedgehog';
  return (
    <G>
      {roundEars ? (
        <>
          <Circle cx="58" cy={tallEars ? 30 : 42} r={tallEars ? 8 : 13} fill={accent} />
          <Circle cx="102" cy={tallEars ? 30 : 42} r={tallEars ? 8 : 13} fill={accent} />
          {tallEars ? (
            <>
              <Ellipse cx="58" cy="38" rx="7" ry="16" fill={accent} />
              <Ellipse cx="102" cy="38" rx="7" ry="16" fill={accent} />
            </>
          ) : null}
        </>
      ) : (
        <>
          <Polygon points="50,48 58,27 70,49" fill={accent} />
          <Polygon points="90,49 102,27 110,48" fill={accent} />
        </>
      )}
      <Ellipse cx="80" cy="66" rx="36" ry="31" fill={accent} />
      <Circle cx="67" cy="60" r="4" fill="#FFFFFF" />
      <Circle cx="93" cy="60" r="4" fill="#FFFFFF" />
      <Ellipse cx="80" cy="72" rx="7" ry="5" fill="#FFFFFF" />
      <Path d="M80 76 Q70 83 65 78 M80 76 Q90 83 95 78" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </G>
  );
}

function FishArt({ accent }: { accent: string }) {
  return (
    <G>
      <Ellipse cx="78" cy="65" rx="32" ry="20" fill={accent} />
      <Polygon points="106,65 128,47 128,83" fill={accent} />
      <Circle cx="65" cy="60" r="3.5" fill="#FFFFFF" />
      <Path d="M84 57 Q94 65 84 73" fill="none" stroke="#FFFFFF" strokeWidth="3" />
    </G>
  );
}

function BirdArt({ variant, accent }: { variant: string; accent: string }) {
  const comb = variant === 'chicken';
  const bill = variant === 'duck' ? (
    <Ellipse cx="122" cy="58" rx="12" ry="6" fill={colors.orange} />
  ) : (
    <Polygon points="112,52 129,58 112,63" fill={colors.orange} />
  );
  return (
    <G>
      <Ellipse cx="78" cy="66" rx="29" ry="22" fill={accent} />
      <Circle cx="99" cy="53" r="15" fill={accent} />
      {bill}
      {comb ? <Path d="M92 38 Q99 26 106 38" fill="#F25F5C" /> : null}
      <Circle cx="103" cy="49" r="3" fill="#FFFFFF" />
      <Path d="M65 63 Q80 45 91 68 Q77 78 65 63 Z" fill="#FFFFFF" opacity={0.72} />
    </G>
  );
}

function FoodArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'rice' || variant === 'ricebowl' || variant === 'eat') {
    return (
      <G>
        <Path d="M45 60 H115 C112 87 99 98 80 98 C61 98 48 87 45 60 Z" fill={accent} />
        <Path d="M52 58 Q80 38 108 58" fill="#FFFFFF" stroke={accent} strokeWidth="5" />
        <Line x1="106" y1="31" x2="86" y2="69" stroke={colors.orange} strokeWidth="4" strokeLinecap="round" />
        <Line x1="118" y1="36" x2="96" y2="72" stroke={colors.orange} strokeWidth="4" strokeLinecap="round" />
      </G>
    );
  }
  if (variant === 'noodles') {
    return (
      <G>
        <Path d="M45 60 H115 C112 87 99 98 80 98 C61 98 48 87 45 60 Z" fill={accent} />
        <Path d="M56 52 C70 40 78 70 92 48 C100 38 110 52 112 58" fill="none" stroke={colors.yellow} strokeWidth="5" strokeLinecap="round" />
      </G>
    );
  }
  if (variant === 'egg') return <Ellipse cx="80" cy="64" rx="22" ry="28" fill="#FFFFFF" stroke={accent} strokeWidth="5" />;
  if (variant === 'cup') {
    return (
      <G>
        <Path d="M52 40 H100 L94 92 H58 Z" fill={accent} />
        <Path d="M100 50 C118 50 118 78 100 78" fill="none" stroke={accent} strokeWidth="6" />
      </G>
    );
  }
  if (variant === 'spoon') {
    return (
      <G>
        <Ellipse cx="62" cy="50" rx="16" ry="12" fill={accent} />
        <Rect x="70" y="52" width="48" height="8" rx="4" fill={accent} rotation={20} origin="70,56" />
      </G>
    );
  }
  if (variant === 'meat') return <Ellipse cx="80" cy="66" rx="28" ry="18" fill={accent} />;
  if (variant === 'sweet') {
    return (
      <G>
        <Polygon points="80,34 108,64 80,94 52,64" fill={accent} />
        <Circle cx="80" cy="64" r="10" fill="#FFFFFF" />
      </G>
    );
  }
  return (
    <G>
      <Path d="M45 60 H115 C112 87 99 98 80 98 C61 98 48 87 45 60 Z" fill={accent} />
      <Path d="M52 58 Q80 38 108 58" fill="#FFFFFF" stroke={accent} strokeWidth="5" />
    </G>
  );
}

function SchoolArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'pen') {
    return (
      <G>
        <Rect x="70" y="28" width="20" height="64" rx="6" fill={accent} rotation={-20} origin="80,60" />
        <Polygon points="62,92 80,110 74,86" fill={colors.orange} />
      </G>
    );
  }
  if (variant === 'ruler') {
    return (
      <G>
        <Rect x="38" y="52" width="84" height="22" rx="6" fill={accent} />
        {[50, 62, 74, 86, 98, 110].map((x) => <Line key={x} x1={x} y1="52" x2={x} y2="64" stroke="#FFFFFF" strokeWidth="3" />)}
      </G>
    );
  }
  if (variant === 'paper') {
    return (
      <G>
        <Rect x="48" y="30" width="64" height="72" rx="6" fill="#FFFFFF" stroke={accent} strokeWidth="5" />
        <Line x1="60" y1="50" x2="100" y2="50" stroke={accent} strokeWidth="4" />
        <Line x1="60" y1="66" x2="100" y2="66" stroke={accent} strokeWidth="4" />
        <Line x1="60" y1="82" x2="88" y2="82" stroke={accent} strokeWidth="4" />
      </G>
    );
  }
  if (variant === 'draw') {
    return (
      <G>
        <Rect x="40" y="34" width="80" height="56" rx="8" fill="#FFFFFF" stroke={accent} strokeWidth="5" />
        <Circle cx="80" cy="62" r="12" fill={accent} />
        <Rect x="108" y="70" width="10" height="28" rx="3" fill={colors.orange} rotation={-30} origin="113,84" />
      </G>
    );
  }
  if (variant === 'teacher') return <PersonFigure x={80} accent={accent} hat />;
  return (
    <G>
      <Path d="M42 43 Q62 35 80 48 V94 Q61 81 42 88 Z" fill={accent} />
      <Path d="M118 43 Q98 35 80 48 V94 Q99 81 118 88 Z" fill={accent} opacity={0.75} />
      <Line x1="80" y1="48" x2="80" y2="94" stroke="#FFFFFF" strokeWidth="3" />
      <Path d="M107 30 L116 39 L94 61 L84 63 L86 53 Z" fill={colors.orange} />
    </G>
  );
}

function TransportArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'boat') {
    return (
      <G>
        <Path d="M36 70 L124 70 L110 92 H50 Z" fill={accent} />
        <Path d="M80 70 L80 34 L108 70 Z" fill={colors.yellow} />
      </G>
    );
  }
  return (
    <G>
      <Rect x="39" y="45" width="82" height="42" rx="12" fill={accent} />
      <Rect x="48" y="52" width="24" height="14" rx="4" fill="#FFFFFF" opacity={0.9} />
      <Rect x="78" y="52" width="33" height="14" rx="4" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="58" cy="90" r="9" fill={colors.ink} />
      <Circle cx="102" cy="90" r="9" fill={colors.ink} />
      <Circle cx="58" cy="90" r="4" fill="#FFFFFF" />
      <Circle cx="102" cy="90" r="4" fill="#FFFFFF" />
    </G>
  );
}

function PlaceArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'door') {
    return (
      <G>
        <Rect x="52" y="28" width="56" height="72" rx="6" fill={accent} />
        <Rect x="60" y="36" width="40" height="64" rx="4" fill="#FFFFFF" />
        <Circle cx="90" cy="70" r="4" fill={accent} />
      </G>
    );
  }
  if (variant === 'factory') {
    return (
      <G>
        <Rect x="40" y="58" width="80" height="38" fill={accent} />
        <Rect x="48" y="34" width="16" height="24" fill={accent} />
        <Rect x="72" y="42" width="16" height="16" fill={accent} />
        <Rect x="96" y="28" width="16" height="30" fill={accent} />
        <Rect x="66" y="70" width="14" height="26" fill="#FFFFFF" />
      </G>
    );
  }
  if (variant === 'park') {
    return (
      <G>
        <Rect x="74" y="62" width="12" height="34" rx="4" fill={accent} />
        <Circle cx="80" cy="50" r="24" fill={accent} />
        <Circle cx="58" cy="62" r="16" fill={accent} />
        <Circle cx="102" cy="62" r="16" fill={accent} />
      </G>
    );
  }
  if (variant === 'nation') {
    return (
      <G>
        <Rect x="44" y="36" width="72" height="48" rx="6" fill={accent} />
        <Line x1="80" y1="28" x2="80" y2="92" stroke={accent} strokeWidth="6" strokeLinecap="round" />
        <Polygon points="80,30 118,42 80,54" fill="#F25F5C" />
      </G>
    );
  }
  return (
    <G>
      <Polygon points="39,59 80,29 121,59" fill={accent} />
      <Rect x="49" y="57" width="62" height="39" rx="4" fill={accent} opacity={0.78} />
      <Rect x="71" y="69" width="18" height="27" rx="3" fill="#FFFFFF" />
      <Rect x="54" y="66" width="11" height="12" rx="2" fill="#FFFFFF" />
      <Rect x="95" y="66" width="11" height="12" rx="2" fill="#FFFFFF" />
    </G>
  );
}

function EmotionArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'heart') {
    return <Path d="M80 98 C61 82 41 70 43 51 C45 35 65 31 80 48 C95 31 115 35 117 51 C119 70 99 82 80 98 Z" fill={accent} />;
  }
  const sad = variant === 'sad';
  return (
    <G>
      <Circle cx="80" cy="64" r="34" fill={accent} />
      <Circle cx="68" cy="57" r="4" fill="#FFFFFF" />
      <Circle cx="92" cy="57" r="4" fill="#FFFFFF" />
      <Path d={sad ? 'M64 82 Q80 68 96 82' : 'M64 72 Q80 88 96 72'} fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
    </G>
  );
}

function ActionArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'open' || variant === 'close') {
    return (
      <G>
        <Rect x="44" y="30" width="28" height="70" rx="4" fill={accent} />
        <Rect x="88" y="30" width="28" height="70" rx="4" fill={accent} opacity={variant === 'open' ? 0.55 : 1} />
        {variant === 'open' ? <Rect x="72" y="30" width="16" height="70" fill={colors.yellowSoft} /> : null}
      </G>
    );
  }
  if (variant === 'look') {
    return (
      <G>
        <Path d="M40 65 Q80 34 120 65 Q80 96 40 65 Z" fill="#FFFFFF" stroke={accent} strokeWidth="5" />
        <Circle cx="80" cy="65" r="14" fill={accent} />
      </G>
    );
  }
  if (variant === 'sit') {
    return (
      <G fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="70" cy="40" r="10" fill={accent} stroke="none" />
        <Path d="M70 52 L70 70 L98 70 M70 70 L58 96 M98 70 L110 96" />
      </G>
    );
  }
  if (variant === 'stand') {
    return (
      <G fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="80" cy="38" r="10" fill={accent} stroke="none" />
        <Path d="M80 50 L80 75 M80 59 L58 72 M80 59 L103 72 M80 75 L65 98 M80 75 L95 98" />
      </G>
    );
  }
  if (variant === 'knife') {
    return (
      <G>
        <Rect x="74" y="28" width="12" height="48" rx="4" fill={accent} />
        <Rect x="70" y="74" width="20" height="22" rx="4" fill={colors.orange} />
      </G>
    );
  }
  if (variant === 'fly') {
    return (
      <G>
        <Ellipse cx="80" cy="64" rx="36" ry="12" fill={accent} />
        <Polygon points="44,64 28,50 28,78" fill={accent} />
        <Polygon points="70,52 92,36 86,56" fill="#FFFFFF" opacity={0.8} />
      </G>
    );
  }
  const running = variant === 'run' || variant === 'jump' || variant === 'walk' || variant === 'go' || variant === 'come' || variant === 'play' || variant === 'swim' || variant === 'out' || variant === 'in';
  return (
    <G fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="80" cy="38" r="10" fill={accent} stroke="none" />
      <Path d={running ? 'M80 50 L69 72 L48 64 M70 71 L91 79 L106 97 M70 71 L58 96' : 'M80 50 L80 75 M80 59 L58 72 M80 59 L103 72 M80 75 L65 98 M80 75 L95 98'} />
      {running ? <Line x1="38" y1="51" x2="52" y2="51" strokeWidth="4" /> : null}
    </G>
  );
}

function TimeArt({ variant, accent }: { variant: string; accent: string }) {
  if (variant === 'spring' || variant === 'autumn') {
    return (
      <G>
        <Rect x="74" y="58" width="12" height="38" rx="4" fill={accent} />
        <Circle cx="80" cy="50" r="22" fill={variant === 'autumn' ? colors.orange : accent} />
      </G>
    );
  }
  if (variant === 'winter') {
    return (
      <G stroke={accent} strokeWidth="5" strokeLinecap="round">
        <Line x1="80" y1="37" x2="80" y2="91" />
        <Line x1="56" y1="51" x2="104" y2="78" />
        <Line x1="56" y1="78" x2="104" y2="51" />
      </G>
    );
  }
  if (variant === 'morning' || variant === 'noon') return <SunArt accent={accent} />;
  if (variant === 'night') return <MoonArt accent={accent} soft={colors.blueSoft} />;
  return (
    <G>
      <Circle cx="80" cy="64" r="32" fill="#FFFFFF" stroke={accent} strokeWidth="6" />
      <Line x1="80" y1="64" x2="80" y2="43" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      <Line x1="80" y1="64" x2="97" y2="72" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      <Circle cx="80" cy="64" r="4" fill={accent} />
    </G>
  );
}

function ColorArt({ variant }: { variant: string }) {
  if (variant === 'rainbow') {
    return (
      <G fill="none" strokeWidth="8" strokeLinecap="round">
        <Path d="M44 86 A36 36 0 0 1 116 86" stroke="#F25F5C" />
        <Path d="M52 86 A28 28 0 0 1 108 86" stroke={colors.yellow} />
        <Path d="M60 86 A20 20 0 0 1 100 86" stroke={colors.blue} />
      </G>
    );
  }
  const swatch = COLOR_SWATCHES[variant] ?? colors.blue;
  return (
    <G>
      <Circle cx="80" cy="64" r="31" fill={swatch} stroke={colors.outline} strokeWidth="4" />
      <Circle cx="69" cy="53" r="8" fill="#FFFFFF" opacity={0.55} />
    </G>
  );
}

function DailyArt({ accent, seed }: { accent: string; seed: number }) {
  const tilt = (seed % 17) - 8;
  return (
    <G rotation={tilt} origin="80,65">
      <Rect x="48" y="36" width="64" height="58" rx="17" fill={accent} />
      <Circle cx="68" cy="61" r="5" fill="#FFFFFF" />
      <Circle cx="92" cy="61" r="5" fill="#FFFFFF" />
      <Path d="M67 76 Q80 87 93 76" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <Path d="M54 41 L45 28 M106 41 L115 28" stroke={accent} strokeWidth="7" strokeLinecap="round" />
    </G>
  );
}

function MotifArt({ spec }: { spec: IllustrationSpec }) {
  switch (spec.motif) {
    case 'number': return <NumberArt variant={spec.variant} accent={spec.accent} />;
    case 'direction': return <DirectionArt variant={spec.variant} accent={spec.accent} />;
    case 'person': return <PersonArt variant={spec.variant} accent={spec.accent} />;
    case 'family': return <PersonArt variant={spec.variant} accent={spec.accent} />;
    case 'body': return <BodyArt variant={spec.variant} accent={spec.accent} />;
    case 'sun': return <SunArt accent={spec.accent} />;
    case 'moon': return <MoonArt accent={spec.accent} soft={spec.soft} />;
    case 'weather': return <WeatherArt variant={spec.variant} accent={spec.accent} />;
    case 'water': return <WaterArt accent={spec.accent} />;
    case 'fire': return <FireArt accent={spec.accent} />;
    case 'mountain': return <MountainArt variant={spec.variant} accent={spec.accent} soft={spec.soft} />;
    case 'plant': return <PlantArt variant={spec.variant} accent={spec.accent} />;
    case 'animal': return <AnimalArt variant={spec.variant} accent={spec.accent} />;
    case 'fish': return <FishArt accent={spec.accent} />;
    case 'bird': return <BirdArt variant={spec.variant} accent={spec.accent} />;
    case 'food': return <FoodArt variant={spec.variant} accent={spec.accent} />;
    case 'school': return <SchoolArt variant={spec.variant} accent={spec.accent} />;
    case 'transport': return <TransportArt variant={spec.variant} accent={spec.accent} />;
    case 'place': return <PlaceArt variant={spec.variant} accent={spec.accent} />;
    case 'emotion': return <EmotionArt variant={spec.variant} accent={spec.accent} />;
    case 'action': return <ActionArt variant={spec.variant} accent={spec.accent} />;
    case 'time': return <TimeArt variant={spec.variant} accent={spec.accent} />;
    case 'color': return <ColorArt variant={spec.variant} />;
    default: return <DailyArt accent={spec.accent} seed={spec.seed} />;
  }
}

export function CharacterIllustration({ character, size = 180 }: { character: CharacterContent; size?: number }) {
  const spec = getCharacterIllustrationSpec(character);
  const height = Math.round(size * 0.75);
  const caption = character.illustration.caption;
  const imageSource = getCharacterImageSource(character.id);

  if (imageSource) {
    return (
      <View
        accessible
        accessibilityLabel={character.illustration.alt}
        style={{
          width: size,
          height,
          borderRadius: radii.lg,
          overflow: 'hidden',
          backgroundColor: spec.soft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={imageSource}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
          transition={150}
        />
        {caption ? (
          <View
            style={{
              position: 'absolute',
              bottom: 6,
              paddingHorizontal: 12,
              paddingVertical: 3,
              borderRadius: radii.sm,
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
            }}
          >
            <Text
              style={{
                color: colors.ink,
                fontFamily: fonts.bodyBold,
                fontSize: 12,
              }}
            >
              {caption.slice(0, 4)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={character.illustration.alt}
      style={{ width: size, height }}
    >
      <Svg width={size} height={height} viewBox="0 0 160 120">
        <Rect x="9" y="9" width="142" height="102" rx="28" fill={spec.soft} />
        <Decor seed={spec.seed} accent={spec.accent} />
        <MotifArt spec={spec} />
        {caption ? (
          <>
            <Rect x="49" y="92" width="62" height="21" rx={radii.sm} fill="#FFFFFF" opacity={0.92} />
            <SvgText
              x="80"
              y="107"
              textAnchor="middle"
              fill={colors.ink}
              fontFamily={fonts.bodyBold}
              fontSize="12"
            >
              {caption.slice(0, 4)}
            </SvgText>
          </>
        ) : null}
      </Svg>
    </View>
  );
}
