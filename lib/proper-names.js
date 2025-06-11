// lib/proper-names.js
// Enhanced proper name identification based on documented rules

// Rule-based exclusion lists
const PLACE_NAMES = new Set([
  // Cities
  'Paris', 'Rome', 'London', 'Tokyo', 'New York', 'Los Angeles', 'Berlin', 'Madrid',
  'Sydney', 'Toronto', 'Moscow', 'Beijing', 'Mumbai', 'Cairo', 'Dublin', 'Vienna',
  'Prague', 'Budapest', 'Warsaw', 'Stockholm', 'Copenhagen', 'Amsterdam', 'Brussels',
  'Lisbon', 'Athens', 'Istanbul', 'Barcelona', 'Milan', 'Florence', 'Venice',
  'Beverly Hills', 'Hollywood', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx',
  
  // Countries  
  'Russia', 'France', 'Germany', 'Japan', 'China', 'India', 'Brazil', 'Mexico',
  'Canada', 'Australia', 'Italy', 'Spain', 'England', 'Scotland', 'Ireland', 'Wales',
  'Poland', 'Czech', 'Hungary', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Netherlands',
  'Belgium', 'Portugal', 'Greece', 'Turkey', 'Egypt', 'Israel', 'Argentina', 'Chile',
  
  // Regions/States
  'California', 'Texas', 'Florida', 'New York', 'Europe', 'Asia', 'Africa', 'America',
  'Yorkshire', 'Tuscany', 'Provence', 'Andalusia', 'Bavaria', 'Normandy', 'Cornwall',
  
  // Buildings/Locations
  'Castle Howard', 'Brideshead', 'Hampton Court', 'Versailles', 'Buckingham Palace',
  'Windsor Castle', 'Westminster', 'Capitol', 'Pentagon', 'Kremlin', 'Elysée'
]);

const NATIONALITY_ADJECTIVES = new Set([
  'American', 'British', 'French', 'German', 'Italian', 'Spanish', 'Russian', 'Chinese',
  'Japanese', 'Indian', 'Brazilian', 'Mexican', 'Canadian', 'Australian', 'Dutch',
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Czech', 'Hungarian',
  'Portuguese', 'Greek', 'Turkish', 'Egyptian', 'Israeli', 'Irish', 'Scottish', 'Welsh',
  'English', 'European', 'Asian', 'African', 'Latin', 'Nordic', 'Mediterranean',
  'Scandinavian', 'Eastern', 'Western', 'Northern', 'Southern', 'Central'
]);

const AWARDS = new Set([
  'Oscar', 'Emmy', 'Grammy', 'Tony', 'BAFTA', 'Golden Globe', 'Cannes', 'Venice',
  'Berlin', 'Sundance', 'Academy Award', 'Palme', 'César', 'Goya', 'Critics Choice',
  'Screen Actors Guild', 'Directors Guild', 'Writers Guild', 'Producers Guild'
]);

const ORGANIZATIONS = new Set([
  // Media companies
  'Granada Television', 'BBC', 'HBO', 'Netflix', 'Disney', 'Warner Bros', 'Universal',
  'Paramount', 'Sony', 'MGM', 'Fox', 'Miramax', 'Weinstein', 'Lionsgate', 'A24',
  'Focus Features', 'Sony Pictures', 'Columbia Pictures', 'Twentieth Century',
  
  // Agencies/Organizations  
  'NASA', 'FBI', 'CIA', 'UN', 'EU', 'NATO', 'UNESCO', 'WHO', 'IMF', 'World Bank',
  
  // Brands/Tech companies
  'Zeiss', 'Canon', 'Panavision', 'Kodak', 'Fujifilm', 'Arri', 'Red', 'Blackmagic',
  'Apple', 'Microsoft', 'Google', 'Amazon', 'Facebook', 'Twitter', 'Instagram',
  
  // Publications
  'Times', 'Post', 'Tribune', 'Herald', 'Guardian', 'Telegraph', 'Independent',
  'Variety', 'Hollywood Reporter', 'Entertainment Weekly', 'Rolling Stone', 'Vogue'
]);

const HISTORICAL_PERIODS = new Set([
  'Cold War', 'World War', 'Great Depression', 'Renaissance', 'Enlightenment',
  'Industrial Revolution', 'Reformation', 'Victorian Era', 'Edwardian Era',
  'Jazz Age', 'Roaring Twenties', 'Great War', 'Medieval', 'Ancient', 'Classical',
  'Baroque', 'Romantic', 'Modern', 'Postmodern', 'Contemporary'
]);

const COMMON_WORDS = new Set([
  // Articles, pronouns, possessives
  'The', 'This', 'That', 'These', 'Those', 'A', 'An', 'Its', 'His', 'Her', 'Their',
  'Our', 'Your', 'My', 'Hers', 'Theirs', 'Ours', 'Yours', 'Mine',
  
  // Question words and conjunctions
  'When', 'Where', 'What', 'Who', 'Why', 'How', 'Which', 'And', 'Or', 'But', 'So',
  
  // Quantifiers and ordinals
  'Some', 'Many', 'Most', 'All', 'Each', 'Every', 'Both', 'Either', 'Neither',
  'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Last', 'Next', 'Previous',
  'Another', 'Other', 'Final', 'Initial',
  
  // Time and sequence
  'Here', 'There', 'Now', 'Then', 'Today', 'Tomorrow', 'Yesterday', 'Morning',
  'Evening', 'Night', 'Day', 'Week', 'Month', 'Year', 'During', 'Before', 'After',
  'Since', 'Until', 'While',
  
  // Transition words
  'Although', 'Because', 'However', 'Therefore', 'Moreover', 'Furthermore',
  'Nevertheless', 'Additionally', 'Consequently', 'Meanwhile', 'Similarly', 'Unlike',
  'Creating', 'Setting', 'Characters'
]);

const FILM_ROLES = new Set([
  'director', 'directed', 'starring', 'stars', 'features', 'with', 'cast',
  'performance', 'performances', 'actor', 'actress', 'producer', 'produced',
  'written', 'screenplay', 'script', 'cinematography', 'cinematographer',
  'music', 'composer', 'edited', 'editor', 'production', 'executive'
]);

// Celtic name prefixes that should stay with surname
const CELTIC_PREFIXES = /^(Mc|Mac|O'|St\.?)\s*/i;

// Character context indicators
const CHARACTER_INDICATORS = new Set([
  'performance as', 'portrays', 'plays', 'as', 'character', 'role of', 'playing',
  'appears as', 'stars as', 'cast as', 'featured as', 'cameo as', 'voice of'
]);

// Enhanced film role indicators for better context detection
const ENHANCED_FILM_ROLES = new Set([
  // Director roles
  'directed by', 'director', 'directed', 'helmed by', 'filmmaking', 'behind the camera',
  // Actor roles  
  'starring', 'stars', 'features', 'cast', 'leads', 'co-stars', 'supporting',
  'ensemble', 'cameo', 'guest star', 'voice cast', 'narrator',
  // Production roles
  'produced by', 'producer', 'executive producer', 'co-producer',
  'written by', 'screenplay by', 'script by', 'adapted by', 'story by',
  'cinematography by', 'cinematographer', 'director of photography',
  'music by', 'composer', 'score by', 'soundtrack',
  'edited by', 'editor', 'editing', 'sound design', 'production design'
]);

// Context patterns for better detection
const CONTEXT_PATTERNS = {
  // Strong indicators this is a person's name
  PERSON_STRONG: [
    /\b(directed?|produced?|written|composed?|edited|starring|stars)\s+by\s+$/i,
    /\b(actor|actress|director|producer|writer|composer|editor|cinematographer)\s+$/i,
    /'s\s+(film|movie|work|novel|book|screenplay|direction|performance)\b/i,
    /\bwith\s+$/i,
    /\bfeatur(es?|ing)\s+$/i
  ],
  // Character name indicators
  CHARACTER: [
    /\b(plays?|portrays?|as|character|role\s+of)\s+$/i,
    /\b(appears?|stars?)\s+as\s+$/i,
    /\bvoice\s+of\s+$/i
  ],
  // Weak indicators (less certain)
  PERSON_WEAK: [
    /\band\s+$/i,
    /\bwith\s+$/i,
    /\balso\s+$/i
  ]
};

/**
 * DEPRECATED: Entity detection system has been disabled
 * Returns plain text without any entity underlining
 */
export function underlineProperNames(text) {
  // Entity detection system deprecated - return plain text
  return text;
}

/**
 * Determine if a candidate should be excluded from underlining
 */
function shouldExclude(candidate, text, start, end) {
  // Rule 1: Place names
  if (PLACE_NAMES.has(candidate)) return true;
  
  // Rule 8 & 26: Time periods and decades
  if (/^\d{4}s?$/.test(candidate) || HISTORICAL_PERIODS.has(candidate)) return true;
  
  // Rule 19: Awards
  if (AWARDS.has(candidate)) return true;
  
  // Rule 21 & 24: Nationality and political adjectives
  if (NATIONALITY_ADJECTIVES.has(candidate)) return true;
  
  // Rule 33, 39, 40, 49, 51: Organizations, companies, publications
  if (ORGANIZATIONS.has(candidate)) return true;
  
  // Rule 50: Common words and possessive pronouns
  if (COMMON_WORDS.has(candidate)) return true;
  
  // Rule 36: Architectural styles
  const architecturalStyles = new Set([
    'Baroque', 'Gothic', 'Victorian', 'Art Deco', 'Modernist', 'Classical',
    'Renaissance', 'Romanesque', 'Byzantine', 'Neoclassical', 'Colonial'
  ]);
  if (architecturalStyles.has(candidate)) return true;
  
  // Check if at sentence beginning (less likely to be name)
  const isStartOfSentence = start === 0 || /[.!?]\s*$/.test(text.slice(0, start).trim());
  if (isStartOfSentence && candidate.length < 4) return true;
  
  return false;
}

/**
 * Determine if a candidate is a proper name that should be underlined
 * Returns object with detection result and type classification
 */
function isProperName(candidate, text, start, end) {
  const beforeText = text.slice(Math.max(0, start - 50), start);
  const afterText = text.slice(end, Math.min(text.length, end + 50));
  const beforeLower = beforeText.toLowerCase();
  const afterLower = afterText.toLowerCase();
  
  // Check for strong person indicators first
  for (const pattern of CONTEXT_PATTERNS.PERSON_STRONG) {
    if (pattern.test(beforeText)) {
      return { isName: true, type: 'person', confidence: 'high' };
    }
  }
  
  // Check for character indicators
  for (const pattern of CONTEXT_PATTERNS.CHARACTER) {
    if (pattern.test(beforeText)) {
      return { isName: true, type: 'character', confidence: 'high' };
    }
  }
  
  // Enhanced film role detection
  for (const role of ENHANCED_FILM_ROLES) {
    if (beforeLower.includes(role + ' ') || beforeLower.includes(role + 'd ')) {
      return { isName: true, type: 'person', confidence: 'medium' };
    }
  }
  
  // Legacy film role detection (backward compatibility)
  for (const role of FILM_ROLES) {
    if (beforeLower.includes(role + ' ') || beforeLower.includes(role + 'd ')) {
      return { isName: true, type: 'person', confidence: 'medium' };
    }
  }
  
  // Possessive patterns (Author's, Director's)
  if (afterLower.match(/^'s\s+(novel|film|work|adaptation|story|book|direction|performance)/)) {
    return { isName: true, type: 'person', confidence: 'high' };
  }
  
  // Celtic names should be treated as units
  if (CELTIC_PREFIXES.test(candidate)) {
    return { isName: true, type: 'person', confidence: 'medium' };
  }
  
  // Hyphenated names and accented characters suggest person names
  if (candidate.includes('-') || /[àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/i.test(candidate)) {
    return { isName: true, type: 'person', confidence: 'medium' };
  }
  
  // Names with Jr./Sr.
  if (/\b(Jr\.?|Sr\.?|III|IV)$/.test(candidate)) {
    return { isName: true, type: 'person', confidence: 'high' };
  }
  
  // Multi-word names are more likely to be people
  if (candidate.includes(' ') && candidate.split(' ').length >= 2) {
    // Additional context check for multi-word names
    if (beforeLower.match(/\b(and|with|also|co-starring)\s*$/)) {
      return { isName: true, type: 'person', confidence: 'medium' };
    }
    return { isName: true, type: 'person', confidence: 'low' };
  }
  
  // Check weak indicators
  for (const pattern of CONTEXT_PATTERNS.PERSON_WEAK) {
    if (pattern.test(beforeText) && candidate.length >= 4) {
      return { isName: true, type: 'person', confidence: 'low' };
    }
  }
  
  // Default: if it's capitalized and not excluded, probably a name
  if (candidate.length >= 4) { // Increased threshold for better accuracy
    return { isName: true, type: 'person', confidence: 'low' };
  }
  
  return { isName: false, type: null, confidence: null };
}

/**
 * Extract person names for building person pages (future functionality)
 */
export function extractPersonNames(text) {
  // This will be implemented when we build person pages
  // For now, return empty array
  return [];
}