import React, { useState, useEffect, useContext } from "react";
import { Tabs, TabsProps } from "antd";
import {
  ChevronRight,
  RotateCcw,
  Variable,
  Settings,
  Palette,
  Brain,
} from "lucide-react";
import { useSettingsStore } from "./store";
import { SettingsSidebar } from "./sidebar";
import { appContext } from "../../../hooks/provider";
import UISettingsPanel from "./view/ui";
import { ModelConfigPanel } from "./view/modelconfig";
import { EnvironmentVariablesPanel } from "./view/environment";

export const SettingsManager: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("settingsSidebar");
      return stored !== null ? JSON.parse(stored) : true;
    }
    return true;
  });

  const { user } = useContext(appContext);
  const userId = user?.email || "";

  const { serverSettings, resetUISettings, initializeSettings, isLoading } =
    useSettingsStore();

  // Initialize settings when component mounts
  useEffect(() => {
    if (userId) {
      initializeSettings(userId);
    }
  }, [userId, initializeSettings]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("settingsSidebar", JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  // Get model component for the model config panel
  const modelComponent = serverSettings?.config.default_model_client || {
    provider: "openai",
    component_type: "model",
    label: "Default Model Client",
    description: "Default model client for this environment",
    config: {
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 1000,
    },
  };

  const tabItems: TabsProps["items"] = [
    {
      key: "ui",
      label: (
        <span className="flex items-center gap-2">
          <Palette className="w-4 h-4" />
          会话
        </span>
      ),
      children: (
        <div className="mt-4">
          <UISettingsPanel userId={userId} />
        </div>
      ),
    },
    {
      key: "model",
      label: (
        <span className="flex items-center gap-2">
          <Brain className="w-4 h-4" />
          模型
        </span>
      ),
      children: (
        <div className="mt-4">
          <ModelConfigPanel
            modelComponent={modelComponent}
            onModelUpdate={async () => {}}
          />
        </div>
      ),
    },
    {
      key: "environment",
      label: (
        <span className="flex items-center gap-2">
          <Variable className="w-4 h-4" />
          环境变量
        </span>
      ),
      children: (
        <div className="mt-4">
          <EnvironmentVariablesPanel
            serverSettings={serverSettings}
            loading={false}
            userId={userId}
            initializeSettings={initializeSettings}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="relative flex h-full w-full">
      <div
        className={`flex-1 transition-all max-w-5xl -mr-6 duration-200 ${
          isSidebarOpen ? "ml-0" : "ml-12"
        }`}
      >
        <div className="p-4 pt-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-primary font-medium">设置</span>
          </div>

          <div className="flex items-center gap-2 mb-8 text-sm">
            <span className="text-secondary">管理您的设置和偏好</span>
          </div>

          <div className="rounded-lg">
            <Tabs
              defaultActiveKey="ui"
              items={tabItems}
              // type="card"
              size="large"
              className="settings-tabs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
