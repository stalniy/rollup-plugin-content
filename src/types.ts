import { FileDetails } from './fs';

export type ParsingContext<L extends string> = {
  relativePath: string,
  ext: string,
  lang: L,
  file: FileDetails
};

export type SummarizerOptions<T extends object> = {
  fields: (keyof T)[],
  resolve: {
    [K in keyof T]?: (
      value: T,
      field: K,
      parsingContext: ParsingContext<string>,
      options?: SummarizerOptions<T>
    ) => T[K]
  },
  sortBy: string[],
  indexBy: (keyof T)[],
};
