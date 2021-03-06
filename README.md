# Static content generation using Rollup

This plugin allows to generate i18n summary and pages from yaml or json files to fetch them later in your app. This allows to create SPA blog using rollup and framework of your choise very easily.

## Installation

```sh
npm i -D rollup-plugin-content
# or
yarn add -D rollup-plugin-content
```

## Usage

Suppose you have the next structure of files (you are not forced to use this folder structure):

```sh
[user@laptop my-website]$ tree src/content/pages
├── about
│   ├── en.yml
│   └── uk.yml
├── friends
│   ├── en.yml
│   └── uk.yml
└── notfound
│   ├── en.yml
│   └── uk.yml
```

And the sample file looks like this (to see full list of properties, check [json schem file](./src/schema.ts#L12)):

```yml
title: About blog
createdAt: 2020-03-09T00:00:00.Z
meta:
  keywords: [software, opensource, just interesting content]
  description: some interesting information about the blog
content: |
  Hello this is and interesting blog about software development
```

In order to load them in js, you need to include `content` plugin in your `rollup.config.js`

```js
import yaml from 'js-yaml';
import { content } from 'rollup-plugin-content';

export default {
  input: 'src/app.js',
  output: {
    format: 'es',
    dir: 'dist',
    sourcemap: true,
  },
  plugins: [
    content({
      langs: ['en', 'uk'],
      parse: yaml.load, // by default uses `JSON.parse`
      plugins: [
        summary({
          fields: ['title', 'createdAt']
        })
      ]
    }),
    // other plugins
  ]
}
```

Later in your app create a service in `src/services/pages.js`

```js
import { pages, summaries } from '../content/pages.summary';

// you can fetch a particular page
export async function getPage(lang, name) {
  // const aboutPageUrl = pages.en.about;
  const response = await fetch(pages[lang][name]);
  return response.json();
}

// and you can get a list of all pages sorted by createdAt desc!
export async function getPages(lang) {
  const response = await fetch(summaries[lang]);
  return response.json()
}
```

Later in your `app.js`:

```js
import { getPage, getPages } from './services/pages';

async function main() {
  const page = await getPage('en', 'about');
  console.log(page.title, page.content);

  const pages = await getPages('en');
  console.log(pages.items) // list of pages
}

main();
```

## About Summaries

Summaries are very useful to create a list of articles, especially in the blog. This plugin iterates recursively over directories, extracts and collects details for each page. Also it creates 2 indexes: index by category and index by keywords. This allows to find pages very quickly. For example, to find all pages in the category `frontend`

```js
import { getPages } from './services/pages';

async function getPagesByCategory(lang, category) {
  const pages = await getPages(lang);
  return pages.byCategory[category].map(index => pages.items[index]);
}

async function main() {
  const pagesAboutFrontend = await getPagesByCategory('en', 'frontend');

  console.log(pagesAboutFrontend);
}
```

To see the list of propeties inside page summary items, check [schema file](./src/schema.ts#L1).

## Options

* `matches`, by default equals `/\.summary$/`
  regexp that matches which imports to process
* `langs`, by default equals `['en']`
  validates which languages should be included. Lang should be a part of file (e.g., `en.json`, `about.en.yml`)
* `main`, contains `SummaryOptions` for the main entry file.
  Sometimes it may be useful to restrict content of the main file and this field allows us to do this.
* `pageSchema`, by default can be found [here](./src/schema.ts#L12)
  JSON schema to validate the page. So, you are saved from making a typo and spending hours trying to understand what is wrong
* `parse`, by default equals `content => JSON.parse(content)`
  parses file content into object, accepts file content and parsing context.
* `fs`, by default uses nodejs filesystem
  may be useful if you want to implement in memmory filesystem. Must implement 2 methods: `walkPath` and `readFile`.
* `plugins`\
  allows to pass content plugins. Every plugin has the next hooks:

  * `beforeParse(source: string, parsingContext: ParsingContext): void`,
  * `afterParse(item: object, parsingContext: ParsingContext): void`
  * `generate(rollup: PluginContext, context: GenerationContext): string | Promise<string>`

In order to use this in typescript just include `rollup-plugin-content/content.d.ts` in your `tsconfig.json`

```json
{
  "include": [
    // other includes
    "node_modules/rollup-plugin-content/content.d.ts"
  ]
}
```

## Built-in plugins

This package contains `summary` content plugin that allows to create a separate json of short summary info for all items. This is useful if you need to list all your pages in chronological order (e.g., in blog).

Summary plugin accepts either a configuration for summary or summarizer factory. It can be used to create search index json file using JavaScript full text search libraries like [MiniSearch](https://github.com/lucaong/minisearch).

## Can I use HTML inside?

Yes, you can use either [gray-matter] or [xyaml-webpack-loader] to use HTML in yaml files.

### Config for xyaml-webpack-loader

Despite the name [xyaml-webpack-loader] supports rollup as well and can be used as a standalone parser:

```js
import { parse } from 'xyaml-webpack-loader/parser';
import { content } from 'rollup-plugin-content';

export default {
  input: 'src/app.js',
  output: {
    // ...
  },
  plugins: [
    // ...
    content({
      langs: ['en', 'uk'],
      parse
    }),
  ]
}
```

The nice thing about this package is that it allows you to use markdown in any field you need, not only in content section.

### Config for gray-matter

Pass `grayMatter` to `parse` option of rollup-plugin-content and use [gray-matter] to define your content:

```js
import matter from 'gray-matter';
import { content } from 'rollup-plugin-content';

export default {
  input: 'src/app.js',
  output: {
    // ...
  },
  plugins: [
    // ...
    content({
      langs: ['en', 'uk'],
      parse: matter
    }),
  ]
}
```

### Get the best of 2 packages

[gray-matter] supports custom parsers and this allows to combine [xyaml-webpack-loader]'s parser with gray-matter:

```js
import parser from 'xyaml-webpack-loader/parser';
import matter from 'gray-matter';
import { content } from 'rollup-plugin-content';

export default {
  input: 'src/app.js',
  output: {
    // ...
  },
  plugins: [
    // ...
    content({
      langs: ['en', 'uk'],
      parse: content => matter(content, {
        language: 'xyaml',
        engines: {
          xyaml: parser
        }
      })
    }),
  ]
}
```

[gray-matter]: https://github.com/jonschlinkert/gray-matter
[xyaml-webpack-loader]: https://github.com/stalniy/xyaml-webpack-loader

## Example

This plugin is used to generate [CASL documentation](https://stalniy.github.io/casl/). You can check how it's used to create pages and search index for client side full text search in [rollup.config.js](https://github.com/stalniy/casl/blob/master/docs-src/rollup.config.js#L144).

## License

[MIT License](http://www.opensource.org/licenses/MIT)

Copyright (c) 2020-present, Sergii Stotskyi
