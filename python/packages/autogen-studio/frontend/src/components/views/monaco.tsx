import React, { useState } from "react";
import Editor from "@monaco-editor/react";

export const MonacoEditor = ({
  value,
  editorRef,
  language,
  onChange,
  minimap = true,
  className,
  options = {
    wordWrap: "on",
    wrappingIndent: "indent",
    wrappingStrategy: "advanced",
    minimap: {
      enabled: false,
    },
    automaticLayout: true,
  },
}: {
  value: string;
  onChange?: (value: string) => void;
  editorRef: any;
  language: string;
  minimap?: boolean;
  className?: string;
  options?: any;
}) => {
  const [isEditorReady, setIsEditorReady] = useState(false);
  const onEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    setIsEditorReady(true);
  };
  return (
    <Editor
      className={`h-full rounded ${className}`}
      defaultLanguage={language}
      defaultValue={value}
      value={value}
      onChange={(value: string | undefined) => {
        if (onChange && value) {
          onChange(value);
        }
      }}
      onMount={onEditorDidMount}
      options={options}
    />
  );
};
