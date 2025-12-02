import * as v from 'valibot';

export type Conversation = {
  title: string;
  timestamp: number;
  items: Item[];
};

type Item = InputMessage;

type InputMessage = {
  type: 'message';
  role: InputMessageRole;
  content: InputMessageContent[];
  model?: string;
};

type InputMessageRole = 'user' | 'assistant' | 'system' | 'developer';

type InputMessageContent =
  | InputTextContent
  | InputImageContent
  | InputFileContent
  | OutputTextContent;

type InputTextContent = {
  type: 'input_text';
  text: string;
};

type InputImageContent = {
  type: 'input_image';
  image_url: string;
};

type InputFileContent = {
  type: 'input_file';
  filename: string;
  file_data: string;
};

type OutputTextContent = {
  type: 'output_text';
  text: string;
};

const chatHistoryRoleSchema = v.union([
  v.literal('user'),
  v.literal('assistant'),
  v.literal('system'),
  v.literal('developer'),
]);

const chatHistoryFileSchema = v.object({
  type: v.literal('file'),
  file: v.object({
    filename: v.string(),
    data: v.object({
      content: v.string(),
    }),
  }),
});

const chatHistoryImageSchema = v.object({
  type: v.literal('image'),
  url: v.pipe(v.string(), v.url()),
});

const chatHistoryMessageSchema = v.object({
  role: chatHistoryRoleSchema,
  content: v.string(),
  files: v.optional(
    v.array(v.union([chatHistoryFileSchema, chatHistoryImageSchema])),
  ),
  model: v.optional(v.string()),
  models: v.optional(v.array(v.string())),
});

const chatHistorySchema = v.object({
  chat: v.object({
    title: v.string(),
    timestamp: v.number(),
    history: v.object({
      messages: v.record(v.string(), chatHistoryMessageSchema),
    }),
  }),
});

type ChatHistory = v.InferOutput<typeof chatHistorySchema>;

export function historiesToConversations(
  unknownHistories: unknown,
): Conversation[] {
  const schema = v.array(chatHistorySchema);

  let histories: ChatHistory[];

  try {
    histories = v.parse(schema, unknownHistories);
  } catch (e: unknown) {
    if (e instanceof v.ValiError) {
      throw Error(`Invalid chat history format: ${e.message}`);
    }
    throw e;
  }

  return histories.map((chat) => historyToConversation(chat));
}

function historyToConversation(history: ChatHistory): Conversation {
  const title = history.chat.title;
  const timestamp = Math.floor(history.chat.timestamp / 1000);

  const itemsList: Item[][] = Object.values(history.chat.history.messages).map<
    Item[]
  >((message) => {
    const totalItems: Item[] = [];

    const model = message.models?.[0] ?? message.model;

    const textItem: Item = {
      type: 'message',
      role: message.role,
      content: [
        {
          type: message.role === 'user' ? 'input_text' : 'output_text',
          text: message.content,
        },
      ],
      model,
    };

    totalItems.push(textItem);

    if (message.files) {
      const fileItems = message.files.map<Item>((file) => {
        if (file.type === 'file') {
          return {
            type: 'message',
            role: message.role,
            content: [
              {
                type: 'input_file',
                filename: file.file.filename,
                file_data: file.file.data.content,
              },
            ],
            model,
          };
        } else {
          return {
            type: 'message',
            role: message.role,
            content: [
              {
                type: 'input_image',
                image_url: file.url,
              },
            ],
            model,
          };
        }
      });

      totalItems.push(...fileItems);
    }

    return totalItems;
  });

  return {
    title,
    timestamp,
    items: itemsList.reduce<Item[]>((pre, cur) => pre.concat(cur), []),
  };
}
