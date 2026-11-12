/** `--tosi-radius` (5px by default) times `scale`. */
export declare const chainRadius: (scale?: number) => string;
/** A duration of `seconds` at the default speed, scaled with `--tosi-duration`. */
export declare const chainDuration: (seconds?: number) => string;
export declare const chainEasing: string;
/** `transition` for each property, at `seconds` on the chain's clock and easing. */
export declare const chainTransition: (properties: string[], seconds?: number) => string;
/** What sits above the page: `low` for controls, `mid` for what floats, `high` over it. */
export declare const chainElevation: {
    low: (fallback: string) => string;
    mid: (fallback: string) => string;
    high: (fallback: string) => string;
};
/** A floating surface's fill, falling back to `fallback`. */
export declare const chainSurface: (fallback: string) => string;
/** The blur behind a surface (`none` unless a glass theme sets one). */
export declare const chainSurfaceFilter: string;
