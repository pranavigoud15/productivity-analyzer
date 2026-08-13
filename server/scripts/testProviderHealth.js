/**
 * Live provider health check — never prints secret values.
 * Run: node scripts/testProviderHealth.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { callGemini } = require('../ai/geminiProvider');
const { callGroq } = require('../ai/groqProvider');

const REQUIRED_ENV = ['GEMINI_API_KEY', 'GROQ_API_KEY'];

function envPresent(name) {
  return Boolean(String(process.env[name] || '').trim());
}

function sanitizeError(err) {
  let message = String(err?.message || err || 'Unknown error');
  message = message.replace(/AIza[A-Za-z0-9_-]+/g, '[REDACTED]');
  message = message.replace(/AQ\.[A-Za-z0-9_-]+/g, '[REDACTED]');
  message = message.replace(/gsk_[A-Za-z0-9]+/g, '[REDACTED]');
  message = message.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
  message = message.replace(/mongodb(\+srv)?:\/\/\S+/gi, 'mongodb://[REDACTED]');
  message = message.replace(/key[=:]\s*\S+/gi, 'key=[REDACTED]');
  if (message.startsWith('{') || message.startsWith('[')) {
    try {
      const parsed = JSON.parse(message);
      const code = parsed?.error?.code || parsed?.code;
      const msg = parsed?.error?.message || parsed?.message;
      message = [code ? `code=${code}` : null, msg ? String(msg).slice(0, 180) : null].filter(Boolean).join(' — ');
    } catch {
      message = message.slice(0, 180);
    }
  }
  return message.slice(0, 240);
}

async function testGemini() {
  if (!envPresent('GEMINI_API_KEY')) {
    return { status: 'FAIL', model: process.env.GEMINI_MODEL || 'gemini-3.5-flash', error: 'GEMINI_API_KEY missing' };
  }

  try {
    const result = await callGemini({
      systemPrompt: 'Respond with JSON only.',
      userMessage: 'Reply with JSON: {"reply":"ok","suggestions":[]}',
      timeoutMs: 20000,
    });
    return {
      status: result?.success === false ? 'FAIL' : 'PASS',
      model: result?.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      error: result?.success === false ? sanitizeError(new Error(result.reply || 'Gemini returned success=false')) : '',
    };
  } catch (err) {
    return {
      status: 'FAIL',
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      error: sanitizeError(err),
    };
  }
}

async function testGroq() {
  if (!envPresent('GROQ_API_KEY')) {
    return { status: 'FAIL', model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b', error: 'GROQ_API_KEY missing' };
  }

  try {
    const result = await callGroq({
      systemPrompt: 'Respond with JSON only.',
      userMessage: 'Reply with JSON: {"reply":"ok","suggestions":[]}',
      timeoutMs: 20000,
    });
    return {
      status: result?.success === false ? 'FAIL' : 'PASS',
      model: result?.model || process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      error: result?.success === false ? sanitizeError(new Error(result.reply || 'Groq returned success=false')) : '',
    };
  } catch (err) {
    return {
      status: 'FAIL',
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      error: sanitizeError(err),
    };
  }
}

(async () => {
  const missing = REQUIRED_ENV.filter((name) => !envPresent(name));
  if (missing.length) {
    console.log('ENV: FAIL');
    console.log(`ERROR: Missing required variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('ENV: PASS');

  const gemini = await testGemini();
  console.log(`GEMINI: ${gemini.status}`);
  console.log(`GEMINI_MODEL: ${gemini.model}`);
  if (gemini.error) console.log(`GEMINI_ERROR: ${gemini.error}`);

  const groq = await testGroq();
  console.log(`GROQ: ${groq.status}`);
  console.log(`GROQ_MODEL: ${groq.model}`);
  if (groq.error) console.log(`GROQ_ERROR: ${groq.error}`);

  // At least one provider must work for production AI features.
  const ok = gemini.status === 'PASS' || groq.status === 'PASS';
  process.exit(ok ? 0 : 1);
})();
