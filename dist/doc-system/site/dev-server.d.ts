import type { SiteConfig } from './site-config';
declare global {
    var Bun: any;
}
export declare function devServer(config: SiteConfig, opts?: {
    test?: boolean;
    build?: () => unknown | Promise<unknown>;
}): Promise<void>;
