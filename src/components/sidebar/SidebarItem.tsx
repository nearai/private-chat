import { cn } from "@/lib";

type SidebarItemProps = {
  title: string;
  isSelected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
};

const SidebarItem = ({ title, isSelected, onClick, icon }: SidebarItemProps) => {
  return (
    <div className="group relative w-full">
      <button
        className={cn(
          "flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-2 py-1.5 text-left",
          isSelected && "bg-secondary/30"
        )}
        onClick={onClick}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {icon && <span className="shrink-0">{icon}</span>}
          <div dir="auto" className="h-5 w-full overflow-hidden truncate text-sm">
            {title}
          </div>
        </div>
      </button>
    </div>
  );
};

export default SidebarItem;
