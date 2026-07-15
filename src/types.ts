export type CorrectionCategory = "spacing" | "spelling" | "grammar" | "style";

export interface Correction {
  original: string;
  corrected: string;
  category: CorrectionCategory;
  explanation: string;
}

export interface CheckResult {
  correctedText: string;
  corrections: Correction[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  originalText: string;
  correctedText: string;
  corrections: Correction[];
}
