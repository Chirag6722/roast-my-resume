export type RoastIntensity = 'mild' | 'medium' | 'nuclear';

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface SectionCritique {
  section_name: string;
  severity: 'warning' | 'danger' | 'critical';
  original_snippet?: string;
  burn: string;
  fix_advice: string;
  rewritten_content: string;
}

export interface ATSBreakdown {
  total_score: number;
  formatting_score: number;
  keyword_score: number;
  impact_score: number;
  brevity_score: number;
  missing_keywords: string[];
  detected_keywords: string[];
  red_flags: string[];
  green_flags: string[];
}

export interface ShareableCardData {
  title: string;
  burn_line: string;
  ats_score: number;
  intensity: string;
  candidate_alias: string;
  date_formatted: string;
}

export interface RoastResult {
  id: string;
  user_id?: string;
  created_at: string;
  file_name: string;
  intensity: RoastIntensity;
  target_job?: string;
  /** Which engine produced the roast. Currently always 'heuristic' (rule-based); older records omit it. */
  engine?: string;
  overall_verdict: string;
  headline_roast: string;
  savage_paragraphs: string[];
  ats_analysis: ATSBreakdown;
  section_critiques: SectionCritique[];
  full_rewritten_resume: string;
  shareable_card: ShareableCardData;
}

export interface HistoryItemSummary {
  id: string;
  file_name: string;
  created_at: string;
  intensity: RoastIntensity;
  ats_score: number;
  overall_verdict: string;
}

export interface ScoreResult {
  total_score: number;
  formatting_score: number;
  keyword_score: number;
  impact_score: number;
  brevity_score: number;
  tips: string[];
  bullet_count: number;
  metric_bullet_count: number;
  weak_bullet_count: number;
  improved_text: string;
}
