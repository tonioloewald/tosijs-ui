/*
The theme chain, as components read it.

A theme sets a few roots (`--tosi-radius`, `--tosi-duration`, `--tosi-surface`, the three
elevations, …) and every component scales or wears them, so changing a root restyles the whole
library. Each reader carries the component's own look as its fallback, and the scales are
chosen so that the chain's defaults (5px corners, 0.2s motion) reproduce it: a tooltip's 6px
corner is `chainRadius(1.2)`. A page that sets no chain, or the stock chain, looks as before.

No digits in a chain name: tosijs reads a trailing number as a scale, so `vars.tosiElevation2`
is `calc(var(--tosi-elevation) * 0.02)`.
*/
import { varDefault } from 'tosijs';
const RADIUS = varDefault.tosiRadius('5px');
const DURATION = varDefault.tosiDuration('0.2s');
const round = (n) => Math.round(n * 1000) / 1000;
/** `--tosi-radius` (5px by default) times `scale`. */
export const chainRadius = (scale = 1) => scale === 1 ? RADIUS : `calc(${RADIUS} * ${round(scale)})`;
/** A duration of `seconds` at the default speed, scaled with `--tosi-duration`. */
export const chainDuration = (seconds = 0.2) => seconds === 0.2 ? DURATION : `calc(${DURATION} * ${round(seconds / 0.2)})`;
export const chainEasing = varDefault.tosiEasing('ease-out');
/** `transition` for each property, at `seconds` on the chain's clock and easing. */
export const chainTransition = (properties, seconds = 0.2) => properties
    .map((property) => `${property} ${chainDuration(seconds)} ${chainEasing}`)
    .join(', ');
/** What sits above the page: `low` for controls, `mid` for what floats, `high` over it. */
export const chainElevation = {
    low: (fallback) => varDefault.tosiElevationLow(fallback),
    mid: (fallback) => varDefault.tosiElevationMid(fallback),
    high: (fallback) => varDefault.tosiElevationHigh(fallback),
};
/** A floating surface's fill, falling back to `fallback`. */
export const chainSurface = (fallback) => varDefault.tosiSurface(fallback);
/** The blur behind a surface (`none` unless a glass theme sets one). */
export const chainSurfaceFilter = varDefault.tosiSurfaceFilter('none');
