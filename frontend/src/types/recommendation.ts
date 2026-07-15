export interface RecommendationOption {
  id: string;
  name: string;
  score: number;
  score_percent?: number;
  is_selected: boolean;
  cost?: number;
  complexity?: number;
  scalability?: number;
  security?: number;
  reliability?: number;
}

export interface RecommendationResponse {
  options: RecommendationOption[];
}
