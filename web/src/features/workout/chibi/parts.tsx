import type { ReactNode } from 'react';
import { cx } from '../../../ui/cx';
import styles from './Chibi.module.css';

export type Part =
  | 'base' | 'armsDown' | 'armsHips' | 'armsShoulders' | 'armsCamera' | 'armsCheer'
  | 'arcHead' | 'arcShoulders' | 'dips' | 'scissors' | 'lunge' | 'squat' | 'plank'
  | 'rest' | 'stretch' | 'confetti' | 'armsWave';

const s = (...names: Array<keyof typeof styles>) => cx(...names.map((n) => styles[n]));
const limb = (...names: Array<keyof typeof styles>) => s('line', 'sSkin', ...names);
const glow = s('line', 'sHighlight', 'glow');
const arrow = s('line', 'sAccent');

function Confetto({ at, rx, ry, wing, fill }: { at: string; rx: number; ry: number; wing: number; fill: keyof typeof styles }) {
  return (
    <g transform={at} className={styles[fill]}>
      <ellipse rx={rx} ry={ry} />
      <path d={`M-${rx - 1} 0 L-${wing + rx - 1} -${ry} L-${wing + rx - 1} ${ry} Z M${rx - 1} 0 L${wing + rx - 1} -${ry} L${wing + rx - 1} ${ry} Z`} />
    </g>
  );
}

function Scrap({ x, y, rot, fill }: { x: number; y: number; rot: string; fill: keyof typeof styles }) {
  return <rect x={x} y={y} width="12" height="5" rx="2" transform={rot} className={styles[fill]} />;
}

/** Части рисунка в координатах 300 × 300, как в макете «Chibi». */
export const PART_NODES: Record<Part, ReactNode> = {
  base: (
    <>
      <ellipse cx="150" cy="250" rx="62" ry="8" className={styles.shadow} />
      <path d="M139 196 L137 236" strokeWidth="17" className={limb()} />
      <path d="M161 196 L163 236" strokeWidth="17" className={limb()} />
      <ellipse cx="133" cy="242" rx="13" ry="7.5" className={styles.fDark} />
      <ellipse cx="167" cy="242" rx="13" ry="7.5" className={styles.fDark} />
      <rect x="122" y="128" width="56" height="60" rx="20" className={styles.fOutfit} />
      <rect x="124" y="180" width="52" height="24" rx="9" className={styles.fDark} />
    </>
  ),
  armsDown: (
    <g strokeWidth="15" className={limb()}>
      <path d="M127 142 Q114 160 113 184" />
      <path d="M173 142 Q186 160 187 184" />
    </g>
  ),
  armsHips: (
    <g strokeWidth="15" className={limb()}>
      <path d="M127 142 L106 162 L126 178" />
      <path d="M173 142 L194 162 L174 178" />
    </g>
  ),
  armsShoulders: (
    <g strokeWidth="15" className={limb()}>
      <path d="M128 140 L100 154 L115 136" />
      <path d="M172 140 L200 154 L185 136" />
    </g>
  ),
  armsCamera: (
    <>
      <g strokeWidth="15" className={limb()}>
        <path d="M127 142 Q112 162 124 168" />
        <path d="M173 142 Q188 162 176 168" />
      </g>
      <circle cx="150" cy="164" r="34" strokeWidth="2.5" className={s('line', 'sPrimary', 'ring')} />
      <rect x="137" y="140" width="14" height="9" rx="2" className={styles.fDark} />
      <rect x="124" y="146" width="52" height="36" rx="8" className={styles.fDark} />
      <circle cx="150" cy="164" r="12" className={styles.fSteel} />
      <circle cx="150" cy="164" r="6.5" className={styles.fAccentSoft} />
      <circle cx="167" cy="153" r="3" className={styles.fDanger} />
      <circle cx="124" cy="168" r="8" className={styles.fSkin} />
      <circle cx="176" cy="168" r="8" className={styles.fSkin} />
    </>
  ),
  armsWave: (
    <>
      <g strokeWidth="15" className={limb()}>
        <path d="M127 142 Q114 160 113 184" />
        <path d="M173 142 L198 130 L202 104" />
      </g>
      <circle cx="202" cy="97" r="11" className={styles.fSkin} />
    </>
  ),
  armsCheer: (
    <>
      <g strokeWidth="15" className={limb()}>
        <path d="M127 142 L106 162 L126 178" />
        <path d="M173 142 Q197 132 201 108" />
      </g>
      <rect x="197" y="76" width="9" height="22" rx="4.5" className={styles.fSkin} />
      <circle cx="202" cy="102" r="11" className={styles.fSkin} />
      <path d="M196 98 L208 98 M196 104 L208 104" strokeWidth="1.5" className={s('line', 'sSkinShade')} />
    </>
  ),
  dips: (
    <>
      <ellipse cx="150" cy="256" rx="104" ry="7" className={styles.shadow} />
      <rect x="50" y="198" width="8" height="58" rx="2" className={styles.fGear} />
      <rect x="122" y="198" width="8" height="58" rx="2" className={styles.fGear} />
      <rect x="40" y="186" width="100" height="13" rx="4" className={styles.fGear} />
      <path d="M160 224 L198 212 L224 248" strokeWidth="17" className={limb()} />
      <ellipse cx="231" cy="251" rx="14" ry="7.5" className={styles.fDark} />
      <path d="M147 222 L141 172" strokeWidth="46" className={s('line', 'sOutfit')} />
      <circle cx="154" cy="222" r="21" className={styles.fDark} />
      <path d="M136 172 L106 183 L118 190" strokeWidth="15" className={limb()} />
      <path d="M134 173 L108 182" strokeWidth="8" className={glow} />
      <path d="M86 158 Q80 172 88 184 M84 178 L88 185 L95 180" strokeWidth="2.5" className={arrow} />
    </>
  ),
  scissors: (
    <>
      <ellipse cx="160" cy="257" rx="118" ry="6" className={styles.shadow} />
      <path d="M114 232 L172 238" strokeWidth="42" className={s('line', 'sOutfit')} />
      <ellipse cx="146" cy="235" rx="19" ry="10" className={s('fHighlight', 'glow')} />
      <path d="M186 233 L250 178" strokeWidth="16" className={limb()} />
      <path d="M190 238 L238 166" strokeWidth="16" className={limb()} />
      <circle cx="180" cy="237" r="20" className={styles.fDark} />
      <ellipse cx="255" cy="173" rx="8" ry="12" transform="rotate(48 255 173)" className={styles.fDark} />
      <ellipse cx="241" cy="160" rx="8" ry="12" transform="rotate(34 241 160)" className={styles.fDark} />
      <path d="M118 251 L176 255" strokeWidth="13" className={limb()} />
      <path d="M268 192 Q276 176 266 162 M262 168 L266 161 L273 166" strokeWidth="2.5" className={arrow} />
      <path d="M222 150 Q236 140 250 146 M244 141 L251 146 L245 152" strokeWidth="2.5" className={arrow} />
    </>
  ),
  lunge: (
    <>
      <ellipse cx="148" cy="254" rx="84" ry="7" className={styles.shadow} />
      <path d="M146 198 L120 238 L92 244" strokeWidth="17" className={limb()} />
      <path d="M146 198 L120 238" strokeWidth="8" className={glow} />
      <ellipse cx="86" cy="244" rx="11" ry="7" className={styles.fDark} />
      <path d="M154 198 L192 206 L194 244" strokeWidth="17" className={limb()} />
      <path d="M156 198 L190 206" strokeWidth="8" className={glow} />
      <ellipse cx="200" cy="249" rx="13" ry="7.5" className={styles.fDark} />
      <rect x="124" y="136" width="52" height="58" rx="20" className={styles.fOutfit} />
      <rect x="126" y="184" width="48" height="22" rx="9" className={styles.fDark} />
      <g strokeWidth="15" className={limb()}>
        <path d="M130 148 Q114 166 104 182" />
        <path d="M170 148 Q188 168 202 158" />
      </g>
      <path d="M60 210 L36 210 M44 202 L36 210 L44 218" strokeWidth="2.5" className={arrow} />
    </>
  ),
  squat: (
    <>
      <ellipse cx="150" cy="252" rx="72" ry="8" className={styles.shadow} />
      <path d="M140 204 L110 216 L114 244" strokeWidth="17" className={limb()} />
      <path d="M160 204 L190 216 L186 244" strokeWidth="17" className={limb()} />
      <path d="M138 205 L112 215 M162 205 L188 215" strokeWidth="8" className={glow} />
      <ellipse cx="110" cy="248" rx="13" ry="7.5" className={styles.fDark} />
      <ellipse cx="190" cy="248" rx="13" ry="7.5" className={styles.fDark} />
      <rect x="124" y="146" width="52" height="56" rx="20" className={styles.fOutfit} />
      <rect x="124" y="192" width="52" height="22" rx="9" className={styles.fDark} />
      <g strokeWidth="15" className={limb()}>
        <path d="M128 158 Q116 178 140 182" />
        <path d="M172 158 Q184 178 160 182" />
      </g>
      <rect x="144" y="160" width="12" height="32" rx="3" className={styles.fDark} />
      <rect x="135" y="154" width="30" height="11" rx="4" className={styles.fSteel} />
      <rect x="135" y="187" width="30" height="11" rx="4" className={styles.fSteel} />
      <circle cx="142" cy="181" r="8" className={styles.fSkin} />
      <circle cx="158" cy="181" r="8" className={styles.fSkin} />
    </>
  ),
  plank: (
    <>
      <ellipse cx="160" cy="257" rx="118" ry="6" className={styles.shadow} />
      <path d="M186 228 L248 242" strokeWidth="16" className={limb()} />
      <ellipse cx="255" cy="242" rx="7" ry="11" className={styles.fDark} />
      <path d="M106 216 L170 225" strokeWidth="40" className={s('line', 'sOutfit')} />
      <ellipse cx="140" cy="222" rx="20" ry="10" className={s('fHighlight', 'glow')} />
      <circle cx="178" cy="227" r="19" className={styles.fDark} />
      <path d="M106 224 L108 250 L70 251" strokeWidth="14" className={limb()} />
    </>
  ),
  rest: (
    <>
      <ellipse cx="150" cy="255" rx="78" ry="7" className={styles.shadow} />
      <path d="M130 238 L180 250" strokeWidth="17" className={limb()} />
      <path d="M170 238 L120 250" strokeWidth="17" className={limb()} />
      <ellipse cx="186" cy="251" rx="11" ry="7" className={styles.fDark} />
      <ellipse cx="114" cy="251" rx="11" ry="7" className={styles.fDark} />
      <rect x="124" y="170" width="52" height="62" rx="20" className={styles.fOutfit} />
      <ellipse cx="150" cy="234" rx="34" ry="14" className={styles.fDark} />
      <path d="M128 184 Q112 204 120 226" strokeWidth="15" className={limb()} />
    </>
  ),
  stretch: (
    <>
      <ellipse cx="150" cy="250" rx="72" ry="8" className={styles.shadow} />
      <path d="M140 196 L124 238" strokeWidth="17" className={limb()} />
      <path d="M160 196 L176 238" strokeWidth="17" className={limb()} />
      <ellipse cx="120" cy="243" rx="13" ry="7.5" className={styles.fDark} />
      <ellipse cx="180" cy="243" rx="13" ry="7.5" className={styles.fDark} />
      <path d="M150 182 L144 152" strokeWidth="54" className={s('line', 'sOutfit')} />
      <ellipse cx="170" cy="164" rx="6" ry="17" transform="rotate(-10 170 164)" className={s('fHighlight', 'glow')} />
      <rect x="126" y="180" width="48" height="22" rx="9" className={styles.fDark} />
      <path d="M126 152 Q116 172 126 196" strokeWidth="15" className={limb()} />
    </>
  ),
  arcHead: (
    <g strokeWidth="2.5" className={arrow}>
      <path d="M92 70 A64 64 0 0 1 204 64" strokeDasharray="6 7" />
      <path d="M194 56 L205 66 L191 70" />
    </g>
  ),
  arcShoulders: (
    <g strokeWidth="2.5" className={arrow}>
      <path d="M82 148 A20 20 0 1 1 96 176" />
      <path d="M90 172 L97 177 L92 184" />
      <path d="M218 148 A20 20 0 1 0 204 176" />
      <path d="M210 172 L203 177 L208 184" />
    </g>
  ),
  confetti: (
    <>
      <Confetto at="translate(58 64) rotate(-24)" rx={11} ry={7} wing={8} fill="fHighlight" />
      <Confetto at="translate(250 44) rotate(18)" rx={11} ry={7} wing={8} fill="fOutfit" />
      <Confetto at="translate(40 150) rotate(30)" rx={10} ry={6.5} wing={7} fill="fBlue" />
      <Confetto at="translate(258 150) rotate(-14)" rx={10} ry={6.5} wing={7} fill="fOrange" />
      <Confetto at="translate(96 22) rotate(10)" rx={9} ry={6} wing={6} fill="fAccentSoft" />
      <Scrap x={30} y={98} rot="rotate(35 36 100)" fill="fOutfit" />
      <Scrap x={232} y={96} rot="rotate(-30 238 98)" fill="fHighlight" />
      <Scrap x={200} y={20} rot="rotate(50 206 22)" fill="fBlue" />
      <Scrap x={70} y={196} rot="rotate(-40 76 198)" fill="fHighlightSoft" />
      <Scrap x={236} y={206} rot="rotate(25 242 208)" fill="fAccentSoft" />
      <circle cx="150" cy="18" r="4" className={styles.fHighlight} />
      <circle cx="24" cy="208" r="3.5" className={styles.fBlue} />
      <circle cx="276" cy="100" r="3.5" className={styles.fOutfit} />
    </>
  ),
};

/** Поверх головы: бутылка и рука у позы «отдых», рука над головой у растяжки */
export const OVERLAY_NODES: Partial<Record<Part, ReactNode>> = {
  rest: (
    <>
      <g transform="rotate(-65 186 176)">
        <rect x="179" y="142" width="14" height="34" rx="5" className={styles.fAccentSoft} />
        <rect x="182" y="135" width="8" height="9" rx="2" className={styles.fPrimary} />
      </g>
      <path d="M172 186 Q196 194 188 178" strokeWidth="15" className={limb()} />
      <circle cx="186" cy="176" r="8" className={styles.fSkin} />
    </>
  ),
  stretch: <path d="M164 148 Q210 96 160 38" strokeWidth="15" className={limb()} />,
};
