#!/usr/bin/env node
/**
 * Transform Existing Analyses to Nuclear Format
 * 
 * Converts entity extraction analyses to nuclear format with:
 * - sections (text content broken into readable chunks)
 * - exploreFurther (topic prompts for exploration)
 * - moreIdeas (related movies)
 * 
 * Cost: $0 (transformation only, no new Claude calls)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');
const { Anthropic } = require('@anthropic-ai/sdk');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

class AnalysisTransformer {
  constructor() {
    this.batchSize = 25;
    this.processedCount = 0;
    this.transformedCount = 0;
    this.errorCount = 0;
  }

  /**
   * Transform existing analysis raw_content into nuclear format
   */
  async transformAnalysis(rawContent, movieTitle, movieYear) {
    // Create nuclear format from raw content
    const sections = this.createSections(rawContent);
    const exploreFurther = this.generateExploreFurther(rawContent, movieTitle);
    const moreIdeas = this.generateMoreIdeas(rawContent, movieTitle, movieYear);

    return {
      sections,
      exploreFurther,
      moreIdeas,
      transformedAt: new Date().toISOString(),
      source: 'entity_analysis_transformation'
    };
  }

  /**
   * Break raw content into readable sections
   */
  createSections(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') {
      return [];
    }

    // Split content into paragraphs and create text sections
    const paragraphs = rawContent
      .split(/\n\s*\n/)
      .map(p => p.replace(/^PARAGRAPH:\s*/, '').trim())
      .filter(p => p.length > 50); // Only substantial paragraphs

    const sections = [];

    // Create text sections from paragraphs
    paragraphs.forEach((paragraph, index) => {
      if (paragraph.length > 100) {
        sections.push({
          type: 'text',
          content: paragraph
        });
      }
    });

    // If no good paragraphs, create one section from entire content
    if (sections.length === 0 && rawContent.length > 100) {
      sections.push({
        type: 'text',
        content: rawContent.replace(/^PARAGRAPH:\s*/, '').trim()
      });
    }

    return sections;
  }

  /**
   * Generate explore further topics from content analysis
   */
  generateExploreFurther(rawContent, movieTitle) {
    if (!rawContent) return [];

    const topics = [];
    const content = rawContent.toLowerCase();

    // Generate exploration topics based on content keywords
    if (content.includes('director') || content.includes('directed')) {
      topics.push(`${movieTitle} director's filmography and style`);
    }
    
    if (content.includes('cinematography') || content.includes('visual')) {
      topics.push(`Visual techniques and cinematography in ${movieTitle}`);
    }
    
    if (content.includes('score') || content.includes('music') || content.includes('soundtrack')) {
      topics.push(`${movieTitle} soundtrack and musical themes`);
    }
    
    if (content.includes('influence') || content.includes('impact')) {
      topics.push(`${movieTitle}'s cultural impact and legacy`);
    }
    
    if (content.includes('performance') || content.includes('acting')) {
      topics.push(`Key performances and acting in ${movieTitle}`);
    }

    // Default topics if no specific ones found
    if (topics.length === 0) {
      topics.push(
        `Behind the scenes of ${movieTitle}`,
        `${movieTitle} cultural significance`
      );
    }

    return topics.slice(0, 4); // Limit to 4 topics
  }

  /**
   * Generate more ideas section (related movies)
   */
  generateMoreIdeas(rawContent, movieTitle, movieYear) {
    // For now, return empty - this would require actual movie recommendations
    // In a real implementation, we could use the content to suggest related films
    return {
      title: "Related Films",
      movies: [] // Would be populated with actual movie recommendations
    };
  }

  /**
   * Get analyses that need transformation
   */
  async getAnalysesToTransform(limit = 6000) {
    console.log(`🔍 Finding analyses to transform (limit: ${limit})...`);
    
    const { data: analyses, error } = await supabase
      .from('movie_analyses')
      .select(`
        id, movie_id, claude_response,
        movies!inner(title, year, tmdb_id)
      `)
      .eq('analysis_type', 'page_analysis')
      .not('movies.tmdb_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch analyses: ${error.message}`);
    }

    // Filter to only those that need transformation
    const needsTransformation = analyses?.filter(analysis => {
      const response = analysis.claude_response;
      
      // Check if already in nuclear format
      if (response.sections || response.exploreFurther || response.moreIdeas) {
        return false;
      }
      
      // Check if has raw content to transform
      if (!response.raw_content || typeof response.raw_content !== 'string') {
        return false;
      }
      
      return true;
    }) || [];

    console.log(`✅ Found ${needsTransformation.length} analyses ready for transformation`);
    return needsTransformation;
  }

  /**
   * Update analysis with nuclear format
   */
  async updateAnalysisFormat(analysisId, nuclearData) {
    try {
      const { error } = await supabase
        .from('movie_analyses')
        .update({
          claude_response: nuclearData
        })
        .eq('id', analysisId);

      if (error) {
        throw new Error(`Update failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to update analysis ${analysisId}:`, error.message);
      return false;
    }
  }

  /**
   * Process a batch of analyses
   */
  async processBatch(analyses) {
    console.log(`\n🔄 Processing batch of ${analyses.length} analyses...`);
    
    for (const analysis of analyses) {
      try {
        this.processedCount++;
        const movie = analysis.movies;
        const currentResponse = analysis.claude_response;
        
        console.log(`[${this.processedCount}] ${movie.title} (${movie.year})`);
        
        // Transform to nuclear format
        const nuclearFormat = await this.transformAnalysis(
          currentResponse.raw_content,
          movie.title,
          movie.year
        );
        
        // Merge with existing data to preserve metadata
        const updatedResponse = {
          ...currentResponse,
          ...nuclearFormat,
          transformation_completed: true
        };
        
        // Update in database
        const success = await this.updateAnalysisFormat(analysis.id, updatedResponse);
        
        if (success) {
          console.log(`   ✅ Transformed to nuclear format`);
          this.transformedCount++;
        } else {
          console.log(`   ❌ Failed to save transformation`);
          this.errorCount++;
        }
        
      } catch (error) {
        console.error(`   💥 Error transforming analysis:`, error.message);
        this.errorCount++;
      }
    }
  }

  /**
   * Main transformation process
   */
  async transformAnalyses(maxCount = 6000) {
    console.log('🚀 Starting analysis transformation to nuclear format...\n');
    
    try {
      // Get analyses to transform
      const analyses = await this.getAnalysesToTransform(maxCount);
      
      if (analyses.length === 0) {
        console.log('✅ No analyses need transformation - all ready!');
        return {
          success: true,
          processed: 0,
          transformed: 0,
          errors: 0,
          message: 'All analyses already in nuclear format'
        };
      }
      
      // Process in batches
      const batches = [];
      for (let i = 0; i < analyses.length; i += this.batchSize) {
        batches.push(analyses.slice(i, i + this.batchSize));
      }
      
      console.log(`📊 Processing ${analyses.length} analyses in ${batches.length} batches...\n`);
      
      for (let i = 0; i < batches.length; i++) {
        console.log(`\n📦 BATCH ${i + 1}/${batches.length}`);
        await this.processBatch(batches[i]);
        
        // Small delay between batches
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('\n📊 TRANSFORMATION COMPLETE:');
      console.log(`   🔄 Processed: ${this.processedCount}`);
      console.log(`   ✅ Transformed: ${this.transformedCount}`);
      console.log(`   ❌ Errors: ${this.errorCount}`);
      console.log(`   📈 Success rate: ${((this.transformedCount / this.processedCount) * 100).toFixed(1)}%`);
      console.log(`   💰 Cost: $0.00 (transformation only)`);
      
      return {
        success: true,
        processed: this.processedCount,
        transformed: this.transformedCount,
        errors: this.errorCount,
        success_rate: ((this.transformedCount / this.processedCount) * 100).toFixed(1),
        cost: 0
      };
      
    } catch (error) {
      console.error('❌ Transformation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run if called directly
if (require.main === module) {
  const transformer = new AnalysisTransformer();
  transformer.transformAnalyses(6000)
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Analysis transformation completed successfully!');
        console.log(`💎 ${result.transformed} analyses now in nuclear format`);
      } else {
        console.error('\n💥 Transformation failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Transformation error:', error);
      process.exit(1);
    });
}

module.exports = { AnalysisTransformer };