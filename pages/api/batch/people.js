/**
 * Railway Batch Processing API - People
 *
 * Endpoint for automated person discovery and analysis
 * Extracts people from movie analyses and creates person pages
 */

import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class RailwayPeopleBatchProcessor {
  constructor() {
    this.maxBatchSize = 50; // Process up to 50 people per run
  }

  async extractPeopleFromAnalyses() {
    try {
      // Get movie analyses that haven't been processed for people extraction
      const { data: analyses, error } = await supabase
        .from('movie_analyses')
        .select('id, movie_id, claude_response')
        .is('people_extracted', null)
        .limit(100);

      if (error) throw error;
      if (!analyses || analyses.length === 0) return [];

      const peopleSet = new Set();
      const peopleData = [];

      // Extract people mentions from each analysis
      for (const analysis of analyses) {
        const content = analysis.claude_response?.content || '';

        // Simple regex to find people names (this could be enhanced with NER)
        const personRegex = /\b([A-Z][a-z]+ [A-Z][a-z]+(?:'s)?)\b/g;
        let match;

        while ((match = personRegex.exec(content)) !== null) {
          const name = match[1].replace("'s", '');

          // Filter out obvious non-person matches
          if (!this.isProbablyPersonName(name)) continue;

          if (!peopleSet.has(name)) {
            peopleSet.add(name);
            peopleData.push({
              name: name,
              source_analysis_id: analysis.id,
              confidence: this.calculateNameConfidence(name, content),
            });
          }
        }

        // Mark this analysis as processed
        await supabase
          .from('movie_analyses')
          .update({ people_extracted: true })
          .eq('id', analysis.id);
      }

      return peopleData.filter(p => p.confidence > 0.7).slice(0, this.maxBatchSize);
    } catch (error) {
      console.error('Error extracting people from analyses:', error);
      throw error;
    }
  }

  isProbablyPersonName(name) {
    const excludeWords = [
      'New York',
      'Los Angeles',
      'United States',
      'World War',
      'Golden Age',
      'Great Depression',
      'Cold War',
      'Film Noir',
      'French New',
      'Italian Neo',
      'German Expressionism',
    ];

    return (
      !excludeWords.some(excluded => name.includes(excluded)) && name.length > 5 && name.length < 30
    );
  }

  calculateNameConfidence(name, content) {
    let confidence = 0.5;

    // Higher confidence if mentioned with film terms
    if (
      content.includes(`${name} directed`) ||
      content.includes(`${name}'s direction`) ||
      content.includes(`${name} stars`) ||
      content.includes(`${name}'s performance`)
    ) {
      confidence += 0.3;
    }

    // Higher confidence if mentioned multiple times
    const mentions = (content.match(new RegExp(name, 'g')) || []).length;
    confidence += Math.min(mentions * 0.1, 0.2);

    return Math.min(confidence, 0.95);
  }

  async enrichPersonWithTMDB(personData) {
    try {
      // Search TMDB for person
      const tmdbResponse = await fetch(
        `https://api.themoviedb.org/3/search/person?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(personData.name)}`
      );

      if (!tmdbResponse.ok) return personData;

      const tmdbData = await tmdbResponse.json();
      const person = tmdbData.results?.[0];

      if (person) {
        return {
          ...personData,
          tmdb_id: person.id,
          known_for_department: person.known_for_department || 'Acting',
          profile_path: person.profile_path,
          popularity: person.popularity,
        };
      }

      return personData;
    } catch (error) {
      console.error(`Error enriching person ${personData.name}:`, error);
      return personData;
    }
  }

  async createPersonRecord(personData) {
    try {
      // Check if person already exists
      const { data: existing } = await supabase
        .from('people')
        .select('id')
        .eq('name', personData.name)
        .single();

      if (existing) return existing;

      // Create new person record
      const { data: newPerson, error } = await supabase
        .from('people')
        .insert({
          name: personData.name,
          tmdb_id: personData.tmdb_id || null,
          known_for_department: personData.known_for_department || 'Acting',
          profile_url: personData.profile_path
            ? `https://image.tmdb.org/t/p/w500${personData.profile_path}`
            : null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return newPerson;
    } catch (error) {
      console.error(`Error creating person record for ${personData.name}:`, error);
      return null;
    }
  }

  async processBatch() {
    try {
      // Extract people from movie analyses
      const extractedPeople = await this.extractPeopleFromAnalyses();

      if (extractedPeople.length === 0) {
        return {
          success: true,
          message: 'No new people found in recent analyses',
          people_processed: 0,
        };
      }

      let created = 0;
      let enriched = 0;
      const results = [];

      for (const personData of extractedPeople) {
        // Enrich with TMDB data
        const enrichedPerson = await this.enrichPersonWithTMDB(personData);
        if (enrichedPerson.tmdb_id) enriched++;

        // Create person record
        const person = await this.createPersonRecord(enrichedPerson);
        if (person) {
          created++;
          results.push({
            name: person.name,
            tmdb_id: person.tmdb_id,
            confidence: personData.confidence,
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return {
        success: true,
        people_processed: extractedPeople.length,
        people_created: created,
        tmdb_enriched: enriched,
        results: results,
        message: `Discovered and created ${created} new people`,
      };
    } catch (error) {
      console.error('People batch processing failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Railway cron job auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.RAILWAY_BATCH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const processor = new RailwayPeopleBatchProcessor();
    const result = await processor.processBatch();

    // Log the result
    console.log('People batch processing result:', result);

    return res.status(200).json(result);
  } catch (error) {
    console.error('People batch processing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
