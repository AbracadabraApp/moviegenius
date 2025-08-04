// Hero Image Guidance Data - Centralized visual guidance for all episodes
export const HERO_IMAGE_GUIDANCE = {
  // Film Noir Series - High contrast, dramatic lighting
  'film-noir': {
    baseTheme: 'Classic Film Noir',
    mood: 'Dramatic shadows, high contrast, urban nighttime',
    colors: 'Black and white with selective color, dramatic lighting',
    cinematography: 'Chiaroscuro lighting, venetian blind shadows, low angles',
    commonElements: 'Rain-soaked streets, neon signs, cigarette smoke, mysterious figures',
    
    episodes: {
      'german-expressionism': {
        title: 'German Expressionism',
        mood: 'Angular shadows, distorted perspectives, psychological unease',
        colors: 'High contrast black/white, stark geometric lighting',
        elements: 'Painted backdrops, tilted angles, geometric shadows, silent film aesthetic',
        prompt: 'German Expressionist film set with dramatic angular shadows, painted backdrop aesthetic, The Cabinet of Dr. Caligari style, high contrast chiaroscuro lighting, psychological tension atmosphere, professional cinematography',
        icon: '🎭',
        keywords: ['expressionist', 'angular', 'geometric', 'distorted', 'caligari']
      },
      
      'from-novels-to-noir': {
        title: 'From Novels to Noir',
        mood: 'Literary adaptation atmosphere, classic detective stories',
        colors: 'Sepia tones, warm lamplight, vintage book colors',
        elements: 'Classic books, manuscripts, typewriter, detective office, vintage papers',
        prompt: 'Literary adaptation atmosphere, classic books and manuscripts, typewriter and detective papers, vintage noir novel cover aesthetic, warm lamplight, film noir shadows',
        icon: '📚',
        keywords: ['literary', 'books', 'detective', 'typewriter', 'manuscripts']
      },

      'urban-anxiety': {
        title: 'Urban Anxiety',
        mood: 'Claustrophobic city atmosphere, overwhelming urban density',
        colors: 'Dark grays, harsh street lighting, urban decay palette',
        elements: 'Crowded streets, towering buildings, fire escapes, urban maze',
        prompt: 'Claustrophobic city atmosphere, crowded streets, urban decay, psychological tension, overwhelming architecture, harsh street lighting, film noir urban maze',
        icon: '🏙️',
        keywords: ['urban', 'claustrophobic', 'crowded', 'decay', 'overwhelming']
      },

      'femme-fatales': {
        title: 'Femme Fatales',
        mood: 'Mysterious, seductive, dangerous beauty, fatal attraction',
        colors: 'Red lips on black/white, dramatic shadows, selective color',
        elements: 'Woman silhouette, doorway lighting, glamour with threat, cigarette smoke',
        prompt: 'Mysterious woman silhouette, red lips in black and white, dangerous beauty, seductive lighting, glamorous yet threatening, film noir femme fatale',
        icon: '💋',
        keywords: ['femme fatale', 'mysterious', 'seductive', 'silhouette', 'dangerous']
      },

      'moral-ambiguity': {
        title: 'Moral Ambiguity',
        mood: 'Ethical dilemmas, good vs evil duality, moral crossroads',
        colors: 'Split lighting, half shadow/half light, moral gray tones',
        elements: 'Split face lighting, crossroads, scales of justice, conflicted character',
        prompt: 'Split lighting on face showing good and evil duality, moral crossroads, conflicted character, ethical dilemma visualization, noir moral ambiguity',
        icon: '⚖️',
        keywords: ['moral', 'duality', 'split', 'crossroads', 'ambiguous']
      },

      'noirs-legacy': {
        title: "Noir's Legacy",
        mood: 'Modern noir influence, contemporary crime, timeless atmosphere',
        colors: 'Neo-noir palette, modern city lights, contemporary noir tones',
        elements: 'Modern cityscape, contemporary crime elements, noir influence in modern media',
        prompt: 'Modern noir influence, contemporary city at night, neo-noir aesthetic, timeless criminal atmosphere, modern interpretation of classic noir',
        icon: '🌃',
        keywords: ['modern', 'neo-noir', 'contemporary', 'legacy', 'influence']
      }
    }
  },

  // Contemporary Auteurs - Modern filmmaking, directorial vision
  'contemporary-auteurs': {
    baseTheme: 'Modern Auteur Cinema',
    mood: 'Sophisticated directorial vision, artistic cinematography',
    colors: 'Warm cinematic tones, professional color grading',
    cinematography: 'Sophisticated camera work, artistic composition, auteur style',
    commonElements: 'Film sets, director equipment, artistic vision, creative process',

    episodes: {
      'coen-brothers': {
        title: 'The Coen Brothers',
        mood: 'Quirky americana, dark humor undertones, distinctive style',
        colors: 'Warm earth tones, vintage americana palette, desert hues',
        elements: 'Desert highway, roadside diner, vintage signs, eccentric characters',
        prompt: 'Quirky americana landscape, vintage roadside diner, desert highway, eccentric character silhouettes, retro americana with dark humor undertones, wide angle composition, professional cinematography',
        icon: '🛣️',
        keywords: ['americana', 'desert', 'diner', 'quirky', 'highway']
      }
    }
  },

  // Technical Evolution - Film technology and innovation
  'technical-evolution': {
    baseTheme: 'Cinema Technology',
    mood: 'Innovation, technical advancement, behind-the-scenes magic',
    colors: 'Blue digital glow, warm practical lighting, tech contrasts',
    cinematography: 'Technical demonstration, equipment focus, innovation showcase',
    commonElements: 'Film equipment, special effects, technology, innovation',

    episodes: {
      'digital-revolution': {
        title: 'Digital Revolution Begins',
        mood: 'Technological transformation, future meets past, innovation',
        colors: 'Blue digital glow contrasted with warm practical lighting',
        elements: 'CGI workstation, wireframe graphics, digital vs practical effects',
        prompt: 'Computer graphics workstation, digital effects creation, CGI wireframes overlaying real footage, technological transformation, futuristic film production, digital vs practical effects split screen',
        icon: '💻',
        keywords: ['digital', 'CGI', 'technology', 'workstation', 'revolution']
      }
    }
  },

  // Decades - Historical periods in cinema
  'decades': {
    baseTheme: 'Cinema Through Time',
    mood: 'Historical representation, era-specific aesthetics, cultural zeitgeist',
    colors: 'Period-accurate color palettes, decade-specific tones',
    cinematography: 'Era-appropriate filming techniques, historical accuracy',
    commonElements: 'Period equipment, cultural markers, historical context',

    episodes: {
      '1970s-auteur-renaissance': {
        title: '1970s: The Auteur Renaissance',
        mood: 'Rebellious spirit, counterculture influence, New Hollywood energy',
        colors: 'Warm 70s tones, golden hour lighting, earthy palette',
        elements: 'Young filmmaker, vintage 16mm camera, long hair, Easy Rider aesthetic',
        prompt: '1970s New Hollywood atmosphere, young filmmaker with long hair and vintage film camera, counterculture influence, Easy Rider aesthetic, rebellious cinematic spirit, warm 70s lighting',
        icon: '📽️',
        keywords: ['1970s', 'auteur', 'counterculture', 'filmmaker', 'rebellious']
      },

      '1990s-independent-renaissance': {
        title: '1990s: Independent Renaissance',
        mood: 'Alternative culture, indie film aesthetic, Sundance atmosphere',
        colors: 'Indie film tones, handheld camera aesthetic, festival lighting',
        elements: 'Film festival setting, indie production equipment, Pulp Fiction influence',
        prompt: 'Sundance Film Festival atmosphere, indie film production, handheld camera aesthetic, alternative culture influence, Pulp Fiction style, independent filmmaker workspace',
        icon: '🎬',
        keywords: ['indie', 'sundance', 'independent', '1990s', 'festival']
      }
    }
  }
};

// Helper functions for guidance lookup
export const getEpisodeGuidance = (themeSlug, episodeSlug) => {
  const theme = HERO_IMAGE_GUIDANCE[themeSlug];
  if (!theme) return null;

  const episode = theme.episodes?.[episodeSlug];
  if (!episode) {
    // Return generic theme guidance if specific episode not found
    return {
      title: 'Educational Episode',
      mood: theme.mood || 'Sophisticated cinematic atmosphere',
      colors: theme.colors || 'Warm cinematic tones, professional color grading',
      elements: theme.commonElements || 'Educational film content, sophisticated presentation',
      prompt: `${theme.baseTheme} educational content, sophisticated cinematography, professional lighting, editorial style, museum quality composition`,
      icon: '🎯',
      keywords: ['educational', 'sophisticated', 'cinematic']
    };
  }

  return episode;
};

export const generatePrompt = (guidance, includeModifiers = true) => {
  if (!guidance) return '';

  let prompt = guidance.prompt;
  
  if (includeModifiers) {
    prompt += ', professional cinematography, warm golden lighting, rich contrast, --ar 2:1 --style raw';
  }
  
  return prompt;
};

export const getThemeGuidance = (themeSlug) => {
  return HERO_IMAGE_GUIDANCE[themeSlug] || null;
};

// Search function to find episodes by keywords
export const searchEpisodesByKeyword = (keyword) => {
  const results = [];
  
  Object.entries(HERO_IMAGE_GUIDANCE).forEach(([themeSlug, theme]) => {
    if (theme.episodes) {
      Object.entries(theme.episodes).forEach(([episodeSlug, episode]) => {
        const searchText = `${episode.title} ${episode.mood} ${episode.elements} ${episode.keywords?.join(' ')}`.toLowerCase();
        if (searchText.includes(keyword.toLowerCase())) {
          results.push({
            themeSlug,
            episodeSlug,
            episode
          });
        }
      });
    }
  });
  
  return results;
};