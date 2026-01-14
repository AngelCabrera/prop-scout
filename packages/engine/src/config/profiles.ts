export interface MarketProfile {
    city: string;
    country: string;
    currency: string;
    price_strategy: 'LATAM_CHAOS' | 'STANDARD';
}

export const CUMANA_PROFILE: MarketProfile = {
    city: 'Cumaná',
    country: 'Venezuela',
    currency: 'USD',
    price_strategy: 'LATAM_CHAOS'
};

export const ACTIVE_PROFILES: MarketProfile[] = [CUMANA_PROFILE];
