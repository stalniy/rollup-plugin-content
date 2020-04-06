import { Plugin } from 'rollup';
import { createFilter } from '@rollup/pluginutils';
import { extname, dirname, resolve as resolvePath } from 'path';
import localFs from './fs';
import { ParsingContext, GetPageId } from './types';
import validator from './validator';
import { ContentPlugin, runPluginsHook } from './contentPlugins';
import { serializeRefs, returnTrue, fileNameId } from './utils';

let pluginId = 1;

type URLIndex = {
  [lang: string]: {
    [id: string]: string
  }
};

interface ContentOptions<Lang extends string, Item extends object> {
  entry?: RegExp
  files?: string
  langs?: Lang[]
  pageId?: GetPageId<Lang>
  pageSchema?: object | false
  parse?: (content: string, context?: ParsingContext<Lang>) => Item
  fs?: typeof localFs
  plugins?: ContentPlugin<Lang>[]
}

export default <L extends string = 'en', Item extends object = any>(
  options: ContentOptions<L, Item> = {},
): Plugin => {
  const entryRegex = options.entry || /\.summary$/;
  const KEY = `CONTENT_${pluginId++}:`;
  const availableLangs = options.langs || ['en'];
  const generatePageId = options.pageId || fileNameId;
  const parse = options.parse || ((content) => JSON.parse(content));
  const fs = options.fs || localFs;
  const validatePage = validator(options.pageSchema);
  const canProcessFile = options.files ? createFilter(options.files) : returnTrue;

  return {
    name: 'content',
    resolveId(id, importee) {
      if (entryRegex.test(id)) {
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
        if (!canProcessFile(file.path)) {
          return;
        }

        const relativePath = file.path.slice(path.length + 1);
        const ext = extname(file.name);
        const langIndex = file.name.slice(0, -ext.length).lastIndexOf('.') + 1;
        const lang = file.name.slice(langIndex, -ext.length) as any;

        if (!availableLangs.includes(lang)) {
          throw new Error(`Invalid lang suffix "${lang}" in ${relativePath}. Possible value: ${availableLangs.join(', ')}`);
        }

        this.addWatchFile(file.path);

        const source = await fs.readFile(file.path, { encoding: 'utf8' });
        const parsingContext = {
          relativePath, lang, file, ext,
        };

        await runPluginsHook(options.plugins, 'beforeParse', source, parsingContext);
        const page = parse(source, parsingContext);
        const errors = validatePage(page);

        if (errors) {
          console.error(`Invalid content in "${relativePath}"`);
          console.error(errors);
          throw new TypeError('Invalid file content');
        }

        page.id = generatePageId(page, parsingContext);
        await runPluginsHook(options.plugins, 'afterParse', page, parsingContext);
        urls[lang] = urls[lang] || {};
        urls[lang][page.id] = this.emitFile({
          type: 'asset',
          name: 'a.json',
          source: JSON.stringify(page),
        });
      });

      const pagesContent = serializeRefs(urls, (langUrls) => serializeRefs(langUrls));
      const content = `export var pages = ${pagesContent};\n`;
      const pluginsContent = await runPluginsHook(options.plugins, 'generate', this, { path });

      return content + pluginsContent.filter(Boolean).join(';\n');
    },
  };
};
