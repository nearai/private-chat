import { languages } from "@codemirror/language-data";
import { Compartment, EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup, EditorView } from "codemirror";
import type React from "react";
import { useEffect, useRef } from "react";

interface CodeEditorProps {
  value: string;
  lang?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, lang = "" }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const editorThemeRef = useRef(new Compartment());
  const editorLanguageRef = useRef(new Compartment());

  // Initialize read-only editor
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const isDarkMode = document.documentElement.classList.contains("dark");

    const extensions = [
      // Read-only configuration
      basicSetup,
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      // Prevent any focus-related scroll behavior
      EditorView.contentAttributes.of({ tabindex: "-1" }),
      // Theme support
      editorThemeRef.current.of(isDarkMode ? [oneDark] : []),
      editorLanguageRef.current.of([]),
    ];

    viewRef.current = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions,
      }),
      parent: editorRef.current,
    });

    // Load language for syntax highlighting
    if (lang) {
      const language = languages.find(
        (l) => l.alias.includes(lang.toLowerCase()) || l.name.toLowerCase() === lang.toLowerCase()
      );

      if (language) {
        language
          .load()
          .then((languageSupport) => {
            if (viewRef.current && languageSupport) {
              viewRef.current.dispatch({
                effects: editorLanguageRef.current.reconfigure(languageSupport),
              });
            }
          })
          .catch((error) => {
            console.error("Failed to load language:", error);
          });
      }
    }

    // Dark mode observer
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          const isDark = document.documentElement.classList.contains("dark");
          if (viewRef.current) {
            viewRef.current.dispatch({
              effects: editorThemeRef.current.reconfigure(isDark ? [oneDark] : []),
            });
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [value, lang]);

  return <div ref={editorRef} className="h-full w-full text-sm" />;
};

export default CodeEditor;
