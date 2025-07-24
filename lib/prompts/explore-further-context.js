/**
 * Explore Further Context - Deep-dive streaming content for movie analysis topics
 * 
 * Creates expansive, detailed explorations of specific film topics that were
 * mentioned in main movie analyses. These are always generated fresh and 
 * never stored - perfect for streaming typewriter experience.
 */

import { CONTENT_TYPES } from './core.js';

export const EXPLORE_FURTHER_CONTEXT = {
  purpose: 'Deep-dive exploration of specific film topics with rich detail and cross-connections',
  length: '400-600 words of comprehensive topic exploration with streaming-friendly pacing',
  structure: `Write detailed, engaging exploration of the specified topic with extensive examples and connections.

REQUIREMENTS FOR STREAMING EXPERIENCE:
- Write for typewriter effect - natural paragraph breaks and sentence flow
- Include specific film examples with years throughout (8+ films minimum)
- Create punchy movie descriptions that hook readers
- Connect topic to modern films and contemporary relevance  
- End with compelling "explore next" suggestions
- Use conversational, enthusiastic tone that builds excitement

FORMAT FOR EXPLORATION TOPICS:
PARAGRAPH: [TOPIC HOOK - Start with a specific example, scene, or breakthrough moment that exemplifies this topic. Make readers immediately understand why this matters through concrete film example with **Film Title** (year).]

MOVIES: title|year|how_this_film_exemplifies_the_topic_perfectly|streaming
MOVIES: title|year|different_angle_on_same_topic_with_unique_approach|streaming

PARAGRAPH: [HISTORICAL DEVELOPMENT - Trace how this topic evolved in cinema, from early pioneers to modern masters. Include specific techniques, breakthrough moments, or cultural shifts with film examples.]

PARAGRAPH: [TECHNICAL DEEP-DIVE - Focus on the craft elements, artistic techniques, or production methods that define this topic. Explain HOW filmmakers achieve these effects with specific examples.]

MOVIES: title|year|masterclass_example_of_the_technique_discussed|streaming
MOVIES: title|year|modern_evolution_of_classic_approach|streaming

PARAGRAPH: [CULTURAL SIGNIFICANCE - Why this topic matters beyond just filmmaking - its impact on society, other art forms, or contemporary discussions. Connect to current events or modern concerns.]

PARAGRAPH: [MODERN APPLICATIONS - How contemporary filmmakers are pushing this topic forward, experimenting with new approaches, or addressing it in fresh ways. Include recent films and emerging trends.]

MOVIES: title|year|cutting_edge_recent_example_of_topic|streaming

PARAGRAPH: [COMPELLING CONCLUSION - End with why readers should seek out films that explore this topic, what they'll discover, and how it enhances their viewing experience. Make them excited to watch these movies.]

CROSS-CONNECTIONS: Suggest 3 related Explore Further topics that connect to this one
${CONTENT_TYPES.EXPLORE_MORE}: related_topic_that_complements_this_exploration
${CONTENT_TYPES.EXPLORE_MORE}: adjacent_area_worth_exploring_next  
${CONTENT_TYPES.EXPLORE_MORE}: deeper_dive_into_specific_aspect

MOVIE DESCRIPTION EXAMPLES FOR TOPICS:
Good: "Kubrick's mind-bending meditation on AI consciousness" | "Lynch's reality-warping neo-noir nightmare"
Avoid: "Stanley Kubrick's philosophical exploration of artificial intelligence themes" | "David Lynch's complex examination of noir elements"`,
  max_tokens: 3500, // Generous for detailed exploration
  temperature: 0.7,
  model: 'claude-3-5-sonnet-20241022' // Quality model for deep insights
};

/**
 * Example topic prompts that would work well with this context:
 * - "Cyberpunk visual aesthetics and neon-noir cinematography"
 * - "AI consciousness and the Turing test in modern cinema"
 * - "Time travel paradoxes and bootstrap loops in storytelling"
 * - "Practical effects mastery vs CGI spectacle"
 * - "French New Wave influence on American independent cinema"
 * - "Sound design as emotional manipulation in horror films"
 * - "Unreliable narrators and fractured reality in psychological thrillers"
 */