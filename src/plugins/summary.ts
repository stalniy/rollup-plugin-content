import { PluginContext } from 'rollup';
import {
  Summarizer,
  SummarizerOptions,
  Summaries,
  ItemSummarizer,
} from '../Summarizer';
import { ContentPlugin } from '../contentPlugins';
import { serializeRefs, generateAssetUrl } from '../utils';

function serializeSummary(rollup: PluginContext, name: string, summaries: Summaries<any>) {
  return serializeRefs(summaries, (details, lang) => generateAssetUrl(rollup.emitFile({
    type: 'asset',
    name: `${name}.${lang}.json`,
    source: JSON.stringify(details),
  })));
}

type SummarizerFactory<T extends object> = () => Summarizer<T>;

export function summary<Item extends object>(
  summarizerOrOptions: SummarizerOptions<Item> | SummarizerFactory<Item>,
): ContentPlugin {
  const createSummarizer = typeof summarizerOrOptions === 'function'
    ? summarizerOrOptions
    : () => new ItemSummarizer<Item>(summarizerOrOptions);
  let summarizer: Summarizer<Item> | null;

  return {
    afterParse(page, parsingContext) {
      summarizer = summarizer || createSummarizer();
      summarizer.add(page, parsingContext);
    },
    generate(rollup, { path }) {
      const exportName = summarizer!.exportAs || 'summaries';
      const name = path.slice(path.indexOf('/src/') + 5).replace(/\W+/g, '_');
      const content = serializeSummary(rollup, `${name}_${exportName}`, summarizer!.toJSON());
      summarizer = null;

      return `export var ${exportName} = ${content};`;
    },
  };
}
