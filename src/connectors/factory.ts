import { BaseConnector } from './base';

export class ConnectorFactory {
  private static registry: { [providerName: string]: BaseConnector | (() => BaseConnector) } = {};

  public static register(providerName: string, connector: BaseConnector | (() => BaseConnector)): void {
    this.registry[providerName] = connector;
  }

  public static getConnector(providerName: string): BaseConnector {
    const connector = this.registry[providerName];
    if (!connector) {
      throw new Error(`Provider ${providerName} not registered`);
    }
    return typeof connector === 'function' ? (connector as () => BaseConnector)() : connector;
  }

  public static getRegisteredProviders(): string[] {
    return Object.keys(this.registry);
  }
}
