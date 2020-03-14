import { Plugin, PluginContext } from 'rollup';
import { extname, dirname, resolve as resolvePath } from 'path';
import localFs, { FileDetails } from './fs';
import {
  SummarizerType,
  SummarizerOptions,
  Summaries,
  Article,
  ItemSummarizer,
} from './Summarizer';
import validator from './validator';

const generateAssetUrl = (id: string) => `import.meta.ROLLUP_ASSET_URL_${id}`;

type GenerateRef = (ref: any, lang?: string) => string;

function serializeRefs(refs: Record<string, any>, generate: GenerateRef = generateAssetUrl) {
  const content = Object.keys(refs)
    .map((key) => `"${key}": ${generate(refs[key], key)}`)
    .join(',\n');

  return `{${content}}`;
}

function serializeSummary(rollup: PluginContext, name: string, summaries: Summaries<any>) {
  return serializeRefs(summaries, (summary, lang) => generateAssetUrl(rollup.emitFile({
    type: 'asset',
    name: `${name}.${lang}.json`,
    source: JSON.stringify(summary),
  })));
}

type GetPageIdOptions = {
  ext: string,
  file: FileDetails,
  relativePath: string
};
type GetPageId<L> = (page: unknown, lang: L, options: GetPageIdOptions) => string;

const fileNameId: GetPageId<string> = (page, lang, { relativePath, ext }) => {
  const index = lang.length + ext.length + 1;
  const id = relativePath.slice(0, -index);

  return id || 'default';
};

let pluginId = 1;

type URLIndex = {
  [lang: string]: {
    [id: string]: string
  }
};

type ContentOptions<Lang extends string, Item extends object> = {
  matches?: RegExp,
  langs?: Lang[],
  summarizer?: SummarizerType<Item> | false,
  summary?: SummarizerOptions<Item>,
  pageId?: GetPageId<Lang>,
  pageSchema?: object | false,
  parse?: (content: string) => Item,
  fs?: typeof localFs
};

export default <L extends string = 'en', Item extends object = Article>(
  options: ContentOptions<L, Item> = {},
): Plugin => {
  const regex = options.matches || /\.summary$/;
  const KEY = `SUMMARY_${pluginId++}:`;
  const availableLangs = options.langs || ['en'];
  const generatePageId = options.pageId || fileNameId;
  const Summarizer = options.summarizer === false
    ? null
    : (options.summarizer || ItemSummarizer);
  const parse = options.parse || JSON.parse;
  const fs = options.fs || localFs;
  const validatePage = validator(options.pageSchema);

  return {
    name: 'content-summary',
    resolveId(id, importee) {
      if (regex.test(id)) {
        const ext = extname(id);
        return KEY + resolvePath(dirname(importee!), id.slice(0, -ext.length));
      }
    },
    resolveFileUrl({ fileName }) {
      return `'/${fileName}'`;
    },
    async load(id) {
      if (!id.startsWith(KEY)) {
        return;
      }

      const path = id.slice(KEY.length);
      const urls: URLIndex = {};
      const summarizer = Summarizer ? new Summarizer(options.summary) : null;

      this.addWatchFile(path);
      await fs.walkPath(path, async (file) => {
        const relativePath = file.path.slice(path.length + 1);
        const ext = extname(file.name);
        const langIndex = file.name.slice(0, -ext.length).lastIndexOf('.') + 1;
        const lang = file.name.slice(langIndex, -ext.length) as any;

        if (!availableLangs.includes(lang)) {
          throw new Error(`Invalid lang suffix "${lang}" in ${relativePath}. Possible value: ${availableLangs.join(', ')}`);
        }

        this.addWatchFile(file.path);

        const source = await fs.readFile(file.path, { encoding: 'utf8' });
        const page = parse(source);
        const errors = validatePage(page);

        if (errors) {
          console.error(`Invalid content in "${relativePath}"`);
          console.error(errors);
          throw new TypeError('Invalid file content');
        }

        const pageId = generatePageId(page, lang, { relativePath, file, ext });

        urls[lang] = urls[lang] || {};
        urls[lang][pageId] = this.emitFile({
          type: 'asset',
          name: 'a.json',
          source: JSON.stringify(page),
        });

        if (summarizer) {
          summarizer.add(page, lang, { relativePath });
        }
      });

      const pagesContent = serializeRefs(urls, (langUrls) => serializeRefs(langUrls));
      let content = `export const pages = ${pagesContent};\n`;

      if (summarizer) {
        const name = path.slice(path.indexOf('/src/') + 5).replace(/\W+/g, '_');
        content += `export const summaries = ${serializeSummary(this, name, summarizer.toJSON())};`;
      }

      return content;
    },
  };
};
