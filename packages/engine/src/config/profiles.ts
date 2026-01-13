export interface MarketProfile {
    city: string;
    country: string;
    currency: string;
    price_strategy: 'LATAM_CHAOS' | 'STANDARD';
}

export const ACTIVE_PROFILES: MarketProfile[] = [
    {
        city: 'Cumaná',
        country: 'Venezuela',
        currency: 'USD',
        price_strategy: 'LATAM_CHAOS'
    }
];
