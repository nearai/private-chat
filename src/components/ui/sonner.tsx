import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "../common/ThemeProvider";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  const lowerCaseTheme = theme.toLowerCase();
  return <Sonner theme={lowerCaseTheme as 'dark' | 'light' | 'system'} className="toaster group" position="top-right" richColors {...props} />;
};

export { Toaster };
