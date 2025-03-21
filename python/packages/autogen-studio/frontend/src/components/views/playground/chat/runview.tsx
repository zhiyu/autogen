import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  StopCircle,
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Bot,
  SquareFunction,
} from "lucide-react";
import { Run, Message, TeamConfig, Component } from "../../../types/datamodel";
import AgentFlow from "./agentflow/agentflow";
import { RenderMessage } from "./rendermessage";
import ToolCalls from "./toolcalls";
import InputRequestView from "./inputrequest";
import { Tooltip } from "antd";
import { getRelativeTimeString, LoadingDots } from "../../atoms";
import { useSettingsStore } from "../../settings/store";

interface RunViewProps {
  run: Run;
  teamConfig?: Component<TeamConfig>;
  onInputResponse?: (response: string) => void;
  onCancel?: () => void;
  isFirstRun?: boolean;
  streamingContent?: {
    runId: number;
    content: string;
    source: string;
  } | null;
}

interface StreamingMessageProps {
  content: string;
  source: string;
}

const StreamingMessage: React.FC<StreamingMessageProps> = ({
  content,
  source,
}) => {
  const [showCursor, setShowCursor] = useState(true);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-start gap-2 p-2 rounded bg-tertiary border border-secondary transition-all duration-200 mb-6">
      <div className="p-1.5 rounded bg-light text-primary">
        <Bot size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">{source}</span>
        </div>
        <div className="text-sm text-secondary break-all">
          {content}
          {showCursor && (
            <span className="inline-block w-2 h-4 ml-1 bg-accent/70 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

export const getAgentMessages = (messages: Message[]): Message[] => {
  return messages.filter((msg) => msg.config.source !== "llm_call_event");
};

export const getLastMeaningfulMessage = (
  messages: Message[]
): Message | undefined => {
  return messages
    .filter((msg) => msg.config.source !== "llm_call_event")
    .slice(-1)[0];
};

// Type guard for message arrays
export const isAgentMessage = (message: Message): boolean => {
  return message.config.source !== "llm_call_event";
};

const RunView: React.FC<RunViewProps> = ({
  run,
  onInputResponse,
  onCancel,
  teamConfig,
  isFirstRun = false,
  streamingContent,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const threadContainerRef = useRef<HTMLDivElement | null>(null);
  const isActive = run.status === "active" || run.status === "awaiting_input";

  const { uiSettings } = useSettingsStore();
  const [isFlowVisible, setIsFlowVisible] = useState(
    uiSettings.show_agent_flow_by_default ?? true
  );

  const [isFunctionCallsVisible, setIsFunctionCallsVisible] = useState(false);

  const visibleMessages = useMemo(() => {
    if (uiSettings.show_llm_call_events) {
      console.log("uiSettings.show_llm_call_events:" + true);
      return run.messages;
    }
    return run.messages.filter((msg) => msg.config.source !== "llm_call_event");
  }, [run.messages, uiSettings.show_llm_call_events]);

  // Replace existing scroll effect with this simpler one
  useEffect(() => {
    setTimeout(() => {
      if (threadContainerRef.current) {
        threadContainerRef.current.scrollTo({
          top: threadContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 450);
  }, [run.messages, streamingContent]);
  const calculateThreadTokens = (messages: Message[]) => {
    // console.log("messages", messages);
    return messages.reduce((total, msg) => {
      if (!msg.config?.models_usage) return total;
      return (
        total +
        (msg.config.models_usage.prompt_tokens || 0) +
        (msg.config.models_usage.completion_tokens || 0)
      );
    }, 0);
  };

  const getStatusIcon = (status: Run["status"]) => {
    switch (status) {
      case "active":
        return (
          <div className="inline-block mr-1">
            <Loader2
              size={20}
              className="inline-block mr-1 text-accent animate-spin"
            />
            <span className="inline-block mr-2 ml-1">任务执行中 ...</span>
          </div>
        );
      case "awaiting_input":
        return (
          <div className="text-sm mb-2">
            <MessageSquare
              size={20}
              className="inline-block mr-2 text-accent"
            />
            <span className="inline-block mr-2">Waiting for your input </span>
            <LoadingDots size={8} />
          </div>
        );
      case "complete":
        return (
          <div className="text-sm mb-2">
            <CheckCircle size={20} className="inline-block mr-2 text-accent" />
            任务完成
          </div>
        );
      case "error":
        return (
          <div className="text-sm mb-2">
            <AlertTriangle
              size={20}
              className="inline-block mr-2 text-red-500"
            />
            {run.error_message || "An error occurred"}
          </div>
        );
      case "stopped":
        return (
          <div className="text-sm mb-2">
            <StopCircle size={20} className="inline-block mr-2 text-red-500" />
            任务已终止
          </div>
        );
      default:
        return null;
    }
  };

  const lastResultMessage = run.team_result?.task_result.messages.slice(-1)[0];
  const lastMessage = getLastMeaningfulMessage(visibleMessages);

  return (
    <div className="space-y-6 gap-8 mr-2 ">
      {/* Run Header */}
      <div className={`${isFirstRun ? "mb-2" : "mt-4"} mb-4 pb-2 pt-2`}>
        <div className="text-xs text-secondary flex flex-row-reverse text-right">
          <Tooltip
            title={
              <div className="text-xs">
                <div>ID: {run.id}</div>
                <div>Created: {new Date(run.created_at).toLocaleString()}</div>
                <div>Status: {run.status}</div>
              </div>
            }
          >
            <span className="cursor-help">
              {getRelativeTimeString(run?.created_at || "")}{" "}
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-1">
        <div>
          {/* User Message */}
          <div className="flex flex-col items-end w-full">
            <div className="w-full">
              <RenderMessage message={run.task} isLast={false} />
            </div>
          </div>

          {/* Team Response */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded bg-secondary text-primary">
                <Bot size={20} />
              </div>
              <span className="text-sm font-medium text-primary">
                {teamConfig && teamConfig.label}团队
              </span>
            </div>

            <div className="w-full">
              {/* Main Response Container */}
              <div className="mt-2 border border-secondary p-4 rounded">
                <div className="flex justify-between items-center">
                  <div className="text-primary">
                    {getStatusIcon(run.status)}
                  </div>

                  {/* Cancel Button - More prominent placement */}
                  {isActive && onCancel && (
                    <button
                      onClick={onCancel}
                      className="px-2 text-xs py-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors flex items-center gap-1"
                    >
                      <StopCircle size={14} />
                      取消
                    </button>
                  )}
                </div>

                {/* Final Response */}
                {run.status !== "awaiting_input" && run.status !== "active" && (
                  <div className="text-sm break-all">
                    <div className="text-xs bg-tertiary mb-4 text-secondary border-secondary mt-2 bdorder rounded p-2">
                      终止原因: {run.team_result?.task_result?.stop_reason}
                    </div>

                    {lastMessage ? (
                      <RenderMessage
                        message={lastMessage.config}
                        isLast={true}
                      />
                    ) : (
                      <>
                        {lastResultMessage && (
                          <RenderMessage message={lastResultMessage} />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Thread Section */}
              {visibleMessages.length > 0 && (
                <div className="mt-4 border-secondary rounded-b">
                  <div className="flex relative">
                    <div className="flex items-center text-sm font-semibold">
                      任务执行过程
                      <div className="ml-4 text-xs text-secondary">
                        消耗
                        {calculateThreadTokens(visibleMessages)} tokens
                      </div>
                    </div>
                    <div className="z-50 absolute right-0 top-0 rounded">
                      <Tooltip title="Show message flow graph" className="mr-2">
                        <button
                          onClick={() => {
                            if (!isFlowVisible) {
                              setIsFlowVisible(true);
                              setIsFunctionCallsVisible(false);
                            } else {
                              setIsFlowVisible(false);
                              setIsFunctionCallsVisible(true);
                            }
                          }}
                          className={`p-1 rounded-md  hover:bg-secondary transition-colors ${
                            isFlowVisible ? "bg-tertiary" : ""
                          }`}
                        >
                          <Workflow strokeWidth={1.5} size={22} />
                        </button>
                      </Tooltip>
                      <Tooltip title="Show function calls">
                        <button
                          onClick={() => {
                            if (isFlowVisible) {
                              setIsFlowVisible(false);
                              setIsFunctionCallsVisible(true);
                            } else {
                              setIsFlowVisible(true);
                              setIsFunctionCallsVisible(false);
                            }
                          }}
                          className={`p-1 rounded-md  hover:bg-secondary transition-colors ${
                            isFunctionCallsVisible ? "bg-tertiary" : ""
                          }`}
                        >
                          <SquareFunction strokeWidth={1.5} size={22} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="relative grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                      {/* Messages Thread */}
                      <div
                        ref={threadContainerRef}
                        className="flex-1 scroll-smooth scroll pb-2 relative"
                      >
                        <div
                          id="scroll-gradient"
                          className="scroll-gradient h-8"
                        >
                          <span className="inline-block h-6"></span>{" "}
                        </div>
                        {visibleMessages.map((msg, idx) => (
                          <div
                            key={"message_id" + idx + run.id}
                            className="mr-2"
                          >
                            {msg.config.source != "user" && (
                              <RenderMessage
                                message={msg.config}
                                isLast={idx === visibleMessages.length - 1}
                              />
                            )}
                          </div>
                        ))}
                        {streamingContent &&
                          streamingContent.runId === run.id && (
                            <div className="mr-2 mb-10">
                              <StreamingMessage
                                content={streamingContent.content}
                                source={streamingContent.source}
                              />
                            </div>
                          )}

                        {/* Input Request UI */}
                        {run.status === "awaiting_input" && onInputResponse && (
                          <div className="mt-4 mr-2">
                            <InputRequestView
                              prompt="Type your response..."
                              onSubmit={onInputResponse}
                            />
                          </div>
                        )}
                        <div className="text-primary mt-2 ml-4">
                          <div className="w-4 h-4 inline-block  border-secondary rounded-bl-lg border-l-[1px] border-b-[1px]"></div>{" "}
                          <div className="inline-block ">
                            {getStatusIcon(run.status)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Agent Flow and function calls */}
                    <div className="relative col-span-1">
                      <div id="scroll-gradient" className="scroll-gradient h-8">
                        <span className="inline-block h-6"></span>{" "}
                      </div>
                      {isFlowVisible && teamConfig && (
                        <AgentFlow
                          teamConfig={teamConfig}
                          run={{
                            ...run,
                            messages: getAgentMessages(visibleMessages),
                          }}
                        />
                      )}
                      {isFunctionCallsVisible && !isFlowVisible && (
                        <ToolCalls messages={visibleMessages} run_id={run.id} />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunView;
