import { ConnectorFactory } from './factory';
import { MockConnector } from './mock';
import { AntigravityConnector } from './antigravity';
import { DeepSeekConnector } from './deepseek';
import { TavilyConnector } from './tavily';
import { ClaudeConnector } from './claude';
import { CopilotConnector } from './copilot';
import { CodexConnector } from './codex';

/**
 * Registers all known provider connectors with the `ConnectorFactory`.
 *
 * Must be called once during application startup (before any route handler
 * attempts to resolve a connector). Each connector is registered as a
 * singleton instance; the factory holds the reference for the lifetime of
 * the process.
 */
export function initializeConnectors(): void {
  ConnectorFactory.register('claude', new ClaudeConnector());
  ConnectorFactory.register('copilot', new CopilotConnector());
  ConnectorFactory.register('deepseek', new DeepSeekConnector());
  ConnectorFactory.register('tavily', new TavilyConnector());
  ConnectorFactory.register('codex', new CodexConnector());
  ConnectorFactory.register('antigravity', new AntigravityConnector());
}
