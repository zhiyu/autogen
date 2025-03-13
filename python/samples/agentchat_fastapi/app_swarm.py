import json
import os
from typing import Any, Awaitable, Callable, Optional,Dict, List

import aiofiles
import yaml

from autogen_agentchat.agents import AssistantAgent,UserProxyAgent
from autogen_agentchat.conditions import HandoffTermination, TextMentionTermination
from autogen_agentchat.messages import HandoffMessage
from autogen_agentchat.teams import Swarm
from autogen_agentchat.ui import Console
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_core import CancellationToken
from autogen_agentchat.base import TaskResult
from autogen_agentchat.messages import TextMessage, UserInputRequestedEvent

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


import logging
from autogen_core import TRACE_LOGGER_NAME
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(TRACE_LOGGER_NAME)
logger.addHandler(logging.StreamHandler())
logger.setLevel(logging.DEBUG)

# 初始化FastAPI应用
app = FastAPI()

# 配置CORS中间件，允许跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有HTTP方法
    allow_headers=["*"],  # 允许所有请求头
)

# 定义配置文件路径
model_config_path = "model_config.yaml"  # 模型配置文件路径
state_path = "team_state.json"          # 团队状态保存路径
history_path = "team_history.json"      # 聊天历史保存路径

# 挂载静态文件服务
app.mount("/static", StaticFiles(directory="."), name="static")

# 根路由，返回聊天界面HTML文件
@app.get("/")
async def root():
    """返回聊天界面HTML文件"""
    return FileResponse("app_team.html")

def refund_flight() -> str:
    """Refund a flight"""
    return f"Flight refunded"

# 获取或初始化团队
async def get_team(
    user_input_func: Callable[[str, Optional[CancellationToken]], Awaitable[str]],
) -> Swarm:
    # 从配置文件加载模型配置
    async with aiofiles.open(model_config_path, "r") as file:
        model_config = yaml.safe_load(await file.read())
    model_client = OpenAIChatCompletionClient.load_component(model_config)
    
    travel_agent = AssistantAgent(
        "travel_agent",
        model_client=model_client,
        handoffs=["flights_refunder", "user"],
        system_message="""You are a travel agent.
        The flights_refunder is in charge of refunding flights.
        If you need information from the user, you must first send your message, then you can handoff to the user.
        Use TERMINATE when the travel planning is complete.""",
    )

    flights_refunder = AssistantAgent(
        "flights_refunder",
        model_client=model_client,
        handoffs=["travel_agent", "user"],
        tools=[refund_flight],
        system_message="""You are an agent specialized in refunding flights.
        You only need flight reference numbers to refund a flight.
        You have the ability to refund a flight using the refund_flight tool.
        If you need information from the user, you must first send your message, then you can handoff to the user.
        When the transaction is complete, handoff to the travel agent to finalize.""",
    )
    
    user_proxy = UserProxyAgent(
        name="user",
        input_func=user_input_func,  # 使用用户输入函数
    )
    termination = HandoffTermination(target="user") | TextMentionTermination("TERMINATE")
    team = Swarm([travel_agent, flights_refunder], termination_condition=termination)
    
    # # 如果存在保存的状态，则加载
    # if not os.path.exists(state_path):
    #     return team
    # async with aiofiles.open(state_path, "r") as file:
    #     state = json.loads(await file.read())
    # await team.load_state(state)
    return team

# 获取聊天历史记录
async def get_history() -> list[dict[str, Any]]:
    """从文件获取聊天历史"""
    if not os.path.exists(history_path):
        return []
    async with aiofiles.open(history_path, "r") as file:
        return json.loads(await file.read())

# 历史记录API端点
@app.get("/history")
async def history() -> list[dict[str, Any]]:
    try:
        return await get_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

# WebSocket聊天端点
@app.websocket("/ws/chat")
async def chat(websocket: WebSocket):
    await websocket.accept()

    # 处理用户输入的函数
    async def _user_input(prompt: str, cancellation_token: CancellationToken | None) -> str:
        data = await websocket.receive_json()
        message = TextMessage.model_validate(data)
        return message.content

    try:
        while True:
            # 接收用户消息
            data = await websocket.receive_json()
            request = TextMessage.model_validate(data)

            try:
                # 初始化团队并处理消息
                team = await get_team(_user_input)
                history = await get_history()
                stream = team.run_stream(task=request)
                
                # 处理并发送每条消息
                async for message in stream:
                    if isinstance(message, TaskResult):
                        continue
                    await websocket.send_json(message.model_dump())
                    if not isinstance(message, UserInputRequestedEvent):
                        # 将非输入消息保存到历史记录
                        history.append(message.model_dump())

                # 保存更新后的团队状态
                async with aiofiles.open(state_path, "w") as file:
                    state = await team.save_state()
                    await file.write(json.dumps(state))

                # 保存更新后的聊天历史
                async with aiofiles.open(history_path, "w") as file:
                    await file.write(json.dumps(history))
                    
            except Exception as e:
                # 处理错误并通知客户端
                error_message = {
                    "type": "error",
                    "content": f"错误: {str(e)}",
                    "source": "system"
                }
                await websocket.send_json(error_message)
                await websocket.send_json({
                    "type": "UserInputRequestedEvent",
                    "content": "发生错误，请重试。",
                    "source": "system"
                })
                
    except WebSocketDisconnect:
        logger.info("客户端断开连接")
    except Exception as e:
        logger.error(f"意外错误: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "content": f"意外错误: {str(e)}",
                "source": "system"
            })
        except:
            pass

# 启动FastAPI服务器
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
