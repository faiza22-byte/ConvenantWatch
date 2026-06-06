import '../config/loadEnv.js';
import { hasLegacyEnvTokens, qbConfig, validateQuickBooksConfig } from '../config/quickbooks.js';

function mask(value) {
  if (!value) return value;
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

console.log('qbConfig=', {
  ...qbConfig,
  clientId: mask(qbConfig.clientId),
  clientSecret: mask(qbConfig.clientSecret),
  refreshToken: mask(qbConfig.refreshToken),
});
console.log('missing=', validateQuickBooksConfig());
console.log('hasLegacyEnvTokens=', hasLegacyEnvTokens());
