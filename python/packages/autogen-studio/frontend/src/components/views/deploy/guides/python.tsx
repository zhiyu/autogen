import React from "react";
import { Alert } from "antd";
import { CodeSection, copyToClipboard } from "./guides";
import { Download } from "lucide-react";

const PythonGuide: React.FC = () => {
  return (
    <div className="">
      <h1 className="tdext-2xl font-bold mb-6">
        在 Python 代码和 REST API 中使用
      </h1>

      <Alert
        className="mb-6"
        message="先决条件"
        description={
          <ul className="list-disc pl-4 mt-2 space-y-1">
            <li>AutoGen Studio 已安装</li>
          </ul>
        }
        type="info"
      />

      <div className="my-3 text-sm">
        {" "}
        您可以在 Python 应用程序中通过使用 TeamManager 类来复用在 AutoGen
        工作室中创建的代理团队的声明式规范。在 TeamBuilder
        中，选择一个团队配置并点击下载。
        <Download className="h-4 w-4 inline-block" />{" "}
      </div>

      {/* Basic Usage */}
      <CodeSection
        title="1. 用 Python 构建团队，以 JSON 格式导出"
        description="以下是一个在 Python 中构建团队并将其导出为 JSON 文件的示例。"
        code={`
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.ui import Console
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_agentchat.conditions import  TextMentionTermination
 
agent = AssistantAgent(
        name="weather_agent",
        model_client=OpenAIChatCompletionClient(
            model="gpt-4o-mini", 
        ), 
    ) 
agent_team = RoundRobinGroupChat([agent], termination_condition=TextMentionTermination("TERMINATE"))
config = agent_team.dump_component()
print(config.model_dump_json())`}
        onCopy={copyToClipboard}
      />

      {/* Installation Steps */}
      <div className="space-y-6">
        {/* Basic Usage */}
        <CodeSection
          title="2. 在 Python 运行团队"
          description="以下是在您的 Python 代码中使用 AutoGen Studio 中的 TeamManager 类的一个简单示例。"
          code={`
from autogenstudio.teammanager import TeamManager

# Initialize the TeamManager
manager = TeamManager()

# Run a task with a specific team configuration
result = await manager.run(
task="What is the weather in New York?",
team_config="team.json"
)
print(result)`}
          onCopy={copyToClipboard}
        />

        <CodeSection
          title="3. 以 REST API 的形式提供服务"
          description=<div>
            AutoGen Studio
            提供了一个便捷的命令行界面（CLI）命令，可为团队提供一个 REST API
            端点。
          </div>
          code={`
autogenstudio serve --team path/to/team.json --port 8084  
          `}
          onCopy={copyToClipboard}
        />
      </div>
    </div>
  );
};

export default PythonGuide;
