// lib/cinematic-profile.js - Generate fun user personality profiles based on movie data

/**
 * Cinematic Profile Generator
 *
 * Analyzes user movie preferences, platform usage, and viewing patterns
 * to generate engaging personality insights in various styles.
 *
 * Features:
 * - Multiple analysis types (scientific, horoscope, personality, etc.)
 * - Caching system for performance
 * - Randomization for variety
 * - Data-driven insights based on actual user behavior
 */

export class CinematicProfileGenerator {
  constructor() {
    this.cacheKey = 'cinematicProfiles';
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Main entry point - get a cinematic profile for user
   */
  async generateProfile(userData, forceRefresh = false) {
    try {
      // Check cache first
      const cached = this.getCachedProfiles(userData);
      if (!forceRefresh && cached && cached.profiles.length > 0) {
        return this.selectRandomProfile(cached.profiles, userData);
      }

      // Generate new profiles
      const analysis = this.analyzeUserData(userData);
      const profiles = this.generateAllProfileTypes(analysis);

      // Cache for future use
      this.cacheProfiles(userData, profiles);

      // Return stable profile for the day
      return this.selectRandomProfile(profiles, userData);
    } catch (error) {
      console.error('Error generating cinematic profile:', error);
      return this.getFallbackProfile();
    }
  }

  /**
   * Analyze user data to extract insights
   */
  analyzeUserData(userData) {
    const { heartedMovies = [], bookmarkedMovies = [], selectedPlatforms = [] } = userData;

    const allMovies = [...heartedMovies, ...bookmarkedMovies];

    return {
      totalMovies: allMovies.length,
      heartedCount: heartedMovies.length,
      bookmarkedCount: bookmarkedMovies.length,
      platformCount: selectedPlatforms.length,
      platformEfficiency: this.calculatePlatformEfficiency(selectedPlatforms.length),
      genreProfile: this.analyzeGenres(allMovies),
      eraProfile: this.analyzeEras(allMovies),
      tasteLevel: this.calculateTasteLevel(allMovies),
      personalityType: this.determinePersonalityType(
        heartedMovies,
        bookmarkedMovies,
        selectedPlatforms
      ),
      quirks: this.findQuirks(allMovies),
      filmIQ: this.calculateFilmIQ(allMovies, selectedPlatforms.length),
    };
  }

  /**
   * Generate all profile types
   */
  generateAllProfileTypes(analysis) {
    return [
      this.generateScientificProfile(analysis),
      this.generatePsychoanalyticalProfile(analysis),
      this.generateHoroscopeProfile(analysis),
      this.generateReportCardProfile(analysis),
      this.generateDNAProfile(analysis),
      this.generatePersonalityProfile(analysis),
      this.generateMinimalistProfile(analysis),
      this.generatePhilosophicalProfile(analysis),
    ].filter(profile => profile !== null);
  }

  /**
   * Scientific Classification Style
   */
  generateScientificProfile(analysis) {
    const classifications = [
      'Cinematic Savant',
      'Auteur Specialist',
      'Genre Transcendent',
      'Cultural Bridge Builder',
      'Narrative Architect',
    ];

    const classification = classifications[Math.floor(Math.random() * classifications.length)];

    return {
      type: 'scientific',
      title: `Cinematic Intelligence Quotient: ${analysis.filmIQ}`,
      content: `Subject demonstrates ${analysis.personalityType.toLowerCase()} consumption patterns. Platform optimization: ${analysis.platformEfficiency}. Genre fluency indicates ${analysis.tasteLevel} aesthetic comprehension.\n\n*Classification: ${classification}*`,
      icon: '🧬',
      recommendationHeader: 'Recommended Specimens',
    };
  }

  /**
   * Psychoanalytical Style
   */
  generatePsychoanalyticalProfile(analysis) {
    const insights = [
      'seeks narrative complexity in shadowed spaces',
      'processes emotion through visual metaphor',
      'demonstrates preference for authentic imperfection',
      'exhibits sophisticated pattern recognition across cultures',
    ];

    const insight = insights[Math.floor(Math.random() * insights.length)];

    return {
      type: 'psychoanalytical',
      title: `Psychocinematic Profile #${Math.floor(Math.random() * 9999)}`,
      content: `Subject ${insight}. ${analysis.heartedCount > analysis.bookmarkedCount ? 'Decisive curator—knows what resonates.' : 'Exploratory mindset—builds future viewing architecture.'}\n\n*Clinical note: ${analysis.quirks}*`,
      icon: '🧠',
      recommendationHeader: 'Therapeutic Viewing',
    };
  }

  /**
   * Horoscope Style
   */
  generateHoroscopeProfile(analysis) {
    const predictions = [
      'The cinema stars align in your favor this week',
      'Your viewing constellation reveals hidden truths',
      'The universe whispers through your watch history',
    ];

    const prediction = predictions[Math.floor(Math.random() * predictions.length)];

    return {
      type: 'horoscope',
      title: 'Your Viewing Stars Align',
      content: `${prediction}. Your ${analysis.personalityType.toLowerCase()} nature draws you to stories that mirror your own complexity.\n\n*The stars suggest: ${this.getHoroscopeAdvice(analysis)}*`,
      icon: '🌟',
      recommendationHeader: 'The Stars Recommend',
    };
  }

  /**
   * Report Card Style
   */
  generateReportCardProfile(analysis) {
    return {
      type: 'reportcard',
      title: 'Film School Report Card',
      content: `**Taste Sophistication:** A+\n**Platform Efficiency:** ${analysis.platformEfficiency}\n**Genre Mastery:** ${analysis.genreProfile.primary}\n**Cultural Fluency:** Exceptional\n\n*Professor's note: Shows natural aptitude for cinematic language.*`,
      icon: '📝',
      recommendationHeader: 'Curriculum Recommendations',
    };
  }

  /**
   * DNA Breakdown Style
   */
  generateDNAProfile(analysis) {
    const genres = analysis.genreProfile;

    return {
      type: 'dna',
      title: 'Your Cinematic DNA',
      content: `**Genetic Composition:**\n${genres.primary}: 40%\n${genres.secondary}: 30%\nCharacter Study: 20%\nWildcard Factor: 10%\n\n*Mutation detected: ${analysis.quirks}*`,
      icon: '🧬',
      recommendationHeader: 'Genetic Matches',
    };
  }

  /**
   * Personality Archetype Style
   */
  generatePersonalityProfile(analysis) {
    return {
      type: 'personality',
      title: `The ${analysis.personalityType}`,
      content: `You don't just watch movies—you collect experiences. Your viewing patterns reveal someone who ${this.getPersonalityInsight(analysis)}.\n\n*Signature trait: ${this.getSignatureTrait(analysis)}*`,
      icon: '🎭',
      recommendationHeader: 'Films in Your DNA',
    };
  }

  /**
   * Minimalist Fortune Cookie Style
   */
  generateMinimalistProfile(analysis) {
    const fortunes = [
      'You see poetry in shadows and truth in imperfection',
      'Your taste transcends decades and continents',
      'You collect masterpieces, not movies',
      'Every frame you love tells your story',
    ];

    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];

    return {
      type: 'minimalist',
      title: 'Cinematic Fortune',
      content: `*"${fortune}"*\n\nFilm IQ: ${analysis.filmIQ} | Platform Zen: ${analysis.platformEfficiency}`,
      icon: '🥠',
      recommendationHeader: 'Essential Viewing',
    };
  }

  /**
   * Philosophical Style
   */
  generatePhilosophicalProfile(analysis) {
    return {
      type: 'philosophical',
      title: 'Your Cinema Philosophy',
      content: `You understand that great films are conversations across time. Your choices reflect someone who values ${this.getPhilosophicalValue(analysis)} above spectacle.\n\n*"Cinema is truth 24 times per second" - and you seek that truth.*`,
      icon: '💭',
      recommendationHeader: 'Visual Meditations',
    };
  }

  /**
   * Helper methods for analysis
   */
  calculatePlatformEfficiency(count) {
    if (count <= 2) return 'Minimalist';
    if (count <= 4) return 'Optimized';
    if (count <= 6) return 'Comprehensive';
    return 'Maximalist';
  }

  analyzeGenres(movies) {
    // This would analyze actual movie data in real implementation
    // For now, return sample data
    const genres = ['Film Noir', 'International', 'Drama', 'Classic', 'Art House'];
    return {
      primary: genres[Math.floor(Math.random() * genres.length)],
      secondary: genres[Math.floor(Math.random() * genres.length)],
    };
  }

  analyzeEras(movies) {
    // Analyze release years, decades, etc.
    return {
      dominant: '1970s',
      span: '6 decades',
    };
  }

  calculateTasteLevel(movies) {
    const levels = ['sophisticated', 'exceptional', 'transcendent', 'curatorial'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  determinePersonalityType(hearted, bookmarked, platforms) {
    const types = [
      'Noir Philosopher',
      'Minimalist Curator',
      'Cross-Cultural Cinephile',
      'Auteur Specialist',
      'Visual Poet',
      'Genre Transcendent',
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  findQuirks(movies) {
    const quirks = [
      'Attracted to moral ambiguity',
      'Prefers depth over breadth',
      'Seeks authentic imperfection',
      'Values character over plot',
      'Drawn to visual poetry',
    ];
    return quirks[Math.floor(Math.random() * quirks.length)];
  }

  calculateFilmIQ(movies, platformCount) {
    // Base score + modifiers
    let score = 120;
    score += Math.min(movies.length * 2, 30); // Movie count bonus
    score += platformCount < 3 ? 10 : 0; // Minimalist bonus
    return Math.min(score, 180);
  }

  getHoroscopeAdvice(analysis) {
    const advice = [
      'Queue something unexpected',
      'Trust your instincts this viewing cycle',
      'A foreign film holds answers',
      'Revisit a childhood favorite',
    ];
    return advice[Math.floor(Math.random() * advice.length)];
  }

  getPersonalityInsight(analysis) {
    const insights = [
      'values authenticity over polish',
      'sees universal truths in specific stories',
      'understands that great art requires patience',
      'believes every frame should earn its place',
    ];
    return insights[Math.floor(Math.random() * insights.length)];
  }

  getSignatureTrait(analysis) {
    const traits = [
      'Finds beauty in imperfection',
      'Curates with surgical precision',
      'Bridges cultures through cinema',
      'Sees patterns others miss',
    ];
    return traits[Math.floor(Math.random() * traits.length)];
  }

  getPhilosophicalValue(analysis) {
    const values = [
      'emotional honesty',
      'visual poetry',
      'narrative complexity',
      'cultural authenticity',
    ];
    return values[Math.floor(Math.random() * values.length)];
  }

  /**
   * Caching system
   */
  getCachedProfiles(userData) {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const userFingerprint = this.generateUserFingerprint(userData);

      if (data.fingerprint === userFingerprint && Date.now() - data.timestamp < this.cacheTimeout) {
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error reading cached profiles:', error);
      return null;
    }
  }

  cacheProfiles(userData, profiles) {
    try {
      const cacheData = {
        fingerprint: this.generateUserFingerprint(userData),
        profiles: profiles,
        timestamp: Date.now(),
      };

      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching profiles:', error);
    }
  }

  generateUserFingerprint(userData) {
    const { heartedMovies = [], bookmarkedMovies = [], selectedPlatforms = [] } = userData;

    // More stable fingerprint - include actual content, not just counts
    const heartedTitles = heartedMovies
      .map(m => m.title || m.id)
      .sort()
      .join(',');
    const bookmarkedTitles = bookmarkedMovies
      .map(m => m.title || m.id)
      .sort()
      .join(',');
    const platforms = selectedPlatforms.sort().join(',');

    return `h:${heartedTitles}|b:${bookmarkedTitles}|p:${platforms}`;
  }

  selectRandomProfile(profiles, userData = {}) {
    if (profiles.length === 0) return this.getFallbackProfile();

    // Use a stable seed based on user data to avoid rapid cycling
    const seed = this.generateUserFingerprint(userData);
    const hash = this.simpleHash(seed + new Date().toDateString()); // Changes daily
    return profiles[hash % profiles.length];
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  getFallbackProfile() {
    return {
      type: 'fallback',
      title: 'Your Cinematic Journey',
      content: 'Every great film collection starts with a single movie. Your taste is evolving.',
      icon: '🎬',
      recommendationHeader: 'More Ideas',
    };
  }

  /**
   * Force refresh all profiles for a user
   */
  refreshProfiles(userData) {
    return this.generateProfile(userData, true);
  }

  /**
   * Get specific profile type
   */
  async getProfileByType(userData, type) {
    const analysis = this.analyzeUserData(userData);

    switch (type) {
      case 'scientific':
        return this.generateScientificProfile(analysis);
      case 'horoscope':
        return this.generateHoroscopeProfile(analysis);
      case 'personality':
        return this.generatePersonalityProfile(analysis);
      default:
        return this.generateProfile(userData);
    }
  }
}

// Singleton instance
export const cinematicProfileGenerator = new CinematicProfileGenerator();
