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

const RenderMultiModal: React.FC<{
  content: (string | ImageContent)[];
  thumbnail?: boolean;
}> = ({ content, thumbnail = false }) => (
  <div className="space-y-2">
    {content.map((item, index) =>
      typeof item === "string" ? (
        <TruncatableText key={index} content={item} className="break-all" />
      ) : (
        <ClickableImage
          key={index}
          src={getImageSource(item)}
          alt={item.alt || "Image"}
          className={` h-auto rounded border border-secondary ${
            thumbnail ? "w-24 h-24 " : " w-full "
          }`}
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

  isNestedMessageContent(content: unknown): content is AgentMessageConfig[] {
    if (!Array.isArray(content)) return false;
    return content.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "source" in item &&
        "content" in item &&
        "type" in item
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

  isMessageArray(
    message: AgentMessageConfig | AgentMessageConfig[]
  ): message is AgentMessageConfig[] {
    return Array.isArray(message);
  },
};

interface MessageProps {
  message: AgentMessageConfig | AgentMessageConfig[];
  isLast?: boolean;
  className?: string;
}

export const RenderNestedMessages: React.FC<{
  content: AgentMessageConfig[];
}> = ({ content }) => (
  <div className="space-y-4">
    {content.map((item, index) => (
      <div
        key={index}
        className={`${
          index > 0 ? "bordper border-secondary rounded   bg-secondary/30" : ""
        }`}
      >
        {typeof item.content === "string" ? (
          <TruncatableText
            content={item.content}
            className={`break-all ${index === 0 ? "text-base" : "text-sm"}`}
          />
        ) : messageUtils.isMultiModalContent(item.content) ? (
          <RenderMultiModal content={item.content} thumbnail />
        ) : (
          <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(item.content, null, 2)}
          </pre>
        )}
      </div>
    ))}
  </div>
);

export const RenderMessage: React.FC<MessageProps> = ({
  message,
  isLast = false,
  className = "",
}) => {
  if (!message) return null;

  // If message is an array, render the first message or return null
  if (messageUtils.isMessageArray(message)) {
    return message.length > 0 ? (
      <RenderMessage
        message={message[0]}
        isLast={isLast}
        className={className}
      />
    ) : null;
  }

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
              <UserRound size={20} />
            ) : message.source == "llm_call_event" ? (
              <Bug size={16} />
            ) : (
              <Bot size={16} />
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
            ) : messageUtils.isFunctionExecutionResult(content) ? (
              <RenderToolResult content={content} />
            ) : messageUtils.isMultiModalContent(content) ? (
              <RenderMultiModal content={content} />
            ) : message.source === "llm_call_event" ? (
              <div className="ml-4 pl-5 border-secondary border-l-[1px]">
                <LLMLogRenderer content={String(content)} />
              </div>
            ) : (
              <div className="ml-4">
                <div
                  className={`${
                    isUser
                      ? "bg-tertiary rounded p-2"
                      : "border-secondary border-l-[1px]"
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
