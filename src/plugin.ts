import { Plugin, PluginContext } from 'rollup';
import Ajv from 'ajv';
import { extname, dirname, resolve as resolvePath } from 'path';
import localFs, { FileDetails } from './fs';
import {
  Summarizer, Summaries, Article, ArticleSummarizer,
} from './Summarizer';
import { defaultSchema } from './schema';

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
type GetPageId<L> = (page: Article, lang: L, options: GetPageIdOptions) => string;

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

type ContentOptions<Lang extends string, S extends Summarizer<any>> = {
  matches?: RegExp,
  langs?: Lang[],
  summarizer?: S | false,
  pageId?: GetPageId<Lang>,
  pageSchema?: object,
  parse?: (content: string) => S extends Summarizer<infer U> ? U : never,
  fs?: typeof localFs
};

export default <L extends string = 'en', S extends Summarizer<any> = Summarizer<Article>>(
  options: ContentOptions<L, S> = {}
): Plugin => {
  const regex = options.matches || /\.summary$/;
  const KEY = `SUMMARY_${pluginId++}:`;
  const availableLangs = options.langs || ['en'];
  const generatePageId = options.pageId || fileNameId;
  const summarizer = options.summarizer === false
    ? null
    : (options.summarizer || new ArticleSummarizer());
  const parse = options.parse || JSON.parse;
  const fs = options.fs || localFs;
  const ajv = new Ajv();
  const validatePage = ajv.compile(options.pageSchema || defaultSchema);

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

      this.addWatchFile(path);
      await fs.walkPath(path, async (file) => {
        const relativePath = file.path.slice(path.length + 1);
        const ext = extname(file.name);
        const langIndex = file.name.slice(0, -ext.length).lastIndexOf('.') + 1;
        const lang = file.name.slice(langIndex, -ext.length) as any;

        if (!availableLangs.includes(lang)) {
          throw new Error(`Invalid lang suffix "${lang}" in ${relativePath}. Possible value: ${availableLangs.join(', ')}`);
        }

        const source = await fs.readFile(file.path, { encoding: 'utf8' });
        const page = parse(source);

        if (!validatePage(page)) {
          console.error(`Invalid article content in ${relativePath}`);
          console.error(ajv.errorsText(validatePage.errors));
          throw new Ajv.ValidationError(validatePage.errors!);
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
