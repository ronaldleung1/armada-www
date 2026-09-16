import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: 'https://armada.build/', lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
        { url: 'https://armada.build/venture-cup', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    ];
}
