import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
  DEEPSEEK_PLATFORM_TOKEN: process.env.DEEPSEEK_PLATFORM_TOKEN || '',
  COPILOT_API_KEY: process.env.COPILOT_API_KEY || '',
  COPILOT_SESSION_COOKIE: process.env.COPILOT_SESSION_COOKIE || '',
  TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
  TAVILY_SESSION_COOKIE: process.env.TAVILY_SESSION_COOKIE || '',
  CODEX_API_KEY: process.env.CODEX_API_KEY || '',
  CODEX_SESSION_TOKEN: process.env.CODEX_SESSION_TOKEN || '',
  CODEX_ORG_ID: process.env.CODEX_ORG_ID || '',
  CLAUDE_ORG_ID: process.env.CLAUDE_ORG_ID || '',
  CLAUDE_SESSION_COOKIE: process.env.CLAUDE_SESSION_COOKIE || '',
  CLAUDE_PLATFORM_ORG_ID: process.env.CLAUDE_PLATFORM_ORG_ID || '',
  CLAUDE_PLATFORM_SESSION_COOKIE: process.env.CLAUDE_PLATFORM_SESSION_COOKIE || ''
};
