export default function handler(req, res) {
  const envDebug = {
    NODE_ENV: process.env.NODE_ENV,
    ANTHROPIC_API_KEY_EXISTS: !!process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_API_KEY_LENGTH: process.env.ANTHROPIC_API_KEY?.length || 0,
    ANTHROPIC_API_KEY_PREFIX: process.env.ANTHROPIC_API_KEY?.substring(0, 15) || 'MISSING',
    ENV_KEYS_WITH_ANTHROPIC: Object.keys(process.env).filter(k => k.includes('ANTHROPIC')),
    ALL_ENV_KEYS_COUNT: Object.keys(process.env).length,
    PWD: process.env.PWD,
    CWD: process.cwd()
  };
  
  res.status(200).json(envDebug);
}