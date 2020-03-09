declare module "*.summary" {
  type AssetURL = string;
  type Pages = {
    [lang: string]: {
      [name: string]: AssetURL
    }
  };
  type Summaries = {
    [lang: string]: AssetURL
  };

  export const pages: Pages;
  export const summaries: Summaries;
}

declare module "*.pages" {
  type AssetURL = string;
  type Pages = {
    [lang: string]: {
      [name: string]: AssetURL
    }
  };

  export const pages: Pages;
}
