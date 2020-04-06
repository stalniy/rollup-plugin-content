import { FileDetails } from './fs';

export type ParsingContext<L extends string> = {
  relativePath: string,
  ext: string,
  lang: L,
  file: FileDetails
};

export type GetPageId<L extends string> = (page: unknown, options: ParsingContext<L>) => string;
