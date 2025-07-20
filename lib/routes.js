/**
 * Centralized Route Configuration
 *
 * Single source of truth for all application routes.
 * This eliminates DRY violations and ensures consistent navigation.
 */

// Theme configuration with consistent format
export const themeLinks = [
  { href: '/themes/film-noir', label: 'Film Noir', slug: 'film-noir' },
  { href: '/themes/horror-suspense', label: 'Horror & Suspense', slug: 'horror-suspense' },
  { href: '/themes/comedy-through-time', label: 'Comedy', slug: 'comedy-through-time' },
  { href: '/themes/women-directors', label: 'Women Directors', slug: 'women-directors' },
  { href: '/themes/world-cinema', label: 'International Masters', slug: 'world-cinema' },
  {
    href: '/themes/acclaimed-directors',
    label: 'Acclaimed Directors',
    slug: 'acclaimed-directors',
  },
  { href: '/themes/avant-garde-film', label: 'Movements in Film', slug: 'avant-garde-film' },
  {
    href: '/themes/magic-of-moviemaking',
    label: 'The Magic of Moviemaking',
    slug: 'magic-of-moviemaking',
  },
  {
    href: '/themes/cinema-through-decades',
    label: 'Cinema Through the Decades',
    slug: 'cinema-through-decades',
  },
  {
    href: '/themes/cinema-cultural-impact',
    label: 'Hollywood Transformed',
    slug: 'cinema-cultural-impact',
  },
];

// Static routes
export const staticRoutes = {
  home: '/',
  movies: '/movies',
  genius: '/genius',
  you: '/you',
};

// Navigation items for NavBar
export const navItems = [
  { label: 'Movies', icon: 'Clapperboard', route: staticRoutes.movies },
  { label: 'Genius', icon: 'Sparkles', route: staticRoutes.genius },
  { label: 'You', icon: 'User', route: staticRoutes.you },
];

// Theme keys for NavBar active state detection
export const themeKeys = themeLinks.map(theme => theme.slug);

// Centralized episode data with pre-defined slugs (from theme-episode-mapping.json)
export const episodes = [
  // Film Noir episodes
  {
    theme: 'film-noir',
    id: 'german-expressionism',
    title: 'German Expressionism',
    subtitle: 'The template for noir morality',
    slug: '/film-noir/german-expressionism',
  },
  {
    theme: 'film-noir',
    id: 'from-novels-to-noir',
    title: 'From Novels to Noir',
    subtitle: 'Detective fiction meets cinema',
    slug: '/film-noir/from-novels-to-noir',
  },
  {
    theme: 'film-noir',
    id: 'urban-anxiety',
    title: 'Urban Anxiety',
    subtitle: 'City streets and moral decay',
    slug: '/film-noir/urban-anxiety',
  },
  {
    theme: 'film-noir',
    id: 'femme-fatales',
    title: 'Femme Fatales',
    subtitle: 'Dangerous women and desire',
    slug: '/film-noir/femme-fatales',
  },
  {
    theme: 'film-noir',
    id: 'moral-ambiguity',
    title: 'Moral Ambiguity',
    subtitle: 'Heroes and villains blur together',
    slug: '/film-noir/moral-ambiguity',
  },
  {
    theme: 'film-noir',
    id: 'noirs-legacy',
    title: "Noir's Legacy",
    subtitle: 'How shadows shaped modern cinema',
    slug: '/film-noir/noirs-legacy',
  },

  // Horror & Suspense episodes
  {
    theme: 'horror-suspense',
    id: 'giallo-italian-horror',
    title: 'Giallo: Italian Horror Aesthetics',
    subtitle: "Argento's stylized violence",
    slug: '/horror-suspense/giallo-italian-horror',
  },
  {
    theme: 'horror-suspense',
    id: 'cronenberg-body-horror',
    title: "Cronenberg's Body Horror",
    subtitle: 'Flesh and psychological terror',
    slug: '/horror-suspense/cronenberg-body-horror',
  },
  {
    theme: 'horror-suspense',
    id: 'modern-psychological-thrillers',
    title: 'Modern Psychological Thrillers',
    subtitle: 'Mind games and manipulation',
    slug: '/horror-suspense/modern-psychological-thrillers',
  },
  {
    theme: 'horror-suspense',
    id: 'elevated-horror-a24',
    title: 'Elevated Horror: A24 & Beyond',
    subtitle: 'Art house fear',
    slug: '/horror-suspense/elevated-horror-a24',
  },

  // Comedy episodes
  {
    theme: 'comedy-through-time',
    id: 'silent-comedy-stars',
    title: 'Silent Comedy Stars',
    subtitle: 'Chaplin, Keaton, and visual humor',
    slug: '/comedy-through-time/silent-comedy-stars',
  },
  {
    theme: 'comedy-through-time',
    id: 'screwball-comedy',
    title: 'Screwball Comedy: Battle of the Sexes',
    subtitle: 'Rapid-fire wit and romance',
    slug: '/comedy-through-time/screwball-comedy',
  },
  {
    theme: 'comedy-through-time',
    id: 'british-comedy',
    title: 'British Comedy: Ealing to Python',
    subtitle: 'Dry wit and social satire',
    slug: '/comedy-through-time/british-comedy',
  },
  {
    theme: 'comedy-through-time',
    id: 'saturday-night-live-cinema',
    title: 'Saturday Night Live Cinema',
    subtitle: 'TV comedy goes to movies',
    slug: '/comedy-through-time/saturday-night-live-cinema',
  },
  {
    theme: 'comedy-through-time',
    id: 'judd-apatow-new-comedy',
    title: 'Judd Apatow & The New Comedy',
    subtitle: 'Bromance and improvisation',
    slug: '/comedy-through-time/judd-apatow-new-comedy',
  },

  // Women Directors episodes
  {
    theme: 'women-directors',
    id: 'silent-era-pioneers',
    title: 'Silent Era Pioneers: Weber & Pickford',
    subtitle: 'Early women behind the camera',
    slug: '/women-directors/silent-era-pioneers',
  },
  {
    theme: 'women-directors',
    id: 'ida-lupino-forgotten-auteur',
    title: 'Ida Lupino: The Forgotten Auteur',
    subtitle: 'Actor-director breaking barriers',
    slug: '/women-directors/ida-lupino-forgotten-auteur',
  },
  {
    theme: 'women-directors',
    id: 'chantal-akerman-radical-minimalism',
    title: 'Chantal Akerman: Radical Minimalism',
    subtitle: 'Feminist time and space',
    slug: '/women-directors/chantal-akerman-radical-minimalism',
  },
  {
    theme: 'women-directors',
    id: 'jane-campion-feminine-gothic',
    title: 'Jane Campion: Feminine Gothic',
    subtitle: "New Zealand's poetic vision",
    slug: '/women-directors/jane-campion-feminine-gothic',
  },
  {
    theme: 'women-directors',
    id: 'kathryn-bigelow-action-auteur',
    title: 'Kathryn Bigelow: Action Auteur',
    subtitle: 'Redefining genre filmmaking',
    slug: '/women-directors/kathryn-bigelow-action-auteur',
  },
  {
    theme: 'women-directors',
    id: 'contemporary-voices',
    title: 'Contemporary Voices: Gerwig to Zhao',
    subtitle: 'New generation storytellers',
    slug: '/women-directors/contemporary-voices',
  },

  // World Cinema episodes
  {
    theme: 'world-cinema',
    id: 'kurosawa-epic-vision',
    title: "Kurosawa's Epic Vision",
    subtitle: 'Japanese cinema giant',
    slug: '/world-cinema/kurosawa-epic-vision',
  },
  {
    theme: 'world-cinema',
    id: 'bergman-psychological-landscapes',
    title: "Bergman's Psychological Landscapes",
    subtitle: 'Swedish introspection',
    slug: '/world-cinema/bergman-psychological-landscapes',
  },
  {
    theme: 'world-cinema',
    id: 'fellini-surreal-italy',
    title: "Fellini's Surreal Italy",
    subtitle: 'Dreams and reality collide',
    slug: '/world-cinema/fellini-surreal-italy',
  },
  {
    theme: 'world-cinema',
    id: 'tarkovsky-spiritual-cinema',
    title: "Tarkovsky's Spiritual Cinema",
    subtitle: 'Soviet poetry in motion',
    slug: '/world-cinema/tarkovsky-spiritual-cinema',
  },
  {
    theme: 'world-cinema',
    id: 'wong-kar-wai-romantic-melancholy',
    title: "Wong Kar-wai's Romantic Melancholy",
    subtitle: 'Hong Kong mood master',
    slug: '/world-cinema/wong-kar-wai-romantic-melancholy',
  },
  {
    theme: 'world-cinema',
    id: 'bong-joon-ho-genre-mastery',
    title: "Bong Joon-ho's Genre Mastery",
    subtitle: 'Korean social commentary',
    slug: '/world-cinema/bong-joon-ho-genre-mastery',
  },

  // Acclaimed Directors episodes (includes some from other themes)
  {
    theme: 'acclaimed-directors',
    id: 'coen-brothers-genre-pastiche',
    title: 'The Coen Brothers: Genre Pastiche & Visual Wit',
    subtitle: 'Postmodern storytellers',
    slug: '/acclaimed-directors/coen-brothers-genre-pastiche',
  },
  {
    theme: 'acclaimed-directors',
    id: 'christopher-nolan-time-memory',
    title: 'Christopher Nolan: Time, Memory & IMAX Spectacle',
    subtitle: 'Puzzle box narratives',
    slug: '/acclaimed-directors/christopher-nolan-time-memory',
  },
  {
    theme: 'acclaimed-directors',
    id: 'denis-villeneuve-sci-fi',
    title: 'Denis Villeneuve: Sci-Fi Atmosphere & Scale',
    subtitle: 'Thoughtful spectacle',
    slug: '/acclaimed-directors/denis-villeneuve-sci-fi',
  },
  {
    theme: 'acclaimed-directors',
    id: 'jordan-peele-horror-social',
    title: 'Jordan Peele: Horror Through Social Commentary',
    subtitle: 'Genre as activism',
    slug: '/acclaimed-directors/jordan-peele-horror-social',
  },
  {
    theme: 'acclaimed-directors',
    id: 'frederick-wiseman-institutional',
    title: 'Frederick Wiseman: Institutional Observer',
    subtitle: 'Fly-on-the-wall realism',
    slug: '/acclaimed-directors/frederick-wiseman-institutional',
  },
  {
    theme: 'acclaimed-directors',
    id: 'errol-morris-truth-detective',
    title: 'Errol Morris: Truth Detective',
    subtitle: 'Investigation through film',
    slug: '/acclaimed-directors/errol-morris-truth-detective',
  },
  {
    theme: 'acclaimed-directors',
    id: 'michael-moore-provocateur',
    title: 'Michael Moore: Provocateur Documentarian',
    subtitle: 'Political activism through cinema',
    slug: '/acclaimed-directors/michael-moore-provocateur',
  },
  {
    theme: 'acclaimed-directors',
    id: 'fritz-lang-architectural-psychology',
    title: "Fritz Lang's Architectural Psychology",
    subtitle: 'Space as character',
    slug: '/acclaimed-directors/fritz-lang-architectural-psychology',
  },

  // Movements in Film episodes
  {
    theme: 'avant-garde-film',
    id: 'french-new-wave',
    title: 'French New Wave: Breathless Revolution',
    subtitle: 'Cinema as personal expression',
    slug: '/avant-garde-film/french-new-wave',
  },
  {
    theme: 'avant-garde-film',
    id: 'italian-neorealism',
    title: 'Italian Neorealism: Truth in Cinema',
    subtitle: 'Life without artifice',
    slug: '/avant-garde-film/italian-neorealism',
  },
  {
    theme: 'avant-garde-film',
    id: 'british-kitchen-sink',
    title: 'British Kitchen Sink & Social Realism',
    subtitle: 'Working class authenticity',
    slug: '/avant-garde-film/british-kitchen-sink',
  },
  {
    theme: 'avant-garde-film',
    id: 'japanese-new-wave',
    title: 'Japanese New Wave: Oshima & Imamura',
    subtitle: 'Rebellion against tradition',
    slug: '/avant-garde-film/japanese-new-wave',
  },
  {
    theme: 'avant-garde-film',
    id: 'czech-new-wave',
    title: 'Czech New Wave: Behind Iron Curtain',
    subtitle: 'Subversive storytelling',
    slug: '/avant-garde-film/czech-new-wave',
  },
  {
    theme: 'avant-garde-film',
    id: 'german-new-cinema',
    title: 'German New Cinema: Herzog & Fassbinder',
    subtitle: 'Post-war identity crisis',
    slug: '/avant-garde-film/german-new-cinema',
  },
  {
    theme: 'avant-garde-film',
    id: 'german-expressionism-silent',
    title: 'German Expressionism & Silent Era',
    subtitle: 'Psychology through shadows',
    slug: '/avant-garde-film/german-expressionism-silent',
  },

  // Magic of Moviemaking episodes
  {
    theme: 'magic-of-moviemaking',
    id: 'hitchcock-camera-psychology',
    title: "Hitchcock's Camera Psychology",
    subtitle: 'Master of suspense technique',
    slug: '/magic-of-moviemaking/hitchcock-camera-psychology',
  },
  {
    theme: 'magic-of-moviemaking',
    id: 'birth-of-cinema',
    title: 'Birth of Cinema: Méliès to Griffith',
    subtitle: 'From magic trick to art form',
    slug: '/magic-of-moviemaking/birth-of-cinema',
  },
  {
    theme: 'magic-of-moviemaking',
    id: 'studio-system-star-power',
    title: 'Studio System & Star Power',
    subtitle: 'Hollywood dream factory',
    slug: '/magic-of-moviemaking/studio-system-star-power',
  },
  {
    theme: 'magic-of-moviemaking',
    id: 'technicolor-revolution',
    title: 'Technicolor Revolution',
    subtitle: 'When movies burst into color',
    slug: '/magic-of-moviemaking/technicolor-revolution',
  },
  {
    theme: 'magic-of-moviemaking',
    id: 'digital-revolution-begins',
    title: 'Digital Revolution Begins',
    subtitle: 'Pixels replace celluloid',
    slug: '/magic-of-moviemaking/digital-revolution-begins',
  },
  {
    theme: 'magic-of-moviemaking',
    id: 'virtual-production-revolution',
    title: 'Virtual Production Revolution',
    subtitle: 'Real-time world building',
    slug: '/magic-of-moviemaking/virtual-production-revolution',
  },
  {
    theme: 'magic-of-moviemaking',
    id: 'ai-future-filmmaking',
    title: 'AI & the Future of Filmmaking',
    subtitle: 'Machine creativity unleashed',
    slug: '/magic-of-moviemaking/ai-future-filmmaking',
  },
  {
    theme: 'magic-of-moviemaking',
    id: 'murnau-camera-movement',
    title: "Murnau's Camera Movement Revolution",
    subtitle: 'Unchaining the camera',
    slug: '/magic-of-moviemaking/murnau-camera-movement',
  },

  // Cinema Through Decades episodes
  {
    theme: 'cinema-through-decades',
    id: '1970s-auteur-renaissance',
    title: '1970s: The Auteur Renaissance',
    subtitle: 'Director as artist',
    slug: '/cinema-through-decades/1970s-auteur-renaissance',
  },
  {
    theme: 'cinema-through-decades',
    id: '1980s-blockbuster-revolution',
    title: '1980s: Blockbuster Revolution',
    subtitle: 'Spectacle sells tickets',
    slug: '/cinema-through-decades/1980s-blockbuster-revolution',
  },
  {
    theme: 'cinema-through-decades',
    id: '1990s-independent-renaissance',
    title: '1990s: Independent Renaissance',
    subtitle: 'Sundance changes everything',
    slug: '/cinema-through-decades/1990s-independent-renaissance',
  },
  {
    theme: 'cinema-through-decades',
    id: '2000s-streaming-wars',
    title: '2000s: The Streaming Wars',
    subtitle: 'Internet disrupts theaters',
    slug: '/cinema-through-decades/2000s-streaming-wars',
  },
  {
    theme: 'cinema-through-decades',
    id: '2010s-global-cinema-rising',
    title: '2010s: Global Cinema Rising',
    subtitle: 'World cinema goes mainstream',
    slug: '/cinema-through-decades/2010s-global-cinema-rising',
  },

  // Hollywood Transformed episodes
  {
    theme: 'cinema-cultural-impact',
    id: 'wwii-cinema-war-effort',
    title: "WWII & Cinema's War Effort",
    subtitle: 'Movies join the fight',
    slug: '/cinema-cultural-impact/wwii-cinema-war-effort',
  },
  {
    theme: 'cinema-cultural-impact',
    id: 'independent-film-renaissance',
    title: 'Independent Film Renaissance',
    subtitle: 'Personal vision over profit',
    slug: '/cinema-cultural-impact/independent-film-renaissance',
  },
  {
    theme: 'cinema-cultural-impact',
    id: 'international-cinema-breaks-through',
    title: 'International Cinema Breaks Through',
    subtitle: 'Foreign films find audiences',
    slug: '/cinema-cultural-impact/international-cinema-breaks-through',
  },
  {
    theme: 'cinema-cultural-impact',
    id: 'franchise-filmmaking-dominance',
    title: 'Franchise Filmmaking Dominance',
    subtitle: 'Sequels rule the multiplex',
    slug: '/cinema-cultural-impact/franchise-filmmaking-dominance',
  },
  {
    theme: 'cinema-cultural-impact',
    id: 'streaming-changes-everything',
    title: 'Streaming Changes Everything',
    subtitle: 'Netflix disrupts Hollywood',
    slug: '/cinema-cultural-impact/streaming-changes-everything',
  },
  {
    theme: 'cinema-cultural-impact',
    id: 'marvel-cinematic-universe',
    title: 'Marvel & the Cinematic Universe',
    subtitle: 'Superheroes save Hollywood',
    slug: '/cinema-cultural-impact/marvel-cinematic-universe',
  },
  {
    theme: 'cinema-cultural-impact',
    id: 'a24-independent-prestige',
    title: 'A24 & Independent Prestige',
    subtitle: 'Art house goes mainstream',
    slug: '/cinema-cultural-impact/a24-independent-prestige',
  },
  {
    theme: 'cinema-cultural-impact',
    id: 'international-streaming-wars',
    title: 'International Streaming Wars',
    subtitle: 'Global content competition',
    slug: '/cinema-cultural-impact/international-streaming-wars',
  },
  {
    theme: 'cinema-cultural-impact',
    id: 'post-pandemic-cinema',
    title: 'Post-Pandemic Cinema',
    subtitle: 'Movies adapt to new reality',
    slug: '/cinema-cultural-impact/post-pandemic-cinema',
  },
  {
    theme: 'cinema-cultural-impact',
    id: 'weimar-to-hollywood',
    title: 'From Weimar to Hollywood: The Émigré Influence',
    subtitle: 'European artists transform American film',
    slug: '/cinema-cultural-impact/weimar-to-hollywood',
  },
];

// Route generation helpers with proper episode lookup
export const routeHelpers = {
  /**
   * Get theme route by slug with error handling
   */
  getThemeRoute: slug => {
    try {
      if (!slug || typeof slug !== 'string') {
        console.warn('getThemeRoute: Invalid slug provided:', slug);
        return staticRoutes.home;
      }
      const theme = themeLinks.find(t => t.slug === slug);
      return theme ? theme.href : staticRoutes.home;
    } catch (error) {
      console.error('getThemeRoute: Error finding theme route:', error);
      return staticRoutes.home;
    }
  },

  /**
   * Get episode route with fallback safety
   * Uses centralized episode data instead of dynamic generation
   */
  getEpisodeRoute: (theme, episodeId) => {
    try {
      if (!theme || !episodeId || typeof theme !== 'string' || typeof episodeId !== 'string') {
        console.warn('getEpisodeRoute: Invalid parameters provided:', { theme, episodeId });
        return staticRoutes.home;
      }
      const episode = episodes.find(ep => ep.theme === theme && ep.id === episodeId);
      return episode ? episode.slug : staticRoutes.home;
    } catch (error) {
      console.error('getEpisodeRoute: Error finding episode route:', error);
      return staticRoutes.home;
    }
  },

  /**
   * Get movie route with validation
   */
  getMovieRoute: tmdbId => {
    try {
      if (!tmdbId && tmdbId !== 0) {
        console.warn('getMovieRoute: Invalid tmdbId provided:', tmdbId);
        return staticRoutes.home;
      }
      // Convert to string if it's a number
      const id = String(tmdbId);
      // Basic validation - should be numeric
      if (!/^\d+$/.test(id)) {
        console.warn('getMovieRoute: Non-numeric tmdbId provided:', tmdbId);
        return staticRoutes.home;
      }
      return `/movie/${id}`;
    } catch (error) {
      console.error('getMovieRoute: Error generating movie route:', error);
      return staticRoutes.home;
    }
  },

  /**
   * Get episodes for a specific theme
   */
  getEpisodesByTheme: themeSlug => {
    return episodes.filter(ep => ep.theme === themeSlug);
  },

  /**
   * Check if a route is a theme route
   */
  isThemeRoute: pathname => {
    const cleanPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    return cleanPath.startsWith('themes/');
  },

  /**
   * Extract theme slug from theme route
   */
  getThemeFromRoute: pathname => {
    const cleanPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    if (cleanPath.startsWith('themes/')) {
      return cleanPath.split('/')[1];
    }
    return null;
  },

  /**
   * Check if a route is an episode route using centralized episode data
   */
  isEpisodeRoute: pathname => {
    const episode = episodes.find(ep => ep.slug === pathname);
    return !!episode;
  },

  /**
   * Extract theme from episode route using centralized episode data
   */
  getThemeFromEpisodeRoute: pathname => {
    const episode = episodes.find(ep => ep.slug === pathname);
    return episode ? episode.theme : null;
  },

  /**
   * Get episode by slug
   */
  getEpisodeBySlug: slug => {
    return episodes.find(ep => ep.slug === slug);
  },

  /**
   * Validate episode exists
   */
  isValidEpisode: (theme, episodeId) => {
    return !!episodes.find(ep => ep.theme === theme && ep.id === episodeId);
  },
};

// Legacy route mapping for backward compatibility during migration
export const legacyRouteMapping = {
  '/film-noir': '/themes/film-noir',
  '/horror-suspense': '/themes/horror-suspense',
  '/comedy-through-time': '/themes/comedy-through-time',
  '/women-directors': '/themes/women-directors',
  '/world-cinema': '/themes/world-cinema',
  '/acclaimed-directors': '/themes/acclaimed-directors',
  '/avant-garde-film': '/themes/avant-garde-film',
  '/magic-of-moviemaking': '/themes/magic-of-moviemaking',
  '/cinema-through-decades': '/themes/cinema-through-decades',
  '/cinema-cultural-impact': '/themes/cinema-cultural-impact',
};

// Theme route object for components that need key-value mapping
export const themeRoutes = themeLinks.reduce((acc, theme) => {
  acc[theme.label] = theme.href;
  return acc;
}, {});

// Export theme links grouped by functionality
export const themeNavigation = {
  /**
   * Get all theme links for footer/navigation components
   */
  getAllThemes: () => themeLinks,

  /**
   * Get theme links excluding current theme
   */
  getOtherThemes: currentSlug => {
    return themeLinks.filter(theme => theme.slug !== currentSlug);
  },

  /**
   * Get theme by slug
   */
  getThemeBySlug: slug => {
    return themeLinks.find(theme => theme.slug === slug);
  },

  /**
   * Get theme by label
   */
  getThemeByLabel: label => {
    return themeLinks.find(theme => theme.label === label);
  },
};

// Route validation helpers
export const routeValidation = {
  /**
   * Check if a theme slug is valid
   */
  isValidTheme: slug => {
    return themeKeys.includes(slug);
  },

  /**
   * Check if a route should show Genius as active in NavBar
   */
  shouldShowGeniusActive: pathname => {
    try {
      if (!pathname || typeof pathname !== 'string') {
        return false;
      }

      // Theme pages show Genius as active
      if (routeHelpers.isThemeRoute(pathname)) {
        const themeSlug = routeHelpers.getThemeFromRoute(pathname);
        return routeValidation.isValidTheme(themeSlug);
      }

      // Episode pages show Genius as active
      if (routeHelpers.isEpisodeRoute(pathname)) {
        return true;
      }

      // Genius page itself
      return pathname === staticRoutes.genius;
    } catch (error) {
      console.error('shouldShowGeniusActive: Error determining active state:', error);
      return false;
    }
  },
};

// Default export with all route utilities
const routeUtilities = {
  themeLinks,
  staticRoutes,
  navItems,
  themeKeys,
  episodes,
  routeHelpers,
  themeRoutes,
  themeNavigation,
  routeValidation,
  legacyRouteMapping,
};

export default routeUtilities;
