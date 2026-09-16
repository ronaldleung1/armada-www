import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{ userAgent: '*', allow: '/', disallow: ['/crew'] }],
        sitemap: 'https://armada.build/sitemap.xml',
        host: 'https://armada.build',
    };
}
