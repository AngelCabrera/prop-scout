export interface PropertyPayload {
  external_id: string;
  url: string;
  source: string;
  image_url?: string;
  price_usd: number;
  location_zone: string;
  ai_score: number;
  ai_summary: string;
  water_status: 'Tank' | 'Well' | 'Constant' | 'None' | 'Unknown';
  operation_type: 'Sale' | 'Rental' | 'Unknown';
  specs?: Record<string, any>;
}
