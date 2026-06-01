import { ConnectorFactory } from './factory';
import { MockConnector } from './mock';
import { AntigravityConnector } from './antigravity';
import { DeepSeekConnector } from './deepseek';
import { TavilyConnector } from './tavily';
import { ClaudeConnector } from './claude';
import { CopilotConnector } from './copilot';

export function initializeConnectors(): void {
  ConnectorFactory.register('claude', new ClaudeConnector());
  ConnectorFactory.register('copilot', new CopilotConnector());
  ConnectorFactory.register('deepseek', new DeepSeekConnector());
  ConnectorFactory.register('tavily', new TavilyConnector());
  ConnectorFactory.register('codex', new MockConnector('codex'));
  ConnectorFactory.register('antigravity', new AntigravityConnector());
}
