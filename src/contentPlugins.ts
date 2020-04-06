import { PluginContext } from 'rollup';
import { ParsingContext } from './types';

export interface ContentPlugin<L extends string = string> {
  beforeParse?(source: string, parsingContext: ParsingContext<L>): void
  afterParse?(page: any, parsingContext: ParsingContext<L>): void
  generate?(rollup: PluginContext, context: GenerateContext): string | Promise<string>
}

export interface GenerateContext {
  path: string
}

export function runPluginsHook(
  plugins: ContentPlugin[] | undefined,
  hookName: keyof ContentPlugin,
  ...args: any[]
) {
  if (!plugins) {
    return Promise.resolve([]);
  }

  return Promise.all(plugins.map((plugin) => {
    const hook = plugin[hookName] as any;
    return typeof hook === 'function' ? hook(...args) : null;
  }));
}
