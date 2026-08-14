import type { SiteConfig } from './site-config.js';
declare global {
    var Bun: any;
}
export declare function buildSite(config: SiteConfig, opts?: {
    skipAudit?: boolean;
    lock?: boolean;
}): Promise<boolean>;
