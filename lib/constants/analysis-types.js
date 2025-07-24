/**
 * Analysis Type Constants
 * 
 * Single source of truth for analysis types to prevent hardcoded strings
 * and ensure consistency across the entire codebase.
 */

export const ANALYSIS_TYPES = {
  PAGE_ANALYSIS: 'page_analysis',
  // Future analysis types can be added here
};

// Default analysis type for all new analyses
export const DEFAULT_ANALYSIS_TYPE = ANALYSIS_TYPES.PAGE_ANALYSIS;

// Validation function to check if an analysis type is valid
export function isValidAnalysisType(type) {
  return Object.values(ANALYSIS_TYPES).includes(type);
}

// Get all valid analysis types as an array
export function getValidAnalysisTypes() {
  return Object.values(ANALYSIS_TYPES);
}