"use client";

import * as React from "react";
import { RenderToolCalls } from "./rendertoolcalls";
import { Message } from "../../../types/datamodel";
interface ToolCallsProps {
  messages: Message[];
  run_id: number;
}

export default function ToolCalls(
  { messages }: ToolCallsProps,
  run_id: number
) {
  return (
    <div>
      {messages.map((msg, idx) => (
        <div key={"message_id" + idx + run_id} className="mr-2">
          {msg.config.source != "user" && (
            <RenderToolCalls
              message={msg.config}
              isLast={idx === messages.length - 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}
