import slugify from '@sindresorhus/slugify';
import { ArticleSummary } from './schema';

function getSummary(path: string, content: string): string {
  const index = content.indexOf('<cut/>');

  if (index === -1) {
    throw new Error(`Unable to find <cut/> for summary detection in ${path}`);
  }

  return content.slice(0, index).trim();
}

function updateIndex<T extends Summary<any>>(
  summary: T,
  indexName: Exclude<keyof T, 'items'>,
  values: string[],
) {
  const articleIndex = summary.items.length - 1;
  const index: IndexByPosition = summary[indexName] || {};

  values.forEach((value) => {
    index[value] = index[value] || [];
    index[value].push(articleIndex);
  });

  if (!(indexName in summary)) {
    // eslint-disable-next-line no-param-reassign
    summary[indexName] = index as any;
  }
}

type IndexByPosition = { [key: string]: number[] };
export type Summary<T> = {
  items: T[],
  byCategory: IndexByPosition,
  byTags: IndexByPosition
};
export type Summaries<T> = {
  [lang: string]: Summary<T>
};
type SummarizerOptions = {
  imageSize?: [number, number]
};
type ArticleOptions = {
  relativePath: string
};
type Page = {
  alias?: string,
  title: string
};
export type Article = ArticleSummary & {
  meta?: {
    keywords?: string[],
    description?: string
  },
  content: string
};

export const pageAlias = (page: Page) => page.alias || slugify(page.title);

export type Summarizer<T> = {
  add(article: T, lang: string, options: ArticleOptions): void
  toJSON(): Summaries<T>
};

export type SummarizerType<T> = new (...args: any[]) => Summarizer<T>;

export class ArticleSummarizer {
  protected imageSize: Exclude<SummarizerOptions['imageSize'], undefined>;

  protected summaries: Summaries<ArticleSummary>;

  constructor(options: SummarizerOptions = {}) {
    this.imageSize = options.imageSize || [710, 200];
    this.summaries = {};
  }

  add(article: Article, lang: string, options: ArticleOptions) {
    if (article.draft) {
      return;
    }

    this.summaries[lang] = this.summaries[lang] || { items: [] };
    this.summaries[lang].items.push({
      i: this.summaries[lang].items.length,
      title: article.title,
      author: article.author,
      createdAt: article.createdAt,
      alias: pageAlias(article),
      categories: article.categories,
      summary: (article.summary || getSummary(options.relativePath, article.content))
        .replace(
          /<img([^>]+)>/g,
          `<img$1 width="${this.imageSize[0]}" height="${this.imageSize[1]}">`,
        ),
    });

    if (article.categories) {
      updateIndex(this.summaries[lang], 'byCategory', article.categories);
    }

    if (article.meta && article.meta.keywords) {
      updateIndex(this.summaries[lang], 'byTags', article.meta.keywords);
    }
  }

  toJSON() {
    Object.values(this.summaries).forEach((summary) => {
      // eslint-disable-next-line no-param-reassign
      summary.items = summary.items
        .sort((item, anotherItem) => anotherItem.createdAt.getTime() - item.createdAt.getTime());
    });

    return this.summaries;
  }
}
