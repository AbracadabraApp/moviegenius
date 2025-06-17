// components/GeniusEpisodePage.js
import PhoneFrame from './PhoneFrame';
import AskInputBar from './AskInputBar';
import GeniusEpisodeTemplate from './GeniusEpisodeTemplate';
import { useRouter } from 'next/router';

// Theme directory mapping for scalable hero image structure
const THEME_DIRS = {
  '1': 'theme-1-noir',
  '2': 'theme-2-scifi', 
  '3': 'theme-3-auteur',
  '4': 'theme-4-genre',
  '5': 'theme-5-world',
  '6': 'theme-6-technical'
};

// Series directory mapping within themes
const SERIES_DIRS = {
  '1': { '1': 'series-1-classic', '2': 'series-2-neo', '3': 'series-3-crime', '4': 'series-4-contemporary', '5': 'series-5-international', '6': 'series-6-television' },
  '2': { '1': 'series-1-early', '2': 'series-2-newhollywood', '3': 'series-3-digital', '4': 'series-4-contemporary', '5': 'series-5-fantasy', '6': 'series-6-horror' },
  // Add more as needed...
};

// Function to get hero image with intelligent directory-based fallback
function getHeroImage(themeId, seriesId, episodeId) {
  // Episode-specific hero images for series 1/1 (Classic Film Noir)
  if (themeId === '1' && seriesId === '1') {
    const episodeImages = {
      '1': '1-german-expressionism.jpg',
      '2': '2-novel.jpg', 
      '3': '3-mitchum.jpg',
      '4': '4-femme-fateles.jpg',
      '5': '5-moral-ambiguity.jpg',
      '6': '6-noirs-legacy.jpg'
    };
    
    const imageFile = episodeImages[episodeId];
    if (imageFile) {
      return `/images/hero/theme-1-noir/series-1-classic/${imageFile}`;
    }
  }
  
  // Episode-specific hero images for series 1/2 (Suspense & Horror)
  if (themeId === '1' && seriesId === '2') {
    const episodeImages = {
      '1': '1-giallo.jpg',
      '2': '2-cronenberG.jpg'
    };
    
    const imageFile = episodeImages[episodeId];
    if (imageFile) {
      return `/images/hero/theme-1-genres/series-2-horror/${imageFile}`;
    }
  }
  
  // Fallback to default
  return '/images/hero/default.jpg';
}

export default function GeniusEpisodePage({ 
  episodeData, 
  themeId, 
  seriesId, 
  episodeId, 
  handleAsk 
}) {
  const router = useRouter();
  
  // Get hero image with intelligent fallback
  const heroImage = getHeroImage(themeId, seriesId, episodeId);

  // Estimate reading time based on content length
  const estimateReadingTime = (content) => {
    if (!content?.sections) return "5 min read";
    
    const wordCount = content.sections.reduce((total, section) => {
      if (section.type === 'text') {
        return total + section.content.split(' ').length;
      }
      return total;
    }, 0);
    
    // Average reading speed is 200-250 words per minute
    const minutes = Math.max(Math.ceil(wordCount / 225), 3);
    return `${minutes} min read`;
  };

  const readTime = estimateReadingTime(episodeData.content);

  return (
    <PhoneFrame active="genius">
      <div style={styles.container}>
        {/* Fixed Ask Input Bar */}
        <div style={styles.fixedInputArea}>
          <AskInputBar onSubmit={handleAsk} />
        </div>
        
        {/* Episode Content */}
        <div style={styles.episodeContainer}>
          <GeniusEpisodeTemplate 
            episodeData={episodeData}
            heroImage={heroImage}
            estimatedReadTime={readTime}
          />
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  fixedInputArea: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '16px',
    background: 'linear-gradient(to right, rgba(0,0,0,1.0) 0%, rgba(0,0,0,0.7) 100%), linear-gradient(to bottom, rgba(0,0,0,1.0) 0%, rgba(0,0,0,1.0) 50%, rgba(0,0,0,0.3) 100%)',
    backdropFilter: 'blur(10px)',
  },
  episodeContainer: {
    flex: 1,
    overflowY: 'scroll',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
};