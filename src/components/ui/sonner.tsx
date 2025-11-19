import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "../common/ThemeProvider";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  return <Sonner theme={theme} className="toaster group" position="top-right" richColors {...props} />;
};

export { Toaster };
