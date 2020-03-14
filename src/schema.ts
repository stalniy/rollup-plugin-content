export interface ArticleSummary {
  title: string
  author: string
  createdAt: Date
  alias?: string
  categories?: string[]
  draft?: true,
  summary?: string
}

export const defaultSchema = {
  $id: 'http://freaksidea.com/schemas/schema.json',
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'author',
    'createdAt',
    'content',
  ],
  properties: {
    title: {
      type: 'string',
    },
    author: {
      type: 'string',
    },
    createdAt: {
      format: 'date-time',
    },
    alias: {
      type: ['string', 'null'],
    },
    summary: {
      type: ['string', 'null'],
    },
    content: {
      type: 'string',
    },
    draft: {
      type: ['boolean', 'null'],
    },
    categories: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    meta: {
      type: 'object',
      properties: {
        keywords: {
          type: ['array', 'null'],
          items: {
            type: 'string',
          },
        },
        description: {
          type: ['string', 'null'],
        },
      },
    },
  },
};
