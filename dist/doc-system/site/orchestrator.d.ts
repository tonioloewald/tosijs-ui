import type { SiteConfig } from './site-config';
declare global {
    var Bun: any;
}
export declare function buildSite(config: SiteConfig): Promise<boolean>;
