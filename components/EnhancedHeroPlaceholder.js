// Enhanced Hero Placeholder with Visual Guidance
import { useState } from 'react';
import { Camera, Palette, Lightbulb, Copy, Check } from 'lucide-react';

// Episode-specific visual guidance data
const EPISODE_GUIDANCE = {
  // Film Noir Series
  'german-expressionism': {
    theme: 'German Expressionism',
    mood: 'Angular shadows, distorted perspectives',
    colors: 'High contrast black/white, dramatic lighting',
    elements: 'Painted backdrops, geometric shadows, tilted angles',
    prompt: 'German Expressionist film set, dramatic angular shadows, silent film era aesthetic, The Cabinet of Dr. Caligari style, high contrast chiaroscuro lighting',
    icon: '🎭'
  },
  'urban-anxiety': {
    theme: 'Urban Anxiety',
    mood: 'Claustrophobic, overwhelming city atmosphere',
    colors: 'Dark grays, harsh street lighting, urban decay',
    elements: 'Crowded streets, towering buildings, psychological tension',
    prompt: 'Claustrophobic city atmosphere, crowded streets, urban decay, psychological tension, overwhelming architecture, film noir lighting',
    icon: '🏙️'
  },
  'femme-fatales': {
    theme: 'Femme Fatales',
    mood: 'Mysterious, seductive, dangerous beauty',
    colors: 'Red lips on black/white, dramatic shadows',
    elements: 'Woman silhouette, doorway lighting, glamour with threat',
    prompt: 'Mysterious woman silhouette, red lips in black and white, dangerous beauty, seductive lighting, glamorous yet threatening',
    icon: '💋'
  },
  
  // Contemporary Auteurs
  'coen-brothers': {
    theme: 'Coen Brothers',
    mood: 'Quirky americana, dark humor undertones',
    colors: 'Warm earth tones, vintage americana palette',
    elements: 'Desert highway, roadside diner, eccentric characters',
    prompt: 'Quirky americana landscape, vintage roadside diner, desert highway, eccentric character silhouettes, retro americana with dark humor',
    icon: '🛣️'
  },

  // Technical Evolution
  'digital-revolution': {
    theme: 'Digital Revolution',
    mood: 'Technological innovation, future meets past',
    colors: 'Blue digital glow, warm practical lighting contrast',
    elements: 'CGI workstation, wireframes, digital vs practical',
    prompt: 'Computer graphics workstation, digital effects creation, CGI wireframes overlaying real footage, technological transformation',
    icon: '💻'
  },

  // Decades Series
  '1970s-auteur': {
    theme: '1970s Auteur Renaissance',
    mood: 'Rebellious spirit, counterculture influence',
    colors: 'Warm 70s tones, golden hour lighting',
    elements: 'Young filmmaker, vintage camera, Easy Rider aesthetic',
    prompt: '1970s New Hollywood atmosphere, young filmmaker with long hair, vintage film camera, counterculture influence, Easy Rider aesthetic',
    icon: '📽️'
  },
  '1990s-independent': {
    theme: '1990s Independent Cinema',
    mood: 'Alternative culture, indie film aesthetic',
    colors: 'Handheld camera tones, Sundance atmosphere',
    elements: 'Film festival setting, indie production, Pulp Fiction style',
    prompt: 'Sundance Film Festival atmosphere, indie film production, handheld camera aesthetic, Pulp Fiction style, independent filmmaker workspace',
    icon: '🎬'
  }
};

// Generic fallback for episodes not in the guidance data
const GENERIC_GUIDANCE = {
  theme: 'Cinema Education',
  mood: 'Sophisticated, intellectual, artistic',
  colors: 'Warm golds, deep shadows, cinematic contrast',
  elements: 'Professional cinematography, editorial style',
  prompt: 'Sophisticated cinematic still, film studies aesthetic, dramatic lighting, editorial photography style, museum quality composition',
  icon: '🎯'
};

export default function EnhancedHeroPlaceholder({ 
  episode, 
  series, 
  theme,
  onImageUpload 
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate episode key for guidance lookup
  const episodeKey = episode?.title
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/^the-/, '')
    .replace(/-+/g, '-');

  const guidance = EPISODE_GUIDANCE[episodeKey] || GENERIC_GUIDANCE;

  const copyPrompt = async () => {
    const fullPrompt = `${guidance.prompt}, professional cinematography, warm golden lighting, rich contrast, --ar 2:1 --style raw`;
    
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
  };

  return (
    <div style={styles.container}>
      {/* Main Placeholder Area */}
      <div style={styles.placeholderMain}>
        <div style={styles.iconSection}>
          <div style={styles.mainIcon}>{guidance.icon}</div>
          <Camera size={18} style={styles.cameraIcon} />
        </div>
        
        <div style={styles.contentSection}>
          <h3 style={styles.episodeTitle}>{episode?.title || 'Episode'}</h3>
          <p style={styles.episodeSubtitle}>{episode?.subtitle}</p>
          
          <div style={styles.guidanceSection}>
            <div style={styles.guidanceItem}>
              <Palette size={14} style={styles.guidanceIcon} />
              <span style={styles.guidanceLabel}>Mood:</span>
              <span style={styles.guidanceText}>{guidance.mood}</span>
            </div>
            
            <div style={styles.guidanceItem}>
              <div style={styles.colorDot} />
              <span style={styles.guidanceLabel}>Colors:</span>
              <span style={styles.guidanceText}>{guidance.colors}</span>
            </div>
            
            <div style={styles.guidanceItem}>
              <Lightbulb size={14} style={styles.guidanceIcon} />
              <span style={styles.guidanceLabel}>Elements:</span>
              <span style={styles.guidanceText}>{guidance.elements}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actionSection}>
        <button 
          onClick={() => setShowPrompt(!showPrompt)}
          style={styles.promptButton}
        >
          {showPrompt ? 'Hide' : 'Show'} Midjourney Prompt
        </button>
        
        <label style={styles.uploadButton}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload}
            style={styles.hiddenInput}
          />
          Upload Image
        </label>
      </div>

      {/* Expandable Prompt Section */}
      {showPrompt && (
        <div style={styles.promptSection}>
          <div style={styles.promptHeader}>
            <span style={styles.promptTitle}>Midjourney Prompt</span>
            <button 
              onClick={copyPrompt}
              style={styles.copyButton}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          
          <div style={styles.promptText}>
            {guidance.prompt}, professional cinematography, warm golden lighting, rich contrast, --ar 2:1 --style raw
          </div>
          
          <div style={styles.promptTips}>
            <strong>Tips:</strong>
            <ul style={styles.tipsList}>
              <li>Always use --ar 2:1 for correct aspect ratio</li>
              <li>Add --style raw for more cinematic results</li>
              <li>Include "professional cinematography" for film quality</li>
              <li>Use "warm golden lighting" for sophisticated mood</li>
            </ul>
          </div>
        </div>
      )}

      {/* Technical Specs */}
      <div style={styles.specsSection}>
        <div style={styles.spec}>
          <strong>Aspect Ratio:</strong> 2:1 (1200×600px)
        </div>
        <div style={styles.spec}>
          <strong>Series:</strong> {series?.title || 'Unknown'}
        </div>
        <div style={styles.spec}>
          <strong>Theme:</strong> {theme?.title || 'Educational'}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1,
    overflow: 'auto',
  },

  // Main placeholder area
  placeholderMain: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    textAlign: 'center',
    minHeight: '200px',
  },

  iconSection: {
    position: 'relative',
    marginBottom: '16px',
  },

  mainIcon: {
    fontSize: '48px',
    marginBottom: '8px',
    opacity: 0.8,
  },

  cameraIcon: {
    position: 'absolute',
    bottom: '-5px',
    right: '-5px',
    color: '#6b7280',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    padding: '4px',
    border: '2px solid #e5e7eb',
  },

  contentSection: {
    maxWidth: '400px',
  },

  episodeTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
    margin: 0,
  },

  episodeSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: '20px',
    margin: '0 0 20px 0',
  },

  // Guidance section
  guidanceSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },

  guidanceItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    textAlign: 'left',
  },

  guidanceIcon: {
    color: '#d4af37',
    marginTop: '2px',
    flexShrink: 0,
  },

  colorDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: 'linear-gradient(45deg, #d4af37, #f3e8ab)',
    marginTop: '2px',
    flexShrink: 0,
  },

  guidanceLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    minWidth: '50px',
  },

  guidanceText: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.4',
  },

  // Action buttons
  actionSection: {
    display: 'flex',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },

  promptButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#d4af37',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  uploadButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#374151',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    display: 'block',
  },

  hiddenInput: {
    display: 'none',
  },

  // Prompt section
  promptSection: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    margin: '0 20px 16px',
    overflow: 'hidden',
  },

  promptHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },

  promptTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },

  copyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: '#d4af37',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  promptText: {
    padding: '16px',
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#374151',
    backgroundColor: '#fefdf8',
    fontFamily: 'Monaco, Consolas, monospace',
    wordBreak: 'break-word',
  },

  promptTips: {
    padding: '16px',
    fontSize: '12px',
    color: '#6b7280',
    borderTop: '1px solid #e5e7eb',
  },

  tipsList: {
    margin: '8px 0 0 0',
    paddingLeft: '16px',
  },

  // Specs section
  specsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px 20px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },

  spec: {
    fontSize: '11px',
    color: '#6b7280',
  },
};