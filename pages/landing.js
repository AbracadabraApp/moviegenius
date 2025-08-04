/**
 * Landing Page - MovieGenius Onboarding Experience
 *
 * Captures user preferences, explains features, and provides personalized recommendations.
 * Flow: Streaming → Episode Testing → Queue Tutorial → Recommendations → Footer
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import { Play, Plus, Heart, ChevronRight, Star } from 'lucide-react';

export default function Landing() {
  const router = useRouter();

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState('streaming'); // streaming, episodes, queue, recommendations
  const [formData, setFormData] = useState({
    streamingServices: [],
    episodePreferences: [],
    completedTutorial: false,
  });
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);

  // Available streaming services using site structure
  const streamingServices = [
    'Netflix',
    'Amazon Prime Video',
    'Disney+',
    'Apple TV+',
    'HBO Max',
    'Hulu',
    'Paramount+',
    'Peacock',
  ];

  const additionalPlatforms = [
    'YouTube TV',
    'Crunchyroll',
    'Showtime',
    'Starz',
    'Tubi',
    'Pluto TV',
    'IMDb TV',
    'Vudu',
    'Kanopy',
    'Hoopla',
    'The Criterion Channel',
    'Shudder',
  ];

  const displayedServices = showAllPlatforms
    ? [...streamingServices, ...additionalPlatforms]
    : streamingServices;

  // Sample episodes for testing preferences - rotating through available local images
  const movieRotations = [
    [
      '/images/posters/raiders-of-the-lost-ark.jpg',
      '/images/posters/jaws.jpg',
      '/images/posters/star-wars.jpg',
    ],
    [
      '/images/posters/citizen-kane.jpg',
      '/images/posters/casablanca.jpg',
      '/images/posters/the-godfather.jpg',
    ],
    [
      '/images/posters/blade-runner.jpg',
      '/images/posters/2001-a-space-odyssey.jpg',
      '/images/posters/e-t-the-extra-terrestrial.jpg',
    ],
    [
      '/images/posters/psycho.jpg',
      '/images/posters/the-silence-of-the-lambs.jpg',
      '/images/posters/vertigo.jpg',
    ],
  ];

  const currentRotation = Math.floor(Date.now() / (1000 * 60 * 5)) % 3; // Rotate every 5 minutes

  const testEpisodes = [
    {
      id: 'action-thriller',
      title: 'Action & Adventure',
      description: 'High-octane sequences and thrilling adventures',
      genre: 'Action/Adventure',
      image: movieRotations[0][currentRotation],
    },
    {
      id: 'indie-drama',
      title: 'Classic Drama',
      description: 'Character-driven stories and masterful performances',
      genre: 'Drama/Classic',
      image: movieRotations[1][currentRotation],
    },
    {
      id: 'sci-fi',
      title: 'Science Fiction',
      description: 'Futuristic concepts and visual innovation',
      genre: 'Sci-Fi/Fantasy',
      image: movieRotations[2][currentRotation],
    },
    {
      id: 'horror',
      title: 'Thriller & Suspense',
      description: 'Psychological tension and masterful direction',
      genre: 'Horror/Thriller',
      image: movieRotations[3][currentRotation],
    },
  ];

  // Sample recommendations
  const movieRecommendations = [
    { title: 'The Dark Knight', year: 2008, genre: 'Action', rating: 9.0 },
    { title: 'Parasite', year: 2019, genre: 'Thriller', rating: 8.6 },
    { title: 'Spirited Away', year: 2001, genre: 'Animation', rating: 9.3 },
    { title: 'Pulp Fiction', year: 1994, genre: 'Crime', rating: 8.9 },
    { title: 'The Godfather', year: 1972, genre: 'Drama', rating: 9.2 },
  ];

  const episodeRecommendations = [
    { title: 'Breaking Bad Analysis', type: 'Character Study', duration: '12 min' },
    { title: 'Cinematography in Drive', type: 'Visual Essay', duration: '8 min' },
    { title: "Kubrick's Symmetry", type: 'Director Focus', duration: '15 min' },
    { title: 'Color in Her', type: 'Technical Analysis', duration: '10 min' },
    { title: "Hitchcock's Suspense", type: 'Genre Study', duration: '14 min' },
  ];

  const popularTags = [
    'Character Development',
    'Cinematography',
    'Plot Twists',
    'Director Study',
    'Genre Analysis',
    'Visual Effects',
    'Sound Design',
    'Editing',
    'Themes',
    'Cultural Impact',
    'Historical Context',
    'Acting Techniques',
    'Symbolism',
  ];

  // Handle streaming service selection
  const toggleStreamingService = service => {
    const newServices = formData.streamingServices.includes(service)
      ? formData.streamingServices.filter(s => s !== service)
      : [...formData.streamingServices, service];

    setFormData({ ...formData, streamingServices: newServices });
  };

  // Handle episode preference selection
  const toggleEpisodePreference = episodeId => {
    const newPreferences = formData.episodePreferences.includes(episodeId)
      ? formData.episodePreferences.filter(id => id !== episodeId)
      : [...formData.episodePreferences, episodeId];

    setFormData({ ...formData, episodePreferences: newPreferences });
  };

  // Navigate to next step
  const nextStep = () => {
    const steps = ['streaming', 'episodes', 'queue', 'recommendations'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  // Complete onboarding
  const completeOnboarding = () => {
    // Save preferences to localStorage or API
    localStorage.setItem('movieGenius_preferences', JSON.stringify(formData));
    router.push('/');
  };

  return (
    <PhoneFrame>
      <div style={styles.container}>
        {/* Streaming Services Section */}
        {currentStep === 'streaming' && (
          <div style={styles.section}>
            <div style={styles.heroSection}>
              <p style={styles.goldSubtitle}>
                <span style={{ fontSize: '30px', color: '#ffffff', letterSpacing: '1px' }}>
                  DON'T BINGE TV
                </span>
                <br />
                STREAM FILM SCHOOL INSTEAD
              </p>
              <img
                src="/images/hero-rotation/hero-1.jpg"
                alt="MovieGenius Hero"
                style={styles.heroImage}
              />
            </div>

            <div style={styles.contentSection}>
              <p style={styles.sectionQuestion}>What streaming services do you use?</p>
              <div style={styles.streamingGrid}>
                {displayedServices.map(service => (
                  <button
                    key={service}
                    onClick={() => toggleStreamingService(service)}
                    style={{
                      ...styles.streamingButton,
                      backgroundColor: formData.streamingServices.includes(service)
                        ? '#374151'
                        : '#f3f4f6',
                      color: formData.streamingServices.includes(service) ? '#ffffff' : '#374151',
                      borderColor: formData.streamingServices.includes(service)
                        ? '#374151'
                        : '#d1d5db',
                    }}
                  >
                    {service}
                  </button>
                ))}
                {!showAllPlatforms && (
                  <div style={{ ...styles.moreLink, gridColumn: '1 / -1' }}>
                    <span style={styles.moreLinkText} onClick={() => setShowAllPlatforms(true)}>
                      More streaming services?
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={nextStep}
                disabled={formData.streamingServices.length === 0}
                style={{
                  ...styles.saveButton,
                  opacity: formData.streamingServices.length === 0 ? 0.5 : 1,
                  marginTop: showAllPlatforms ? '10px' : '0px',
                }}
              >
                Continue <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Episode Testing Section */}
        {currentStep === 'episodes' && (
          <div style={styles.section}>
            <div style={styles.header}>
              <h2 style={styles.title}>Find Your Style</h2>
              <p style={styles.subtitle}>Which of these appeals to you most?</p>
            </div>

            <div style={styles.episodeGrid}>
              {testEpisodes.map(episode => (
                <div
                  key={episode.id}
                  onClick={() => toggleEpisodePreference(episode.id)}
                  style={{
                    ...styles.episodeCard,
                    borderColor: formData.episodePreferences.includes(episode.id)
                      ? '#3b82f6'
                      : '#e5e7eb',
                  }}
                >
                  <img
                    src={episode.image}
                    alt={episode.title}
                    style={styles.episodeImage}
                    onError={e => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div
                    style={{ ...styles.episodeImage, ...styles.imagePlaceholder, display: 'none' }}
                  >
                    <span style={styles.placeholderText}>{episode.genre}</span>
                  </div>
                  <div style={styles.episodeContent}>
                    <h3 style={styles.episodeTitle}>{episode.title}</h3>
                    <p style={styles.episodeGenre}>{episode.genre}</p>
                    <p style={styles.episodeDescription}>{episode.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={nextStep}
              disabled={formData.episodePreferences.length === 0}
              style={{
                ...styles.saveButton,
                opacity: formData.episodePreferences.length === 0 ? 0.5 : 1,
              }}
            >
              Continue <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Queue Tutorial Section */}
        {currentStep === 'queue' && (
          <div style={styles.section}>
            <div style={styles.header}>
              <h2 style={styles.title}>Your Personal Queue</h2>
              <p style={styles.subtitle}>Save movies and episodes to watch later</p>
            </div>

            <div style={styles.tutorialCard}>
              <div style={styles.tutorialImage}>
                <div style={styles.mockPoster}>
                  <Plus size={24} color="#6b7280" />
                </div>
              </div>

              <div style={styles.tutorialSteps}>
                <div style={styles.step}>
                  <div style={styles.stepNumber}>1</div>
                  <p style={styles.stepText}>
                    Tap the <Plus size={16} style={{ display: 'inline' }} /> icon on any movie
                    poster
                  </p>
                </div>

                <div style={styles.step}>
                  <div style={styles.stepNumber}>2</div>
                  <p style={styles.stepText}>Double-tap any poster for quick add</p>
                </div>

                <div style={styles.step}>
                  <div style={styles.stepNumber}>3</div>
                  <p style={styles.stepText}>Access your queue anytime from the menu</p>
                </div>
              </div>
            </div>

            <button onClick={nextStep} style={styles.saveButton}>
              Got it! <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Recommendations Section */}
        {currentStep === 'recommendations' && (
          <div style={styles.section}>
            <div style={styles.header}>
              <h2 style={styles.title}>Recommended for You</h2>
              <p style={styles.subtitle}>Based on your preferences</p>
            </div>

            {/* Movie Recommendations */}
            <div style={styles.recommendationSection}>
              <h3 style={styles.sectionTitle}>Movies to Watch</h3>
              <div style={styles.movieList}>
                {movieRecommendations.map((movie, index) => (
                  <div key={index} style={styles.movieItem}>
                    <div style={styles.movieInfo}>
                      <span style={styles.movieTitle}>{movie.title}</span>
                      <span style={styles.movieMeta}>
                        {movie.year} • {movie.genre}
                      </span>
                    </div>
                    <div style={styles.rating}>
                      <Star size={14} fill="#fbbf24" color="#fbbf24" />
                      <span>{movie.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Episode Recommendations */}
            <div style={styles.recommendationSection}>
              <h3 style={styles.sectionTitle}>Episodes to Explore</h3>
              <div style={styles.episodeList}>
                {episodeRecommendations.map((episode, index) => (
                  <div key={index} style={styles.episodeItem}>
                    <Play size={16} color="#6b7280" />
                    <div style={styles.episodeInfo}>
                      <span style={styles.episodeItemTitle}>{episode.title}</span>
                      <span style={styles.episodeItemMeta}>
                        {episode.type} • {episode.duration}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tag Cloud */}
            <div style={styles.recommendationSection}>
              <h3 style={styles.sectionTitle}>Popular Topics</h3>
              <div style={styles.tagCloud}>
                {popularTags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      ...styles.tag,
                      fontSize: Math.random() > 0.5 ? '14px' : '12px',
                      opacity: Math.random() * 0.4 + 0.6,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <button onClick={completeOnboarding} style={styles.saveButton}>
              Start Exploring
            </button>
          </div>
        )}

        {/* Footer - Always visible on recommendations step */}
        {currentStep === 'recommendations' && (
          <div style={styles.footer}>
            <div style={styles.footerSection}>
              <h4 style={styles.footerTitle}>Featured Episodes</h4>
              <div style={styles.footerEpisodes}>
                <span style={styles.footerEpisode}>Kubrick's Visual Language</span>
                <span style={styles.footerEpisode}>Tarantino's Dialogue</span>
                <span style={styles.footerEpisode}>Nolan's Time</span>
              </div>
            </div>

            <div style={styles.footerSection}>
              <h4 style={styles.footerTitle}>Platform</h4>
              <div style={styles.platformPicker}>
                <button style={styles.platformButton}>Web</button>
                <button
                  style={{ ...styles.platformButton, backgroundColor: '#3b82f6', color: '#ffffff' }}
                >
                  Mobile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  section: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },

  heroSection: {
    position: 'relative',
    minHeight: 'auto',
    width: '100%',
    background: 'linear-gradient(to bottom, #000000 0%, #374151 100%)',
    marginBottom: '0px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '20px',
  },

  heroImage: {
    width: '100%',
    height: '25vh',
    objectFit: 'cover',
    borderRadius: '1px',
    marginTop: '1px',
  },

  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      'linear-gradient(to bottom, rgba(52, 58, 64, 0.5) 0%, rgba(52, 58, 64, 0.6) 50%, rgba(52, 58, 64, 0.4) 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    textAlign: 'center',
    paddingTop: '20px',
  },

  header: {
    textAlign: 'center',
    marginBottom: '32px',
    padding: '0 24px',
  },

  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  heroTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
    lineHeight: '1.2',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
  },

  heroSubtitle: {
    fontSize: '16px',
    color: '#ffffff',
    margin: 0,
    lineHeight: '1.5',
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
  },

  goldSubtitle: {
    fontSize: '18px',
    color: '#d4af37',
    margin: '10px 0 16px 0',
    lineHeight: '1.5',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.5',
  },

  // Streaming Services Styles
  streamingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '0px',
  },

  streamingButton: {
    padding: '12px',
    border: '1px solid transparent',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    fontFamily: 'inherit',
  },

  moreLink: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '2px',
    marginBottom: '24px',
  },

  moreLinkText: {
    fontSize: '14px',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: '500',
    textDecoration: 'underline',
  },

  // Episode Testing Styles
  episodeGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '32px',
  },

  episodeCard: {
    display: 'flex',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
  },

  episodeImage: {
    width: '80px',
    height: '120px',
    borderRadius: '8px',
    objectFit: 'cover',
    marginRight: '16px',
  },

  imagePlaceholder: {
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #e5e7eb',
  },

  placeholderText: {
    fontSize: '11px',
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: '1.2',
  },

  episodeContent: {
    flex: 1,
  },

  episodeTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0',
    lineHeight: '1.3',
  },

  episodeGenre: {
    fontSize: '12px',
    color: '#3b82f6',
    margin: '0 0 8px 0',
    fontWeight: '500',
  },

  episodeDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.4',
  },

  // Tutorial Styles
  tutorialCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
  },

  tutorialImage: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },

  mockPoster: {
    width: '120px',
    height: '180px',
    backgroundColor: '#e5e7eb',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  tutorialSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },

  stepNumber: {
    width: '24px',
    height: '24px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    flexShrink: 0,
  },

  stepText: {
    fontSize: '14px',
    color: '#374151',
    margin: 0,
    lineHeight: '1.5',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  // Recommendations Styles
  recommendationSection: {
    marginBottom: '32px',
  },

  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 16px 0',
  },

  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  movieItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },

  movieInfo: {
    display: 'flex',
    flexDirection: 'column',
  },

  movieTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
  },

  movieMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },

  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#111827',
  },

  episodeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  episodeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },

  episodeInfo: {
    display: 'flex',
    flexDirection: 'column',
  },

  episodeItemTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827',
  },

  episodeItemMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },

  // Tag Cloud Styles
  tagCloud: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },

  tag: {
    padding: '6px 12px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
  },

  // Button Styles
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#ffd700',
    color: '#000000',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '0px',
    fontFamily: 'inherit',
  },

  continueButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#374151',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: 'auto',
    fontFamily: 'inherit',
  },

  completeButton: {
    backgroundColor: '#374151',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '16px',
    fontFamily: 'inherit',
  },

  // Footer Styles
  footer: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderTop: '1px solid #e5e7eb',
  },

  footerSection: {
    marginBottom: '20px',
  },

  footerTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0',
  },

  footerEpisodes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  footerEpisode: {
    fontSize: '12px',
    color: '#6b7280',
  },

  platformPicker: {
    display: 'flex',
    gap: '8px',
  },

  contentSection: {
    padding: '0px 20px 24px 20px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(to bottom, #000000 0%, #6b7280 100%)',
  },

  sectionQuestion: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#ffffff',
    margin: '30px 0 20px 0',
    textAlign: 'center',
    lineHeight: '1.3',
    letterSpacing: '-0.5px',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },

  platformButton: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
