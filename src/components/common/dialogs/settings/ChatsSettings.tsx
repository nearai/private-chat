import { ArrowUpOnSquareIcon } from "@heroicons/react/24/solid";

const ChatsSettings = () => {
  return (
    <div className="flex h-full flex-col text-sm">
      <ul className="flex flex-col gap-2">
        <li className="flex w-full cursor-pointer items-center rounded-md px-3.5 py-2 transition hover:bg-gray-200 dark:hover:bg-gray-800">
          <ArrowUpOnSquareIcon className="h-4 w-4" />
          <span className="ml-2">Import Chats</span>
        </li>
      </ul>
    </div>
  );
};

export default ChatsSettings;
