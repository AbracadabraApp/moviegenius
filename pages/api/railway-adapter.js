// lib/railway-adapter.js - Temporary adapter for Supabase-to-Railway migration
// Provides Supabase-like interface using Railway PostgreSQL backend
// This enables gradual migration while maintaining build compatibility

import { getPool } from './railway-db.js';

// Mock Supabase createClient for build compatibility
export function createClient(url, key, options = {}) {
  console.warn('⚠️  Using Railway adapter for Supabase compatibility - migrate to Railway services');
  
  return {
    from: (tableName) => new RailwayQueryBuilder(tableName),
    auth: {
      // Mock auth for build compatibility
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    }
  };
}

// Railway-backed query builder that mimics Supabase interface
class RailwayQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.selectFields = '*';
    this.whereConditions = [];
    this.orderBy = null;
    this.limitValue = null;
  }

  select(fields = '*') {
    this.selectFields = fields;
    return this;
  }

  eq(column, value) {
    this.whereConditions.push({ column, operator: '=', value });
    return this;
  }

  neq(column, value) {
    this.whereConditions.push({ column, operator: '!=', value });
    return this;
  }

  not(column, operator, value) {
    if (operator === 'is') {
      this.whereConditions.push({ column, operator: 'IS NOT', value });
    }
    return this;
  }

  or(condition) {
    // Simple OR support for basic queries
    this.whereConditions.push({ raw: `(${condition})` });
    return this;
  }

  ilike(column, pattern) {
    this.whereConditions.push({ column, operator: 'ILIKE', value: pattern });
    return this;
  }

  order(column, options = {}) {
    const direction = options.ascending === false ? 'DESC' : 'ASC';
    this.orderBy = `${column} ${direction}`;
    return this;
  }

  limit(count) {
    this.limitValue = count;
    return this;
  }


  async insert(data) {
    try {
      const pool = getPool();
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${this.tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      return { data: result.rows, error: null };
    } catch (error) {
      console.error('Railway adapter insert error:', error);
      return { data: null, error };
    }
  }

  async upsert(data, options = {}) {
    try {
      const pool = getPool();
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      // Build conflict handling
      const onConflict = options.onConflict || 'id';
      const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
      
      const query = `
        INSERT INTO ${this.tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (${onConflict}) DO UPDATE SET ${updateSet}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      return { data: result.rows, error: null };
    } catch (error) {
      console.error('Railway adapter upsert error:', error);
      return { data: null, error };
    }
  }

  async update(data) {
    try {
      const pool = getPool();
      
      // 🚨 CRITICAL PROTECTION: Prevent mass updates without WHERE clause
      if (this.whereConditions.length === 0) {
        const error = new Error(`🚨 MASS UPDATE BLOCKED: UPDATE on ${this.tableName} attempted without WHERE clause. This would corrupt ALL records.`);
        console.error('Railway adapter MASS UPDATE blocked:', error.message);
        return { data: null, error };
      }
      
      const setClause = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
      const values = Object.values(data);
      
      let query = `UPDATE ${this.tableName} SET ${setClause}`;
      let paramIndex = values.length + 1;
      
      const whereClause = this.buildWhereClause(paramIndex);
      query += ` WHERE ${whereClause.clause}`;
      values.push(...whereClause.values);
      
      query += ' RETURNING *';
      
      console.log(`✅ Safe UPDATE with WHERE: ${this.tableName} WHERE ${whereClause.clause}`);
      
      const result = await pool.query(query, values);
      
      // Store result for chaining
      this._lastResult = { data: result.rows, error: null };
      
      return this; // Return this for method chaining
    } catch (error) {
      console.error('Railway adapter update error:', error);
      this._lastResult = { data: null, error };
      return this;
    }
  }

  // Method for chaining after update
  select(fields = '*') {
    // If called after update, return the result
    if (this._lastResult) {
      return this;
    }
    
    this.selectFields = fields;
    return this;
  }

  // Single result extraction (compatible with Supabase)
  single() {
    if (this._lastResult) {
      const result = this._lastResult;
      const data = result.data && result.data.length > 0 ? result.data[0] : null;
      const error = result.error || (!data ? { code: 'PGRST116', message: 'No rows found' } : null);
      return Promise.resolve({ data, error });
    }
    
    return this.execute().then(result => {
      if (result.error) {
        return { data: null, error: result.error };
      }
      
      const data = result.data && result.data.length > 0 ? result.data[0] : null;
      const error = !data ? { code: 'PGRST116', message: 'No rows found' } : null;
      
      return { data, error };
    });
  }

  async delete() {
    try {
      const pool = getPool();
      
      // 🚨 CRITICAL PROTECTION: Prevent mass deletions without WHERE clause
      if (this.whereConditions.length === 0) {
        const error = new Error(`🚨 MASS DELETE BLOCKED: DELETE on ${this.tableName} attempted without WHERE clause. This would delete ALL records.`);
        console.error('Railway adapter MASS DELETE blocked:', error.message);
        return { data: null, error };
      }
      
      let query = `DELETE FROM ${this.tableName}`;
      let values = [];
      
      const whereClause = this.buildWhereClause(1);
      query += ` WHERE ${whereClause.clause}`;
      values = whereClause.values;
      
      console.log(`✅ Safe DELETE with WHERE: ${this.tableName} WHERE ${whereClause.clause}`);
      
      const result = await pool.query(query, values);
      return { data: null, error: null };
    } catch (error) {
      console.error('Railway adapter delete error:', error);
      return { data: null, error };
    }
  }

  async execute() {
    try {
      const pool = getPool();
      let query = `SELECT ${this.selectFields} FROM ${this.tableName}`;
      let values = [];
      
      if (this.whereConditions.length > 0) {
        const whereClause = this.buildWhereClause(1);
        query += ` WHERE ${whereClause.clause}`;
        values = whereClause.values;
      }
      
      if (this.orderBy) {
        query += ` ORDER BY ${this.orderBy}`;
      }
      
      if (this.limitValue) {
        query += ` LIMIT ${this.limitValue}`;
      }
      
      const result = await pool.query(query, values);
      return { data: result.rows, error: null };
    } catch (error) {
      console.error('Railway adapter query error:', error);
      return { data: null, error };
    }
  }

  buildWhereClause(startIndex) {
    let clause = '';
    let values = [];
    let paramIndex = startIndex;
    
    for (let i = 0; i < this.whereConditions.length; i++) {
      const condition = this.whereConditions[i];
      
      if (i > 0) {
        clause += ' AND ';
      }
      
      if (condition.raw) {
        clause += condition.raw;
      } else {
        clause += `${condition.column} ${condition.operator} $${paramIndex}`;
        values.push(condition.value);
        paramIndex++;
      }
    }
    
    return { clause, values };
  }
}

// Export for compatibility
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'fake-key'
);

export const supabaseAdmin = supabase;