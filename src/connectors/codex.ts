import * as fs from 'fs';
import * as path from 'path';
import { BaseConnector } from './base';
import { ProviderMetrics, HealthStatus, ModelMetrics } from '../types';

export class CodexConnector extends BaseConnector {
  constructor() {
    super('codex');
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    const authPath = path.join(home, '.codex', 'auth.json');
    const now = new Date().toISOString();

    if (!fs.existsSync(authPath)) {
      return {
        provider: 'codex',
        status: 'inactive',
        health: 'OK',
        models: [],
        resetAt: null,
        lastUpdatedAt: now
      };
    }

    try {
      const authContent = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      const accessToken = authContent.tokens?.access_token;
      const accountId = authContent.tokens?.account_id;

      if (!accessToken) {
        return {
          provider: 'codex',
          status: 'inactive',
          health: 'OK',
          models: [],
          resetAt: null,
          lastUpdatedAt: now
        };
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };

      if (accountId) {
        headers['ChatGPT-Account-Id'] = accountId;
      }

      const response = await fetch('https://chatgpt.com/backend-api/wham/usage', {
        headers
      });

      if (!response.ok) {
        return {
          provider: 'codex',
          status: 'error',
          health: 'BLOCKED',
          models: [],
          resetAt: null,
          lastUpdatedAt: now
        };
      }

      const data = await response.json();
      const rateLimit = data?.rate_limit;

      if (!rateLimit) {
        return {
          provider: 'codex',
          status: 'error',
          health: 'BLOCKED',
          models: [],
          resetAt: null,
          lastUpdatedAt: now
        };
      }

      const primaryWindow = rateLimit.primary_window;
      const secondaryWindow = rateLimit.secondary_window;
      const limitReached = rateLimit.limit_reached;

      const models: ModelMetrics[] = [];

      if (primaryWindow) {
        const primaryUsed = primaryWindow.used_percent ?? 0;
        models.push({
          modelId: 'codex-primary',
          modelName: 'Codex Primary Window',
          quota: {
            type: 'percent',
            total: 100,
            used: primaryUsed,
            remaining: Math.max(0, 100 - primaryUsed)
          },
          resetAt: primaryWindow.reset_at ? new Date(primaryWindow.reset_at * 1000).toISOString() : null
        });
      }

      if (secondaryWindow) {
        const secondaryUsed = secondaryWindow.used_percent ?? 0;
        models.push({
          modelId: 'codex-secondary',
          modelName: 'Codex Secondary Window',
          quota: {
            type: 'percent',
            total: 100,
            used: secondaryUsed,
            remaining: Math.max(0, 100 - secondaryUsed)
          },
          resetAt: secondaryWindow.reset_at ? new Date(secondaryWindow.reset_at * 1000).toISOString() : null
        });
      }

      let health: HealthStatus = 'OK';
      if (limitReached) {
        health = 'BLOCKED';
      } else {
        const primaryUsed = primaryWindow?.used_percent ?? 0;
        const secondaryUsed = secondaryWindow?.used_percent ?? 0;
        const maxUsed = Math.max(primaryUsed, secondaryUsed);

        if (maxUsed >= 90) {
          health = 'CRITICAL';
        } else if (maxUsed >= 70) {
          health = 'WARNING';
        }
      }

      const primaryReset = primaryWindow?.reset_at 
        ? new Date(primaryWindow.reset_at * 1000).toISOString() 
        : null;

      return {
        provider: 'codex',
        status: 'active',
        health,
        models,
        resetAt: primaryReset,
        lastUpdatedAt: now
      };
    } catch {
      return {
        provider: 'codex',
        status: 'error',
        health: 'BLOCKED',
        models: [],
        resetAt: null,
        lastUpdatedAt: now
      };
    }
  }
}
