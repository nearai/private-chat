import { useMemo } from "react";
import { marked } from "marked";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MarkdownTokens from "@/components/chat/messages/MarkdownTokens";
import markedExtension from "@/lib/utils/extension";
import markedKatexExtension from "@/lib/utils/marked-katex-extension";
import exportChatsImage from "@/assets/images/export-chats.png";
import importChatsImage from "@/assets/images/import-chats.png";
import importedChatImage from "@/assets/images/imported-chat.png";
import importedChatsImage from "@/assets/images/imported-chats.png";

interface ImportGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportGuideDialog = ({ isOpen, onClose }: ImportGuideDialogProps) => {
  const importGuideMarkdown = useMemo(() => {
    return `
If you're a user of the old version of Private Chat, you can follow these steps to migrate your chat history to the new Private Chat.

#### Step 1: Export Chats from Legacy Private Chat

1. **Login** to [https://private-chat-legacy.near.ai](https://private-chat-legacy.near.ai).
2. Once logged in, click on your user avatar in the bottom left corner and select **Settings** option from the dropdown menu.
3. Go to the **Chats** tab in the popup Settings dialog.
4. Click on **Export Chats** button to download your chat history as a JSON file.
5. Wait a while for the export to complete. This may take some time depending on the size of your chat history.

![Export Chats](${exportChatsImage})

---

#### Step 2: Import Chats in New Private Chat

1. Navigate to [https://private.near.ai](https://private.near.ai). You should have already logged in as you can read this guide :)
2. Click on your user avatar in the bottom left corner and select **Settings** option from the dropdown menu.
3. Go to the **Chats** tab in the popup Settings dialog.
4. Click on **Import Chats** button and select the JSON file you exported in Step 1. ![Import Chats](${importChatsImage})
5. Wait until the import is completed - you'll see your conversations imported in the left sidebar. ![Imported Chats](${importedChatsImage})
6. The imported conversations will be tagged as "Imported". ![Imported Chat](${importedChatImage})

---

#### Notes:

1. The import process may take a few moments depending on the size of your chat history.
2. If your chat history contains conversations with images or files, they will not be imported in this version due to some limitations. This will be supported in the future.
`;
  }, []);

  const tokens = useMemo(() => {
    marked.use(markedKatexExtension());
    marked.use(markedExtension());
    return marked.lexer(importGuideMarkdown);
  }, [importGuideMarkdown]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Chat History in Two Steps</DialogTitle>
        </DialogHeader>
        <div className="markdown-prose w-full">
          <div className="markdown-content [&_img]:mx-auto [&_img]:max-w-md [&_img]:rounded-lg [&_img]:shadow-md">
            <MarkdownTokens tokens={tokens} id="import-guide" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportGuideDialog;
