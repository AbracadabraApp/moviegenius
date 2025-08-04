#!/usr/bin/env node

/**
 * Generate Visual Guidance Report
 * 
 * Creates a comprehensive report showing visual guidance for all episodes,
 * organized by themes and series. Perfect for understanding what images
 * are needed and getting inspiration for Midjourney prompts.
 * 
 * Usage: node scripts/generate-guidance-report.js
 */

const fs = require('fs').promises;
const path = require('path');

// Import guidance data (we'll read it as JSON)
async function loadGuidanceData() {
  try {
    const guidanceContent = await fs.readFile(
      path.join(__dirname, '../components/HeroImageGuidance.js'),
      'utf-8'
    );
    
    // Extract the HERO_IMAGE_GUIDANCE object (simplified approach)
    const match = guidanceContent.match(/export const HERO_IMAGE_GUIDANCE = ({[\s\S]*?});/);
    if (match) {
      // This is a simplified extraction - in practice you might want to use a proper parser
      return eval(`(${match[1]})`);
    }
    
    return null;
  } catch (error) {
    console.error('Error loading guidance data:', error.message);
    return null;
  }
}

async function loadEpisodeData() {
  try {
    const episodesDir = path.join(__dirname, '../data/episodes');
    const files = await fs.readdir(episodesDir);
    const episodes = [];

    for (const file of files) {
      if (file.startsWith('genius-') && file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(episodesDir, file), 'utf-8');
          const episode = JSON.parse(content);
          episodes.push({
            filename: file,
            ...episode
          });
        } catch (error) {
          console.error(`Error loading ${file}:`, error.message);
        }
      }
    }

    return episodes;
  } catch (error) {
    console.error('Error loading episode data:', error.message);
    return [];
  }
}

async function generateReport() {
  console.log('🎨 Generating Visual Guidance Report...\n');

  const episodes = await loadEpisodeData();
  
  if (episodes.length === 0) {
    console.log('No episodes found.');
    return;
  }

  // Group episodes by theme and series
  const grouped = {};
  episodes.forEach(ep => {
    const themeTitle = ep.theme?.title || 'Unknown Theme';
    const seriesTitle = ep.series?.title || 'Unknown Series';
    
    if (!grouped[themeTitle]) {
      grouped[themeTitle] = {};
    }
    if (!grouped[themeTitle][seriesTitle]) {
      grouped[themeTitle][seriesTitle] = [];
    }
    
    grouped[themeTitle][seriesTitle].push(ep);
  });

  // Generate markdown report
  let report = '# Hero Image Visual Guidance Report\n\n';
  report += `Generated on ${new Date().toLocaleDateString()}\n\n`;
  report += `Total Episodes: ${episodes.length}\n\n`;
  
  // Table of contents
  report += '## Table of Contents\n\n';
  Object.keys(grouped).forEach(theme => {
    report += `- [${theme}](#${theme.toLowerCase().replace(/[^a-z0-9]/g, '-')})\n`;
    Object.keys(grouped[theme]).forEach(series => {
      report += `  - [${series}](#${series.toLowerCase().replace(/[^a-z0-9]/g, '-')})\n`;
    });
  });
  report += '\n---\n\n';

  // Generate detailed guidance for each theme/series
  Object.entries(grouped).forEach(([theme, series]) => {
    report += `## ${theme}\n\n`;
    
    Object.entries(series).forEach(([seriesName, seriesEpisodes]) => {
      report += `### ${seriesName}\n\n`;
      
      seriesEpisodes.forEach(episode => {
        const hasImage = episode.heroImage && !episode.heroImage.includes('placeholder');
        const status = hasImage ? '✅' : '❌';
        
        report += `#### ${status} ${episode.episode?.title || 'Untitled'}\n\n`;
        report += `**Subtitle:** ${episode.episode?.subtitle || 'No subtitle'}\n\n`;
        
        if (episode.heroImage) {
          report += `**Current Image Path:** \`${episode.heroImage}\`\n\n`;
        }
        
        // Generate visual guidance based on episode content
        const guidance = generateEpisodeGuidance(episode);
        
        report += '**Visual Guidance:**\n\n';
        report += `- **Mood:** ${guidance.mood}\n`;
        report += `- **Colors:** ${guidance.colors}\n`;
        report += `- **Key Elements:** ${guidance.elements}\n`;
        report += `- **Style:** ${guidance.style}\n\n`;
        
        report += '**Suggested Midjourney Prompt:**\n\n';
        report += '```\n';
        report += guidance.prompt;
        report += '\n```\n\n';
        
        report += `**File:** \`${episode.filename}\`\n\n`;
        report += '---\n\n';
      });
    });
  });

  // Summary statistics
  const withImages = episodes.filter(ep => ep.heroImage && !ep.heroImage.includes('placeholder')).length;
  const needImages = episodes.length - withImages;
  
  report += '## Summary Statistics\n\n';
  report += `- **Total Episodes:** ${episodes.length}\n`;
  report += `- **With Hero Images:** ${withImages} (${Math.round(withImages/episodes.length*100)}%)\n`;
  report += `- **Need Images:** ${needImages} (${Math.round(needImages/episodes.length*100)}%)\n\n`;
  
  // Episodes needing images
  if (needImages > 0) {
    report += '## Episodes Needing Images\n\n';
    episodes
      .filter(ep => !ep.heroImage || ep.heroImage.includes('placeholder'))
      .forEach(ep => {
        report += `- **${ep.episode?.title}** (${ep.series?.title}) - \`${ep.filename}\`\n`;
      });
    report += '\n';
  }

  // Save report
  const reportPath = path.join(__dirname, 'hero-images-guidance-report.md');
  await fs.writeFile(reportPath, report, 'utf-8');
  
  console.log(`✅ Report generated: ${reportPath}`);
  console.log(`📊 Statistics: ${withImages} complete, ${needImages} needed`);
}

function generateEpisodeGuidance(episode) {
  const title = episode.episode?.title || '';
  const subtitle = episode.episode?.subtitle || '';
  const seriesTitle = episode.series?.title || '';
  const themeTitle = episode.theme?.title || '';
  
  // Basic guidance based on theme and content
  let guidance = {
    mood: 'Sophisticated cinematic atmosphere',
    colors: 'Warm cinematic tones, professional color grading',
    elements: 'Educational film content, sophisticated presentation',
    style: 'Professional cinematography, editorial photography style',
    prompt: `Sophisticated cinematic atmosphere, ${subtitle.toLowerCase()}, warm golden lighting, rich contrast, film study aesthetic, --ar 2:1 --style raw`
  };

  // Check for specific comedy types first
  if (title.toLowerCase().includes('screwball') || subtitle.toLowerCase().includes('rapid-fire wit')) {
    guidance = {
      mood: 'Screwball comedy energy, romantic sparring',
      colors: 'Classic Hollywood glamour lighting, high contrast',
      elements: 'Art deco sets, elegant costumes, verbal dueling',
      style: '1930s-40s studio system cinematography',
      prompt: `Screwball comedy atmosphere, His Girl Friday newsroom chaos, Bringing Up Baby leopard mayhem, It Happened One Night road trip, elegant 1930s costumes, art deco hotel lobbies, rapid dialogue exchanges, classic Hollywood glamour, --ar 2:1 --style raw`
    };
  }
  else if (title.toLowerCase().includes('british comedy') || subtitle.toLowerCase().includes('dry wit')) {
    guidance = {
      mood: 'British dry humor, understated wit',
      colors: 'Muted British palette, overcast lighting',
      elements: 'English countryside, tea culture, class comedy',
      style: 'British cinema realism, social satire',
      prompt: `British comedy atmosphere, Monty Python absurdist sketches, Ealing Studios postwar humor, Kind Hearts and Coronets murder comedy, British countryside manor houses, tea service etiquette, dry understated wit, social class satire, --ar 2:1 --style raw`
    };
  }
  else if (title.toLowerCase().includes('saturday night live') || subtitle.toLowerCase().includes('tv comedy')) {
    guidance = {
      mood: 'SNL sketch energy, TV to film transition',
      colors: 'NBC studio lighting, bright comedy staging',
      elements: 'Television studio, sketch comedy sets, star vehicles',
      style: 'TV comedy cinematography, ensemble cast',
      prompt: `SNL comedy atmosphere, Wayne's World basement hangout, Blues Brothers musical numbers, Ghostbusters supernatural comedy, MacGruber action parody, TV sketch comedy energy, studio audience setup, ensemble cast dynamics, --ar 2:1 --style raw`
    };
  }
  else if (title.toLowerCase().includes('apatow') || subtitle.toLowerCase().includes('bromance')) {
    guidance = {
      mood: 'Bromance comedy warmth, improvised dialogue',
      colors: 'Natural lighting, handheld intimacy',
      elements: 'Male friendship, coming-of-age humor, real locations',
      style: 'Naturalistic comedy, documentary-style intimacy',
      prompt: `Apatow comedy atmosphere, Superbad teenage friendship, Knocked Up relationship humor, 40-Year-Old Virgin awkwardness, Pineapple Express stoner buddy comedy, improvised dialogue scenes, naturalistic lighting, bromance dynamics, --ar 2:1 --style raw`
    };
  }
  // Check for psychological thrillers
  else if (title.toLowerCase().includes('psychological') || subtitle.toLowerCase().includes('mind games')) {
    guidance = {
      mood: 'Horror atmosphere, suspenseful tension',
      colors: 'Dark moody lighting, selective color highlights',
      elements: 'Horror film aesthetics, dramatic shadows, tension',
      style: 'Genre cinema, atmospheric lighting',
      prompt: `Horror cinema, mind bending imagery, fractured mirrors, distorted reality, person questioning sanity, psychological manipulation setup, dramatic atmospheric lighting, genre filmmaking mastery, cinematic terror, --ar 2:1 --style raw`
    };
  }
  // Customize based on theme and content - with specific visual details
  else if (themeTitle.toLowerCase().includes('noir') || title.toLowerCase().includes('noir')) {
    let specificElements = 'shadowy urban streets, rain-slicked pavement, neon signs';
    
    if (title.toLowerCase().includes('femme fatale')) {
      specificElements = 'Double Indemnity Barbara Stanwyck anklet, Maltese Falcon Mary Astor deception, Sunset Boulevard Gloria Swanson madness, cigarette smoke curling, red lipstick danger, venetian blind shadows';
    } else if (title.toLowerCase().includes('german expressionism')) {
      specificElements = 'Cabinet of Dr Caligari twisted sets, Nosferatu shadow climbing stairs, Metropolis geometric architecture, angular shadows on walls, distorted perspectives, German silent film aesthetic';
    } else if (title.toLowerCase().includes('urban anxiety')) {
      specificElements = 'The Naked City street photography, Kiss Me Deadly urban paranoia, crowded city streets at night, anonymous figures in coats, oppressive skyscrapers, neon signs reflecting on wet pavement';
    } else if (title.toLowerCase().includes('moral ambiguity')) {
      specificElements = 'The Third Man sewer chase, Touch of Evil corrupt cop, Out of the Past flashback structure, split lighting revealing character duality, mirrors reflecting guilt, hands reaching for gun in shadows';
    }
    
    guidance = {
      mood: 'Dramatic shadows, high contrast, noir atmosphere',
      colors: 'Black and white with selective color, dramatic chiaroscuro lighting',
      elements: 'Film noir aesthetics, urban nighttime, venetian blind shadows',
      style: 'Classic film noir cinematography, dramatic lighting',
      prompt: `Film noir cinematography, ${specificElements}, dramatic chiaroscuro lighting, high contrast black and white, 1940s atmosphere, vintage movie poster aesthetic, --ar 2:1 --style raw`
    };
  } else if (title.toLowerCase().includes('german expressionism')) {
    guidance = {
      mood: 'Stark geometric shadows, angular compositions',
      colors: 'High contrast black and white, dramatic silhouettes',
      elements: 'German expressionist film sets, distorted perspectives, angular shadows',
      style: 'Silent era cinematography, theatrical lighting',
      prompt: `German expressionist cinema, stark geometric shadows, angular architectural elements, high contrast black and white, distorted perspectives, silent film aesthetic, 1920s film studio, --ar 2:1 --style raw`
    };
  } else if (title.toLowerCase().includes('silent') || title.toLowerCase().includes('chaplin') || title.toLowerCase().includes('keaton')) {
    let specificElements = 'vintage movie studio with klieg lights, hand-cranked camera, film reels scattered';
    
    if (title.toLowerCase().includes('chaplin') || title.toLowerCase().includes('comedy')) {
      specificElements = 'Chaplin Tramp costume with bowler hat and cane, Modern Times factory gears, City Lights flower girl scene, Gold Rush bread rolls dance, silent film title cards';
    } else if (title.toLowerCase().includes('keaton')) {
      specificElements = 'Buster Keaton stone face expression, Steamboat Bill Jr house falling scene, The General locomotive chase, elaborate physical gags, geometric visual comedy';
    }
    
    guidance = {
      mood: 'Silent era charm, physical comedy elements',
      colors: 'Sepia tones, vintage film stock grain',
      elements: 'Silent film sets, vintage cameras, comedy props',
      style: 'Early cinema aesthetics, film grain texture',
      prompt: `Silent era cinema, ${specificElements}, vintage film stock grain, sepia tones, 1920s movie studio, art deco design elements, --ar 2:1 --style raw`
    };
  } else if (themeTitle.toLowerCase().includes('director') || seriesTitle.toLowerCase().includes('auteur') || title.toLowerCase().includes('kurosawa') || title.toLowerCase().includes('bergman') || title.toLowerCase().includes('fellini')) {
    let specificElements = 'film director behind large camera, movie set with crew, vintage cinematography equipment';
    
    if (title.toLowerCase().includes('kurosawa')) {
      specificElements = 'Seven Samurai battle formation, Yojimbo lone warrior, Rashomon temple ruins, dramatic windswept landscapes, samurai swords clashing, rain sequences, telephoto lens cinematography';
    } else if (title.toLowerCase().includes('bergman')) {
      specificElements = 'Persona closeup faces merging, Seventh Seal chess with Death, Wild Strawberries dream sequence, Cries and Whispers red interior, Swedish archipelago, existential anguish, stark black and white';
    } else if (title.toLowerCase().includes('fellini')) {
      specificElements = '8½ director surrounded by characters, La Dolce Vita Trevi Fountain scene, circus performers and grotesques, Rome nightlife, Anita Ekberg iconic imagery, surreal carnival atmosphere';
    } else if (title.toLowerCase().includes('hitchcock')) {
      specificElements = 'Vertigo spiral staircase, Psycho shower scene setup, North by Northwest crop duster, Rear Window courtyard voyeurism, blonde actress in peril, precise camera movements';
    } else if (title.toLowerCase().includes('women') || title.toLowerCase().includes('female')) {
      specificElements = 'Kathryn Bigelow action sequences, Jane Campion gothic landscapes, Chloé Zhao natural lighting, Greta Gerwig intimate direction, pioneering women breaking barriers';
    }
    
    guidance = {
      mood: 'Artistic vision, directorial sophistication',
      colors: 'Warm auteur cinema tones, artistic color grading',
      elements: 'Film production, director equipment, artistic composition',
      style: 'Auteur cinema aesthetic, sophisticated film production',
      prompt: `Auteur cinema, ${specificElements}, artistic film production, cinematic mastery, director's creative vision, --ar 2:1 --style raw`
    };
  } else if (themeTitle.toLowerCase().includes('technical') || title.toLowerCase().includes('digital') || title.toLowerCase().includes('technicolor') || title.toLowerCase().includes('cgi')) {
    guidance = {
      mood: 'Technological innovation, behind-the-scenes magic',
      colors: 'Blue digital glow, warm practical lighting contrast',
      elements: 'Film technology, special effects, innovation showcase',
      style: 'Technical demonstration, equipment focus',
      prompt: `Film technology innovation, digital effects creation, movie studio equipment, technological transformation, special effects behind the scenes, modern cinematography tools, --ar 2:1 --style raw`
    };
  } else if (title.includes('1970s')) {
    guidance = {
      mood: '1970s atmosphere, period-accurate aesthetic',
      colors: '1970s color palette, era-appropriate tones',
      elements: '1970s film production, period equipment, cultural markers',
      style: '1970s cinematography style, historical accuracy',
      prompt: `1970s cinema atmosphere, vintage film equipment, retro movie theater, period-accurate aesthetic, 1970s film production, warm vintage tones, film grain texture, --ar 2:1 --style raw`
    };
  } else if (title.includes('1990s') || title.toLowerCase().includes('independent')) {
    guidance = {
      mood: '1990s atmosphere, independent film aesthetic',
      colors: '1990s color palette, indie film tones',
      elements: '1990s film production, independent cinema markers',
      style: '1990s cinematography style, indie film aesthetic',
      prompt: `1990s independent cinema, indie film aesthetic, vintage video store, 16mm film equipment, underground film culture, grunge era cinematography, --ar 2:1 --style raw`
    };
  } else if (title.toLowerCase().includes('french new wave') || title.toLowerCase().includes('godard') || title.toLowerCase().includes('truffaut')) {
    guidance = {
      mood: 'French New Wave spontaneity and innovation',
      colors: 'French cinema color palette, natural lighting',
      elements: 'Paris streets, handheld camera aesthetic, café culture',
      style: 'New Wave cinematography, jump cuts, natural lighting',
      prompt: `French New Wave cinema, Paris street cinematography, handheld camera aesthetic, 1960s French film culture, café scenes, natural lighting, nouvelle vague style, --ar 2:1 --style raw`
    };
  } else if (title.toLowerCase().includes('horror') || title.toLowerCase().includes('giallo') || title.toLowerCase().includes('cronenberg')) {
    let specificElements = 'dark movie theater, horror film projecting, eerie shadows, suspenseful atmosphere';
    
    if (title.toLowerCase().includes('giallo')) {
      specificElements = 'Suspiria red lighting, Argento knife glinting, black leather gloves, 1970s Italian fashion model, neon-lit Rome streets, Bird with Crystal Plumage aesthetic, stylized murder scene';
    } else if (title.toLowerCase().includes('cronenberg')) {
      specificElements = 'Videodrome flesh television, The Fly transformation makeup, medical laboratory horror, Scanners head explosion, body horror prosthetics, 1980s practical effects';
    } else if (title.toLowerCase().includes('psychological')) {
      specificElements = 'Get Out sunken place, Shutter Island lighthouse, Black Swan mirror transformation, Hereditary dollhouse miniatures, The Babadook pop-up book, fractured identity concept';
    } else if (title.toLowerCase().includes('a24')) {
      specificElements = 'Midsommar daylight horror, Hereditary family trauma, The Witch period costume, Lighthouse isolated madness, Moonlight intimate cinematography, artistic indie horror aesthetic';
    }
    
    guidance = {
      mood: 'Horror atmosphere, suspenseful tension',
      colors: 'Dark moody lighting, selective color highlights',
      elements: 'Horror film aesthetics, dramatic shadows, tension',
      style: 'Genre cinema, atmospheric lighting',
      prompt: `Horror cinema atmosphere, ${specificElements}, dramatic chiaroscuro lighting, practical effects showcase, psychological terror, --ar 2:1 --style raw`
    };
  } else if (title.toLowerCase().includes('hitchcock')) {
    guidance = {
      mood: 'Suspenseful precision, psychological tension',
      colors: 'Classic Hollywood lighting, dramatic contrasts',
      elements: 'Hitchcockian visual motifs, precise framing',
      style: 'Master of suspense cinematography',
      prompt: `Hitchcockian suspense cinema, precise camera angles, classic Hollywood studio lighting, psychological thriller aesthetic, master filmmaker at work, --ar 2:1 --style raw`
    };
  }

  return guidance;
}

// Run the script
if (require.main === module) {
  generateReport().catch(console.error);
}

module.exports = { generateReport, generateEpisodeGuidance };