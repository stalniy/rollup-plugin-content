import slugify from '@sindresorhus/slugify';
import get from 'lodash/get';
import set from 'lodash/set';
import orderBy from 'lodash/orderBy';
import { ArticleSummary } from './schema';

type Primitive = boolean | string | number | null | undefined;

function updateIndex(
  summary: Record<string, any>,
  indexName: string,
  values: Primitive | Array<Primitive>,
  position: number,
) {
  const index: IndexByPosition = summary[indexName] || {};
  const unifiedValues = Array.isArray(values) ? values : [values];

  unifiedValues.forEach((value) => {
    const key = String(value);
    index[key] = index[key] || [];
    index[key].push(position);
  });

  if (!(indexName in summary)) {
    // eslint-disable-next-line no-param-reassign
    summary[indexName] = index;
  }
}

function collectFieldsAndOrder(fields: string[]) {
  const sort: { fields: string[], order: ('asc' | 'desc')[] } = { fields: [], order: [] };

  fields.forEach((field) => {
    if (field[0] === '-') {
      sort.fields.push(field.slice(1));
      sort.order.push('desc');
    } else {
      sort.fields.push(field);
      sort.order.push('asc');
    }
  });

  return sort;
}

type IndexByPosition = { [key: string]: number[] };
export type Summary<T extends object> = { items: T[] } & { [indexName: string]: IndexByPosition };
export type Summaries<T extends object> = {
  [lang: string]: Summary<T>
};

type ResolverOptions<T extends object> = ItemOptions & SummarizerOptions<T>;

export type SummarizerOptions<T extends object> = {
  fields: Array<keyof T>,
  resolve: {
    [K in keyof T]?: (value: T, field: K, options?: ResolverOptions<T>) => T[K]
  },
  sortBy: string[],
  indexBy: Array<keyof T>,
};
type ItemOptions = {
  relativePath: string
};

export type Article = ArticleSummary & {
  meta?: {
    keywords?: string[],
    description?: string
  },
  content: string
};

type Page = { alias?: string, title: string };
export const pageAlias = (page: Page) => page.alias || slugify(page.title);

export type Summarizer<T extends object> = {
  add(article: T, lang: string, options: ItemOptions): void
  toJSON(): Summaries<T>
};

export type SummarizerType<T extends object> = new (...args: any[]) => Summarizer<T>;

const DEFAULT_SUMMARIZER_OPTIONS = {
  indexBy: ['categories', 'meta.keywords'],
  sortBy: ['createdAt'],
  fields: [
    'title',
    'author',
    'createdAt',
    'alias',
    'categories',
    'summary',
  ],
  resolve: {
    alias: pageAlias,
  },
} as const;

export class ItemSummarizer<T extends object> {
  protected options: SummarizerOptions<T>;

  protected summaries: Summaries<object>;

  constructor(options: Partial<SummarizerOptions<T>> = {}) {
    this.options = {
      ...DEFAULT_SUMMARIZER_OPTIONS,
      ...options,
    } as SummarizerOptions<T>;
    this.summaries = {};
  }

  add(item: T, lang: string, options: ItemOptions) {
    if ((item as any).draft) {
      return;
    }

    this.summaries[lang] = this.summaries[lang] || { items: [] };
    const summarizedItem = this.options.fields.reduce((partialItem, field) => {
      const resolve = this.options.resolve[field];
      const value = typeof resolve === 'function'
        ? resolve(item, field, { ...this.options, ...options })
        : get(item, field);

      if (typeof value !== 'undefined') {
        set(partialItem, field, value);
      }

      return partialItem;
    }, {});
    this.summaries[lang].items.push(summarizedItem);
  }

  protected addToIndex(item: object, lang: string, position: number) {
    const indexBy = this.options.indexBy as string[] | undefined;

    if (!indexBy) {
      return;
    }

    const summary = this.summaries[lang];
    indexBy.forEach((field) => {
      const indexName = field[0].toUpperCase() + field[1].slice(1)
        .replace(/\.(\w)/g, (_, l) => l.toUpperCase());
      updateIndex(summary, `by${indexName}`, get(item, field), position);
    });
  }

  toJSON() {
    const sortOrder = this.options.sortBy
      ? collectFieldsAndOrder(this.options.sortBy)
      : null;
    Object.keys(this.summaries).forEach((lang) => {
      const summary = this.summaries[lang];

      if (sortOrder) {
        // eslint-disable-next-line no-param-reassign
        summary.items = orderBy(summary.items, sortOrder.fields, sortOrder.order);
      }

      if (this.options.indexBy) {
        summary.items.forEach((item, position) => this.addToIndex(item, lang, position));
      }
    });

    return this.summaries;
  }
}
