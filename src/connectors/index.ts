import { ConnectorFactory } from './factory';
import { MockConnector } from './mock';
import { AntigravityConnector } from './antigravity';

export function initializeConnectors(): void {
  ConnectorFactory.register('claude', new MockConnector('claude'));
  ConnectorFactory.register('copilot', new MockConnector('copilot'));
  ConnectorFactory.register('deepseek', new MockConnector('deepseek'));
  ConnectorFactory.register('tavily', new MockConnector('tavily'));
  ConnectorFactory.register('codex', new MockConnector('codex'));
  ConnectorFactory.register('antigravity', new AntigravityConnector());
}
