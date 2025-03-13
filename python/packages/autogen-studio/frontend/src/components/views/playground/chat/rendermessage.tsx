import React, { useState, useRef } from "react";
import { User, UserRound, Bot, DraftingCompass, Bug } from "lucide-react";
import {
  AgentMessageConfig,
  FunctionCall,
  FunctionExecutionResult,
  ImageContent,
} from "../../../types/datamodel";
import { ClickableImage, TruncatableText } from "../../atoms";
import LLMLogRenderer from "./logrenderer";

const TEXT_THRESHOLD = 400;
const JSON_THRESHOLD = 800;

// Helper function to get image source from either format
const getImageSource = (item: ImageContent): string => {
  if (item.url) {
    return item.url;
  }
  if (item.data) {
    // Assume PNG if no type specified - we can enhance this later if needed
    return `data:image/png;base64,${item.data}`;
  }
  // Fallback placeholder if neither url nor data is present
  return "/api/placeholder/400/320";
};

const RenderMultiModal: React.FC<{ content: (string | ImageContent)[] }> = ({
  content,
}) => (
  <div className="space-y-2">
    {content.map((item, index) =>
      typeof item === "string" ? (
        <TruncatableText key={index} content={item} className="break-all" />
      ) : (
        <ClickableImage
          key={index}
          src={getImageSource(item)}
          alt={item.alt || "Image"}
          className="w-full h-auto rounded border border-secondary"
        />
      )
    )}
  </div>
);
const RenderToolCall: React.FC<{ content: FunctionCall[] }> = ({ content }) => (
  <div className="space-y-2">
    {content.map((call) => (
      <div key={call.id} className="relative ml-4 pl-4 rounded">
        <div className="absolute top-0 -left-0.5 w-[1px] bg-secondary h-full rounded"></div>
        <div className="font-medium">
          <DraftingCompass className="w-4 h-4 text-accent inline-block mr-1.5 -mt-0.5" />{" "}
          调用工具 {call.name}
        </div>
        <TruncatableText
          content={call.arguments}
          isJson={true}
          className="text-sm mt-1 bg-secondary p-2 rounded"
        />
      </div>
    ))}
  </div>
);

const RenderToolResult: React.FC<{ content: FunctionExecutionResult[] }> = ({
  content,
}) => (
  <div className="space-y-2">
    {content.map((result) => (
      <div key={result.call_id} className="rounded ml-4 pl-4 relative">
        <div className="absolute top-0 -left-0.5 w-[1px] bg-secondary h-full rounded"></div>
        <div className="font-medium">
          <DraftingCompass className="w-4 text-accent h-4 inline-block mr-1.5 -mt-0.5" />{" "}
          工具调用结果
        </div>

        <TruncatableText
          content={result.content}
          className="text-sm mt-1 bg-secondary p-2 border border-secondary rounded scroll overflow-x-scroll"
        />
      </div>
    ))}
  </div>
);

export const messageUtils = {
  isToolCallContent(content: unknown): content is FunctionCall[] {
    if (!Array.isArray(content)) return false;
    return content.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "arguments" in item &&
        "name" in item
    );
  },

  isMultiModalContent(content: unknown): content is (string | ImageContent)[] {
    if (!Array.isArray(content)) return false;
    return content.every(
      (item) =>
        typeof item === "string" ||
        (typeof item === "object" &&
          item !== null &&
          ("url" in item || "data" in item))
    );
  },

  isFunctionExecutionResult(
    content: unknown
  ): content is FunctionExecutionResult[] {
    if (!Array.isArray(content)) return false;
    return content.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "call_id" in item &&
        "content" in item
    );
  },

  isUser(source: string): boolean {
    return source === "user";
  },
};

interface MessageProps {
  message: AgentMessageConfig;
  isLast?: boolean;
  className?: string;
}

export const RenderMessage: React.FC<MessageProps> = ({
  message,
  isLast = false,
  className = "",
}) => {
  if (!message) return null;
  const isUser = messageUtils.isUser(message.source);
  const content = message.content;
  const isLLMEventMessage = message.source === "llm_call_event";

  return (
    <div
      className={`relative group ${!isLast ? "mb-2" : ""} ${className} ${
        isLLMEventMessage ? "border-accent" : ""
      } ${isUser ? "flex flex-row-reverse" : ""}`}
    >
      <div
        className={`
        flex items-start gap-2 rounded
        ${isUser ? "flex-row-reverse items-center" : "flex-col "}
        transition-all duration-200
      `}
      >
        <div
          className={`
          flex items-center 
          ${isUser ? "text-accent" : "text-primary"}
        `}
        >
          <div className="p-1.5 rounded bg-light ">
            {isUser ? (
              <UserRound size={18} />
            ) : message.source == "llm_call_event" ? (
              <Bug size={18} />
            ) : (
              <Bot size={18} />
            )}
          </div>

          <span className="ml-2 text-sm font-semibold text-primary">
            {!isUser && message.source}
          </span>
        </div>

        <div className="flex flex-col w-full">
          <div
            className={`text-sm text-secondary ${isUser ? "text-right" : ""}`}
          >
            {messageUtils.isToolCallContent(content) ? (
              <RenderToolCall content={content} />
            ) : messageUtils.isMultiModalContent(content) ? (
              <RenderMultiModal content={content} />
            ) : messageUtils.isFunctionExecutionResult(content) ? (
              <RenderToolResult content={content} />
            ) : message.source === "llm_call_event" ? (
              <LLMLogRenderer content={String(content)} />
            ) : (
              <div className="ml-4">
                <div
                  className={`${
                    isUser ? "" : "border-secondary border-l-[1px]"
                  } pl-5`}
                >
                  <TruncatableText
                    content={String(content)}
                    className="break-all"
                  />
                </div>
              </div>
            )}
            {message.models_usage && (
              <div className="text-xs text-secondary mt-2 ml-4">
                {(message.models_usage.prompt_tokens || 0) +
                  (message.models_usage.completion_tokens || 0)}{" "}
                tokens
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
