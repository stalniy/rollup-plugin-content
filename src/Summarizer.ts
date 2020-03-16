import slugify from '@sindresorhus/slugify';
import get from 'lodash/get';
import set from 'lodash/set';
import orderBy from 'lodash/orderBy';
import { ArticleSummary } from './schema';
import { ParsingContext } from './types';

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

type SortingOptions = {
  fields: string[],
  order: Array<'asc' | 'desc'>,
  missingFields: string[]
};

function getSortingOptions(options: any) {
  const sort: SortingOptions = {
    fields: [],
    order: [],
    missingFields: [],
  };

  options.sortBy.forEach((item: string) => {
    let field = item;
    let order: SortingOptions['order'][number] = 'asc';

    if (item[0] === '-') {
      field = item.slice(1);
      order = 'desc';
    }

    sort.fields.push(field);
    sort.order.push(order);

    if (!options.fields.includes(field)) {
      sort.missingFields.push(field);
    }
  });

  return sort;
}

type IndexByPosition = { [key: string]: number[] };
export type Summary<T extends object> = { items: T[] } & { [indexName: string]: IndexByPosition };
export type Summaries<T extends object> = {
  [lang: string]: Summary<T>
};

export type SummarizerOptions<T extends object> = {
  fields: Array<keyof T>,
  resolve: {
    [K in keyof T]?: (
      value: T,
      field: K,
      parsingContext?: ParsingContext<string>,
      options?: SummarizerOptions<T>
    ) => T[K]
  },
  sortBy: string[],
  indexBy: Array<keyof T>,
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

type BaseItem = { hidden?: true };

export type Summarizer<T extends BaseItem> = {
  add(article: T, options: ParsingContext<string>): void
  toJSON(): Summaries<T>
};

export type SummarizerType<T extends object> = new (...args: any[]) => Summarizer<T>;

const DEFAULT_SUMMARIZER_OPTIONS = {
  fields: [
    'title',
    'author',
    'createdAt',
    'alias',
    'categories',
  ],
  resolve: {
    alias: pageAlias,
  },
} as const;

export class ItemSummarizer<T extends BaseItem> {
  protected options: SummarizerOptions<T>;

  protected summaries: Summaries<object>;

  protected sortingOptions: SortingOptions | null;

  constructor(options: Partial<SummarizerOptions<T>> = {}) {
    this.options = {
      ...DEFAULT_SUMMARIZER_OPTIONS,
      ...options,
    } as SummarizerOptions<T>;
    this.summaries = {};
    this.sortingOptions = options.sortBy
      ? getSortingOptions(this.options)
      : null;
  }

  add(item: T, options: ParsingContext<string>) {
    if (item.hidden) {
      return;
    }

    const { lang } = options;
    this.summaries[lang] = this.summaries[lang] || { items: [] };
    const summarizedItem = this.options.fields.reduce((partialItem, field) => {
      const resolve = this.options.resolve[field];
      const value = typeof resolve === 'function'
        ? resolve(item, field, options, this.options)
        : get(item, field);

      if (typeof value !== 'undefined') {
        set(partialItem, field, value);
      }

      return partialItem;
    }, {});

    this.summaries[lang].items.push(summarizedItem);
    this.ensureHasFieldsForSorting(summarizedItem, item);
  }

  protected ensureHasFieldsForSorting(summarizedItem: unknown, item: T) {
    const { sortingOptions } = this;

    if (!sortingOptions || !sortingOptions.missingFields.length) {
      return;
    }

    sortingOptions.missingFields.forEach((field) => {
      const index = field.indexOf('.');
      const key = index === -1 ? field : field.slice(0, index);
      Object.defineProperty(summarizedItem, key, { value: get(item, field) });
    });
  }

  protected addToIndex(item: object, lang: string, position: number) {
    const indexBy = this.options.indexBy as string[] | undefined;

    if (!indexBy) {
      return;
    }

    const summary = this.summaries[lang];
    indexBy.forEach((field) => {
      const indexName = field[0].toUpperCase() + field.slice(1)
        .replace(/\.(\w)/g, (_, l) => l.toUpperCase());
      updateIndex(summary, `by${indexName}`, get(item, field), position);
    });
  }

  toJSON() {
    Object.keys(this.summaries).forEach((lang) => {
      const summary = this.summaries[lang];

      if (this.sortingOptions) {
        const { fields, order } = this.sortingOptions;
        // eslint-disable-next-line no-param-reassign
        summary.items = orderBy(summary.items, fields, order);
      }

      if (this.options.indexBy) {
        summary.items.forEach((item, position) => this.addToIndex(item, lang, position));
      }
    });

    return this.summaries;
  }
}
