# Railway Environment Variables Checklist

## Required for Build & Runtime

✅ **Check these are set in Railway dashboard:**

```bash
# Core API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...
NEXT_PUBLIC_TMDB_API_KEY=82e53d2dd...
TMDB_API_KEY=82e53d2dd...

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tjvaplqqibvlmazdvcwx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiI...

# Optional
RAPIDAPI_KEY=afdbdc6405msh...
```

## Build-time Variables

Your `nixpacks.toml` provides fallbacks, but Railway should have real values.

## Quick Verification

Before each deployment, verify in Railway dashboard:

1. All environment variables are set
2. No placeholder values remain
3. Keys haven't expired

## Common Failure Points

- Missing ANTHROPIC_API_KEY → Claude API calls fail
- Missing SUPABASE keys → Database connection fails
- Missing TMDB keys → Movie data fetching fails
