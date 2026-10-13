/**
 * The app's colours, written as flat hex for the display boards.
 *
 * The three boards arrived with their own palettes — a sky blue, an
 * arcade violet-blue, a lime-on-black esports look — and read as three
 * imported designs rather than three faces of one product. These are the
 * anchors they are now blended onto.
 *
 * WHY HEX AND NOT THE CSS VARIABLES. Everything else in the app reads
 * hsl(var(--primary)) and flips with the theme. These boards must not.
 * A sky is a sky: inverting Star Board in dark mode would put a child's
 * name on a black cloud, and Night League is already dark by design. So
 * the boards take fixed colours, derived from the same tokens the rest
 * of the app computes from — the family matches, the behaviour doesn't.
 *
 * The three anchors come from the app itself:
 *
 *   INDIGO  --primary        hsl(224 64% 33%)
 *   TEAL    --accent         hsl(175 75% 45%)
 *   AMBER   the warm end of the avatar ring gradient, which runs
 *           blue → cyan → amber in Layout's header chip
 *
 * That blue→cyan→amber run is the app's existing visual signature, which
 * is why it is also the axis all three boards are tuned to rather than
 * something invented for them.
 */

/* ------------------------------------------------------- the anchors */

/** --primary, hsl(224 64% 33%). Deep indigo; the app's main colour. */
export const INDIGO = "#1E3B8A";
/** --primary in dark mode, hsl(224 64% 45%). Where indigo needs to carry. */
export const INDIGO_LIGHT = "#2A52BE";
/** A saturated sibling for places that need to read as a lit stage. */
export const INDIGO_VIVID = "#2349C7";

/** --accent, hsl(175 75% 45%). The teal that pairs with indigo. */
export const TEAL = "#1DC9BB";
/** A brighter sibling, for neon on near-black where TEAL goes muddy. */
export const TEAL_NEON = "#25DCCB";
/** The cyan step between indigo and teal in the avatar gradient. */
export const CYAN = "#35D6E0";

/** The warm end of the gradient. Points, stars, first place. */
export const AMBER = "#FFC83D";
export const AMBER_DEEP = "#D68F06";
export const AMBER_SHADOW = "#7A5200";

/* --------------------------------------------------------- neutrals */

/** --foreground, hsl(250 25% 15%). Violet-black, not pure black. */
export const INK = "#201D30";
/** Deeper still, for an arcade outline that must beat every fill. */
export const INK_DEEP = "#14102B";
/** A violet-grey for secondary text on a light board. */
export const INK_SOFT = "#4B4566";

/** --background, hsl(250 30% 98%). */
export const PAPER = "#FAF9FD";
/** --secondary, hsl(180 60% 95%). The palest cyan. */
export const MIST = "#EBFAFA";
/** The dark-theme background family, hsl(240 10% 7%), violet-tinted. */
export const NIGHT = "#0B0A14";

/* ---------------------------------------------------------- accents */

/** royalGreen, hsl(152 69% 31%). Used for growth and "keep going". */
export const GREEN = "#198653";
export const GREEN_LIGHT = "#4FB783";
export const GREEN_PALE = "#6ECB9C";
export const GREEN_DEEP = "#14543A";

/** Third place, and anything that needs warmth against the blues. */
export const CORAL = "#FF9D6E";
export const CORAL_DEEP = "#D9703C";
export const CORAL_SHADOW = "#8A3D12";

/** Second place, an indigo-tinted silver rather than a neutral grey. */
export const SILVER = "#C3D3EE";
export const SILVER_DEEP = "#8FA5CE";
export const SILVER_SHADOW = "#39508A";

/** --destructive, hsl(0 85% 60%), pulled pink for a celebratory badge. */
export const PINK = "#F2437F";
export const PINK_DEEP = "#A82753";

/* ------------------------------------------------------------ helper */

/** `rgba()` from one of the hexes above, for glows and hairlines. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
