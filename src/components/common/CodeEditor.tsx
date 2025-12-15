import { languages } from "@codemirror/language-data";
import { StreamLanguage } from "@codemirror/language";
import { clike } from "@codemirror/legacy-modes/mode/clike";
import { gas } from "@codemirror/legacy-modes/mode/gas";
import { Compartment, EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup, EditorView } from "codemirror";
import type React from "react";
import { useEffect, useRef } from "react";

async function getLanguageSupport(lang: string) {
  const langLower = lang.toLowerCase();
  if (langLower === "matlab") {
    return StreamLanguage.define(clike({ name: "matlab" }));
  } else if (["asm", "nasm", "asmx", "inc", "dos", "lin", "elf", "assembly"].includes(langLower)) {
    return StreamLanguage.define(gas);
  } else {
    const language = languages.find(
      (l) => l.alias.includes(langLower) || l.name.toLowerCase() === langLower || l.extensions.includes(langLower)
    );
    if (language) {
      try {
        const languageSupport = await language.load();
        return languageSupport;
      } catch (error) {
        console.error("Failed to load language:", error);
        return null;
      }
    }
  }
  return null;
}

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


    if (lang) {
      getLanguageSupport(lang).then((languageSupport) => {
        if (viewRef.current && languageSupport) {
          viewRef.current.dispatch({
            effects: editorLanguageRef.current.reconfigure(languageSupport),
          });
        }
      }).catch((error) => {
        console.error("Error loading language support:", error);
      });
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
