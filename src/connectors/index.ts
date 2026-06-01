import { ConnectorFactory } from './factory';
import { MockConnector } from './mock';
import { AntigravityConnector } from './antigravity';
import { DeepSeekConnector } from './deepseek';
import { TavilyConnector } from './tavily';
import { ClaudeConnector } from './claude';

export function initializeConnectors(): void {
  ConnectorFactory.register('claude', new ClaudeConnector());
  ConnectorFactory.register('copilot', new MockConnector('copilot'));
  ConnectorFactory.register('deepseek', new DeepSeekConnector());
  ConnectorFactory.register('tavily', new TavilyConnector());
  ConnectorFactory.register('codex', new MockConnector('codex'));
  ConnectorFactory.register('antigravity', new AntigravityConnector());
}
