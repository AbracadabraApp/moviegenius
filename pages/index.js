/**
 * Homepage - Genius Education Experience
 * 
 * Main landing page focused on film education themes.
 * Flow: Theme Selection → Episode Recommendations → Learning Path
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PhoneFrame from '../components/PhoneFrame';
import { Play, Plus, Heart, ChevronRight, Star, Book } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState('themes'); // themes, episodes, recommendations
  const [formData, setFormData] = useState({
    selectedThemes: [],
    episodePreferences: [],
    completedIntro: false
  });
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);

  // Simple test rotation - just pick a random hero image on each reload
  useEffect(() => {
    const randomHero = Math.floor(Math.random() * 26) + 1;
    setCurrentRotation(randomHero);
  }, []);

  // 10 Education Themes - All displayed in beautiful grid
  const allEducationThemes = [
    'Film Noir',
    'Horror & Suspense', 
    'Comedy',
    'Women Directors',
    'International Masters',
    'Acclaimed Directors',
    'Revolutionary Movements',
    'The Magic of Moviemaking',
    'Cinema Through the Decades',
    'Cinema\'s Cultural Impact'
  ];

  // Sample episodes for learning preferences
  const movieRotations = [
    ['/images/posters/the-maltese-falcon.jpg', '/images/posters/double-indemnity.jpg', '/images/posters/sunset-boulevard.jpg'],
    ['/images/posters/psycho.jpg', '/images/posters/the-silence-of-the-lambs.jpg', '/images/posters/hereditary.jpg'], 
    ['/images/posters/some-like-it-hot.jpg', '/images/posters/the-grand-budapest-hotel.jpg', '/images/posters/parasite.jpg'],
    ['/images/posters/portrait-of-a-lady-on-fire.jpg', '/images/posters/the-hurt-locker.jpg', '/images/posters/nomadland.jpg']
  ];
  
  const learningEpisodes = [
    {
      id: 'film-noir',
      title: 'Film Noir Fundamentals',
      description: 'Shadows, moral ambiguity, and the dark side of cinema',
      category: 'Classic Genres',
      image: movieRotations[0][currentRotation]
    },
    {
      id: 'horror-evolution',
      title: 'Horror Through Time',
      description: 'From Gothic tales to psychological terror',
      category: 'Genre Evolution',
      image: movieRotations[1][currentRotation]
    },
    {
      id: 'comedy-masters',
      title: 'Masters of Comedy',
      description: 'Making audiences laugh across generations',
      category: 'Comedy/Timing',
      image: movieRotations[2][currentRotation]
    },
    {
      id: 'women-pioneers',
      title: 'Women Behind the Camera',
      description: 'Pioneering female voices in cinema history',
      category: 'Directors/History',
      image: movieRotations[3][currentRotation]
    }
  ];

  // Sample recommendations
  const episodeRecommendations = [
    { title: 'German Expressionism', category: 'Film Noir', duration: '12 min' },
    { title: 'Hitchcock\'s Camera Psychology', category: 'Moviemaking', duration: '15 min' },
    { title: 'French New Wave Revolution', category: 'Movements', duration: '18 min' },
    { title: 'Kurosawa\'s Epic Vision', category: 'International', duration: '14 min' },
    { title: 'Silent Comedy Stars', category: 'Comedy', duration: '10 min' }
  ];

  const directorSpotlights = [
    { name: 'Alfred Hitchcock', era: 'Master of Suspense', specialty: 'Psychological Thrillers' },
    { name: 'Akira Kurosawa', era: 'Japanese Cinema', specialty: 'Epic Storytelling' },
    { name: 'Kathryn Bigelow', era: 'Contemporary', specialty: 'Action Cinema' },
    { name: 'Wong Kar-wai', era: 'Hong Kong New Wave', specialty: 'Romantic Melancholy' },
    { name: 'Jordan Peele', era: 'Modern Horror', specialty: 'Social Commentary' }
  ];

  const popularTopics = [
    'Camera Movement', 'Editing Techniques', 'Color Psychology', 'Sound Design',
    'Mise-en-scène', 'Auteur Theory', 'Genre Evolution', 'Cultural Impact',
    'Visual Storytelling', 'Character Development', 'Narrative Structure', 'Film History'
  ];

  // Handle theme selection and navigation
  const handleThemeClick = (theme) => {
    console.log('Theme clicked:', theme);
    
    // Map themes to simple page routes
    const themeRoutes = {
      'Film Noir': '/film-noir',
      'Horror & Suspense': '/horror-suspense',
      'Comedy': '/comedy-through-time',
      'Women Directors': '/women-directors',
      'International Masters': '/world-cinema',
      'Acclaimed Directors': '/acclaimed-directors',
      'Revolutionary Movements': '/avant-garde-film',
      'The Magic of Moviemaking': '/magic-of-moviemaking',
      'Cinema Through the Decades': '/cinema-through-decades',
      'Cinema\'s Cultural Impact': '/cinema-cultural-impact'
    };
    
    const targetRoute = themeRoutes[theme];
    
    if (targetRoute) {
      console.log('Navigating to:', targetRoute);
      router.push(targetRoute);
    } else {
      console.error('No route found for theme:', theme);
      // Could show an error message or redirect to a sensible default
    }
  };

  // Handle episode preference selection
  const toggleEpisodePreference = (episodeId) => {
    const newPreferences = formData.episodePreferences.includes(episodeId)
      ? formData.episodePreferences.filter(id => id !== episodeId)
      : [...formData.episodePreferences, episodeId];
    
    setFormData({ ...formData, episodePreferences: newPreferences });
  };

  // Navigate to next step
  const nextStep = () => {
    const steps = ['themes', 'episodes', 'recommendations'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  // Start learning journey
  const startLearning = () => {
    // Save preferences to localStorage
    localStorage.setItem('geniusPreferences', JSON.stringify(formData));
    router.push('/genius');
  };

  return (
    <PhoneFrame active="genius">
      <div style={styles.container}>
        
        {/* Theme Selection Section */}
        {currentStep === 'themes' && (
          <div style={styles.section}>
            <div style={styles.heroSection}>
              <p style={styles.goldSubtitle}><span style={{fontSize: '30px', color: '#ffffff', letterSpacing: '1px'}}>DON'T BINGE TV</span><br /><span style={{fontSize: '20px'}}>FEAST ON GREAT FILMS INSTEAD</span></p>
              <img src={`/images/hero-rotation/hero-${currentRotation}.jpg`} alt="Film Education Hero" style={styles.heroImage} />
            </div>

            <div style={styles.contentSection}>
              <p style={styles.sectionQuestion}>Which film topics interest you most?</p>
              <div style={styles.themeGrid}>
              {allEducationThemes.map(theme => (
                <button
                  key={theme}
                  onClick={() => handleThemeClick(theme)}
                  style={styles.themeButton}
                >
                  {theme}
                </button>
              ))}
            </div>

            </div>
          </div>
        )}

        {/* Learning Style Section */}
        {currentStep === 'episodes' && (
          <div style={styles.section}>
            <div style={styles.header}>
              <h2 style={styles.title}>Your Learning Style</h2>
              <p style={styles.subtitle}>Which approach appeals to you most?</p>
            </div>

            <div style={styles.episodeGrid}>
              {learningEpisodes.map(episode => (
                <div
                  key={episode.id}
                  onClick={() => toggleEpisodePreference(episode.id)}
                  style={{
                    ...styles.episodeCard,
                    borderColor: formData.episodePreferences.includes(episode.id) 
                      ? '#d4af37' 
                      : '#e5e7eb'
                  }}
                >
                  <img 
                  src={episode.image} 
                  alt={episode.title} 
                  style={styles.episodeImage}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{...styles.episodeImage, ...styles.imagePlaceholder, display: 'none'}}>
                  <span style={styles.placeholderText}>{episode.category}</span>
                </div>
                  <div style={styles.episodeContent}>
                    <h3 style={styles.episodeTitle}>{episode.title}</h3>
                    <p style={styles.episodeGenre}>{episode.category}</p>
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
                opacity: formData.episodePreferences.length === 0 ? 0.5 : 1
              }}
            >
              Continue <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Recommendations Section */}
        {currentStep === 'recommendations' && (
          <div style={styles.section}>
            <div style={styles.header}>
              <h2 style={styles.title}>Your Learning Path</h2>
              <p style={styles.subtitle}>Personalized film education journey</p>
            </div>

            {/* Episode Recommendations */}
            <div style={styles.recommendationSection}>
              <h3 style={styles.sectionTitle}>Recommended Episodes</h3>
              <div style={styles.episodeList}>
                {episodeRecommendations.map((episode, index) => (
                  <div key={index} style={styles.episodeItem}>
                    <Play size={16} color="#d4af37" />
                    <div style={styles.episodeInfo}>
                      <span style={styles.episodeItemTitle}>{episode.title}</span>
                      <span style={styles.episodeItemMeta}>{episode.category} • {episode.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Director Spotlights */}
            <div style={styles.recommendationSection}>
              <h3 style={styles.sectionTitle}>Featured Directors</h3>
              <div style={styles.directorList}>
                {directorSpotlights.map((director, index) => (
                  <div key={index} style={styles.directorItem}>
                    <div style={styles.directorInfo}>
                      <span style={styles.directorName}>{director.name}</span>
                      <span style={styles.directorMeta}>{director.era} • {director.specialty}</span>
                    </div>
                    <Book size={16} color="#6b7280" />
                  </div>
                ))}
              </div>
            </div>

            {/* Topic Cloud */}
            <div style={styles.recommendationSection}>
              <h3 style={styles.sectionTitle}>Film Topics</h3>
              <div style={styles.tagCloud}>
                {popularTopics.map((topic, index) => (
                  <span
                    key={index}
                    style={{
                      ...styles.tag,
                      fontSize: Math.random() > 0.5 ? '14px' : '12px',
                      opacity: Math.random() * 0.4 + 0.6
                    }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={startLearning}
              style={styles.saveButton}
            >
              Start Learning Journey
            </button>
          </div>
        )}

        {/* Footer - Always visible on recommendations step */}
        {currentStep === 'recommendations' && (
          <div style={styles.footer}>
            <div style={styles.footerSection}>
              <h4 style={styles.footerTitle}>Popular Series</h4>
              <div style={styles.footerEpisodes}>
                <span style={styles.footerEpisode}>Film Noir Fundamentals</span>
                <span style={styles.footerEpisode}>Revolutionary Movements</span>
                <span style={styles.footerEpisode}>Women Directors</span>
              </div>
            </div>
            
            <div style={styles.footerSection}>
              <h4 style={styles.footerTitle}>Experience</h4>
              <div style={styles.platformPicker}>
                <button style={styles.platformButton}>Beginner</button>
                <button style={{...styles.platformButton, backgroundColor: '#d4af37', color: '#000000'}}>Intermediate</button>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
    background: 'linear-gradient(to bottom, #1a1a1a 0%, #374151 100%)',
    marginBottom: '0px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '12px',
  },
  
  heroImage: {
    width: '100%',
    height: '25vh',
    objectFit: 'cover',
    borderRadius: '1px',
    marginTop: '1px',
  },
  
  header: {
    textAlign: 'center',
    marginBottom: '20px',
    padding: '0 24px',
  },
  
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0',
    lineHeight: '1.2',
  },
  
  goldSubtitle: {
    fontSize: '18px',
    color: '#d4af37',
    margin: '5px 0 8px 0',
    lineHeight: '1.3',
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
  
  // Theme Selection Styles - Beautiful 2x5 grid
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '0px',
  },
  
  themeButton: {
    padding: '14px 8px',
    border: '1px solid transparent',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    fontFamily: 'inherit',
    lineHeight: '1.2',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    backgroundColor: '#ffffff',
    color: '#2c3e50',
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
    gap: '12px',
    marginBottom: '20px',
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
    color: '#d4af37',
    margin: '0 0 8px 0',
    fontWeight: '500',
  },
  
  episodeDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.4',
  },
  
  // Recommendations Styles
  recommendationSection: {
    marginBottom: '20px',
  },
  
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 16px 0',
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
    flex: 1,
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

  // Director Styles
  directorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  
  directorItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  
  directorInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  
  directorName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
  },
  
  directorMeta: {
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
    backgroundColor: '#d4af37',
    color: '#000000',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0px',
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
    padding: '0px 20px 16px 20px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(to bottom, #1a1a1a 0%, #6b7280 100%)',
  },
  
  sectionQuestion: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#ffffff',
    margin: '20px 0 15px 0',
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