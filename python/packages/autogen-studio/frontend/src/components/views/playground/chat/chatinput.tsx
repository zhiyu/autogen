"use client";

import {
  PaperAirplaneIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import * as React from "react";
import { IStatus } from "../../../types/app";

import { Send, LoaderCircle } from "lucide-react";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  loading: boolean;
  error: IStatus | null;
  disabled?: boolean;
}

export default function ChatInput({
  onSubmit,
  loading,
  error,
  disabled = false,
}: ChatInputProps) {
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const [previousLoading, setPreviousLoading] = React.useState(loading);
  const [text, setText] = React.useState("");

  const textAreaDefaultHeight = "64px";
  const isInputDisabled = disabled || loading;

  // Handle textarea auto-resize
  React.useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = textAreaDefaultHeight;
      const scrollHeight = textAreaRef.current.scrollHeight;
      textAreaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [text]);

  // Clear input when loading changes from true to false (meaning the response is complete)
  React.useEffect(() => {
    if (previousLoading && !loading && !error) {
      resetInput();
    }
    setPreviousLoading(loading);
  }, [loading, error, previousLoading]);

  const resetInput = () => {
    if (textAreaRef.current) {
      textAreaRef.current.value = "";
      textAreaRef.current.style.height = textAreaDefaultHeight;
      setText("");
    }
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
  };

  const handleSubmit = () => {
    if (textAreaRef.current?.value && !isInputDisabled) {
      const query = textAreaRef.current.value;
      onSubmit(query);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mt-2 w-full mb-4">
      <div
        className={`mt-2 rounded shadow-sm flex mb-1 mr-2 ${
          isInputDisabled ? "opacity-50" : ""
        }`}
      >
        <form
          className="flex-1 relative items-center"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <textarea
            id="queryInput"
            name="queryInput"
            ref={textAreaRef}
            defaultValue={""}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className={`flex items-center w-full resize-none text-gray-600 rounded border border-gray bg-white px-4 py-5 pr-16 ${
              isInputDisabled ? "cursor-not-allowed" : ""
            }`}
            style={{
              maxHeight: "120px",
              overflowY: "auto",
            }}
            placeholder="请输入..."
            disabled={isInputDisabled}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isInputDisabled}
            className={`absolute right-3 bottom-4  transition duration-300 rounded flex justify-center items-center w-12 h-8 ${
              isInputDisabled ? "cursor-not-allowed" : "hover:brightness-75"
            }`}
          >
            {loading ? (
              <LoaderCircle className="text-accent animate-spin h-6 w-6" />
            ) : (
              <Send className="h-6 w-6 text-accent" />
            )}
          </button>
        </form>
      </div>

      {error && !error.status && (
        <div className="p-2 border rounded mt-4 text-orange-500 text-sm">
          <ExclamationTriangleIcon className="h-5 text-orange-500 inline-block mr-2" />
          {error.message}
        </div>
      )}
    </div>
  );
}
