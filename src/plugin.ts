import type { Plugin, PluginContext } from 'rollup';
import { createFilter } from '@rollup/pluginutils';
import { extname, dirname, resolve as resolvePath } from 'path';
import localFs from './fs';
import type { ParsingContext, SummarizerOptions } from './types';
import validator from './validator';
import { type ContentPlugin, runPluginsHook } from './contentPlugins';
import {
  serializeRefs, returnTrue, fileNameId, pick,
  generateAssetUrl,
} from './utils';

let pluginId = 1;

type URLIndex = {
  [lang: string]: {
    [id: string]: string
  }
};

interface ContentOptions<Lang extends string, Item extends {}> {
  entry?: RegExp
  files?: string
  langs?: Lang[]
  pageSchema?: object | false
  main?: SummarizerOptions<Item>,
  parse?: (content: string, context?: ParsingContext<Lang>) => Item
  fs?: typeof localFs
  plugins?: ContentPlugin<Lang>[]
}

export default <L extends string = 'en', Item extends { id: any } = any>(
  options: ContentOptions<L, Item> = {},
): VitePlugin => {
  const entryRegex = options.entry || /\.summary$/;
  const KEY = `\0CONTENT_${pluginId++}:`;
  const availableLangs = options.langs || ['en'];
  const generatePageId = options.main?.resolve?.id || fileNameId;
  const parse = options.parse || ((content) => JSON.parse(content));
  const fs = options.fs || localFs;
  const validatePage = validator(options.pageSchema);
  const canProcessFile = options.files ? createFilter(options.files) : returnTrue;
  let devServer: import('vite').ViteDevServer;
  const devServerContent = new Map<string, string>();

  return {
    name: 'content',
    configureServer(server) {
      devServer = server;
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url?.startsWith('/@content-json/')) {
          const cacheKey = req.url.slice('/@content-json/'.length);
          const data = devServerContent.get(cacheKey);

          if (data) {
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
            return;
          }
        }
        next();
      });
    },
    resolveId(id, importee) {
      if (entryRegex.test(id) && importee) {
        const ext = extname(id);
        return KEY + Buffer.from(resolvePath(dirname(importee!), id.slice(0, -ext.length))).toString('base64');
      }
    },
    resolveFileUrl({ fileName }) {
      return `'/${fileName}'`;
    },
    async load(id) {
      if (!id.startsWith(KEY)) {
        return;
      }

      const path = Buffer.from(id.slice(KEY.length), 'base64').toString('utf8');
      const urls: URLIndex = {};
      const context = this;

      if (devServer) {
        devServer.watcher.add(path);
        const invalidateModule = (file: string) => {
          if (!file.startsWith(path)) return;
          const mod = devServer.moduleGraph.getModuleById(id);
          if (!mod) return;
          devServer.moduleGraph.invalidateModule(mod);
          devServer.ws.send({ type: "full-reload" });
        };
        devServer.watcher.on('add', invalidateModule);
        devServer.watcher.on('unlink', invalidateModule);
      } else {
        context.addWatchFile(path);
      }

      const emitFile: PluginContext['emitFile'] = (options) => {
        if (devServer && options.type === 'asset') {
          devServerContent.set(options.name!, options.source?.toString() || '');
          return `'/@content-json/${options.name}'`;
        }
        return context.emitFile(options);
      };
      const serializeContent = devServer
        ? (id: string) => id
        : generateAssetUrl;

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

        // if (!isDevServer) {
          context.addWatchFile(file.path);
        // }

        const source = await fs.readFile(file.path, { encoding: 'utf8' });
        const parsingContext = {
          relativePath,
          lang,
          file,
          ext,
        };

        await runPluginsHook(options.plugins, 'beforeParse', source, parsingContext);
        const page = parse(source, parsingContext);
        const errors = validatePage(page);

        if (errors) {
          console.error(`Invalid content in "${relativePath}"`);
          console.error(errors);
          throw new TypeError('Invalid file content');
        }

        page.id = generatePageId(page, 'id', parsingContext);
        await runPluginsHook(options.plugins, 'afterParse', page, parsingContext);

        const partialPage = options.main?.fields ? pick(page, options.main, parsingContext) : page;
        urls[lang] = urls[lang] || {};
        urls[lang][page.id] = emitFile({
          type: 'asset',
          name: `${page.id}.${lang}.json`,
          source: JSON.stringify(partialPage),
        });
      });

      const pagesContent = serializeRefs(urls, (langUrls) => serializeRefs(langUrls, serializeContent));
      const content = `export var pages = ${pagesContent};\n`;
      const pluginsContent = await runPluginsHook(options.plugins, 'generate', context, { path, emitFile, serializeContent });

      return content + pluginsContent.filter(Boolean).join(';\n');
    }
  };
};

type VitePlugin = Plugin & {
  configureServer?(server: import('vite').ViteDevServer): void
}
