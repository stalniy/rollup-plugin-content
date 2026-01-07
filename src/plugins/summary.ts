import {
  ItemSummarizer,
  Summarizer
} from '../Summarizer';
import { ContentPlugin } from '../contentPlugins';
import { SummarizerOptions } from '../types';
import { serializeRefs } from '../utils';

type SummarizerFactory<T extends object> = () => Summarizer<T>;

export function summary<Item extends object>(
  summarizerOrOptions: SummarizerOptions<Item> | SummarizerFactory<Item>,
): ContentPlugin {
  const createSummarizer = typeof summarizerOrOptions === 'function'
    ? summarizerOrOptions
    : () => new ItemSummarizer<Item>(summarizerOrOptions) as unknown as Summarizer<Item>;
  let summarizer: Summarizer<Item> | null;

  return {
    afterParse(page, parsingContext) {
      summarizer = summarizer || createSummarizer();
      summarizer.add(page, parsingContext);
    },
    generate(_, { path, emitFile, serializeContent }) {
      const exportName = summarizer!.exportAs || 'summaries';
      const name = path.slice(path.indexOf('/src/') + 5).replace(/\W+/g, '_');
      const content = serializeRefs(summarizer!.toJSON(), (details, lang) => serializeContent(emitFile({
        type: 'asset',
        name: `${name}_${exportName}.${lang}.json`,
        source: JSON.stringify(details),
      })))
      summarizer = null;

      return `export var ${exportName} = ${content};`;
    },
  };
}
