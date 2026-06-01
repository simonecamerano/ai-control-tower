import { BaseConnector } from './base';

/**
 * Central registry that maps provider names to their `BaseConnector` instances
 * (or lazy factory functions that produce them).
 *
 * Connectors are registered once at startup via `register` and resolved on
 * demand via `getConnector`.
 */
export class ConnectorFactory {
  /** Maps provider name → a connector instance or a zero-arg factory that creates one. */
  private static registry: { [providerName: string]: BaseConnector | (() => BaseConnector) } = {};

  /**
   * Registers a connector (or a factory function) under the given provider name.
   * Re-registering an existing name silently overwrites the previous entry.
   *
   * @param providerName - Key used to retrieve the connector later (e.g. `"claude"`).
   * @param connector    - A ready-made connector instance or a zero-arg factory.
   */
  public static register(providerName: string, connector: BaseConnector | (() => BaseConnector)): void {
    this.registry[providerName] = connector;
  }

  /**
   * Returns the connector for the given provider name.
   * If a factory function was registered, it is called once per retrieval
   * (no singleton caching at this level).
   *
   * @throws {Error} If `providerName` has not been registered.
   */
  public static getConnector(providerName: string): BaseConnector {
    const connector = this.registry[providerName];
    if (!connector) {
      throw new Error(`Provider ${providerName} not registered`);
    }
    // Call the factory if a lazy constructor was registered instead of an instance.
    return typeof connector === 'function' ? (connector as () => BaseConnector)() : connector;
  }

  /** Returns the names of all currently registered providers. */
  public static getRegisteredProviders(): string[] {
    return Object.keys(this.registry);
  }
}
