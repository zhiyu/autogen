import json
import logging
import os
from typing import Any, Awaitable, Callable, Optional


from autogenstudio.teammanager import TeamManager

import asyncio
import aiofiles
import yaml
from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_agentchat.base import TaskResult
from autogen_agentchat.messages import TextMessage, UserInputRequestedEvent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.teams import SelectorGroupChat
from autogen_core import CancellationToken
from autogen_core.models import ChatCompletionClient
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from autogen_agentchat.teams import MagenticOneGroupChat
from autogen_ext.agents.web_surfer import MultimodalWebSurfer
from autogen_ext.agents.file_surfer import FileSurfer
from autogen_ext.agents.magentic_one import MagenticOneCoderAgent
from autogen_agentchat.agents import CodeExecutorAgent
from autogen_ext.code_executors.local import LocalCommandLineCodeExecutor

from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination
from autogen_agentchat.ui import Console

logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

model_config_path = "model_config.yaml"
state_path = "team_state.json"
history_path = "team_history.json"

# Serve static files
app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
async def root():
    """Serve the chat interface HTML file."""
    return FileResponse("app_team.html")

async def get_team(
    user_input_func: Callable[[str, Optional[CancellationToken]], Awaitable[str]],
) -> SelectorGroupChat:
    # Get model client from config.
    async with aiofiles.open(model_config_path, "r") as file:
        model_config = yaml.safe_load(await file.read())
    model_client = ChatCompletionClient.load_component(model_config)

    # user_proxy = UserProxyAgent(
    #     name="user",
    #     input_func=user_input_func,  # Use the user input function.
    # )

    # # Create the team.
    # agent = AssistantAgent(
    #     name="assistant",
    #     model_client=model_client,
    #     system_message="You are a helpful assistant.",
    # )
    # yoda = AssistantAgent(
    #     name="yoda",
    #     model_client=model_client,
    #     system_message="Repeat the same message in the tone of Yoda.",
    # )

    # team = RoundRobinGroupChat(
    #     [agent, yoda, user_proxy],
    # )
    # # Load state from file.
    # if not os.path.exists(state_path):
    #     return team
    # async with aiofiles.open(state_path, "r") as file:
    #     state = json.loads(await file.read())
    # await team.load_state(state)

    # Note: you can also use  other agents in the team
    # surfer = MultimodalWebSurfer("WebSurfer",model_client=model_client)
    # file_surfer = FileSurfer( "FileSurfer",model_client=model_client)
    # coder = MagenticOneCoderAgent("Coder",model_client=model_client)
    # terminal = CodeExecutorAgent("ComputerTerminal",code_executor=LocalCommandLineCodeExecutor())
    # team = MagenticOneGroupChat([surfer, file_surfer, coder, terminal, user_proxy], model_client=model_client)


    def search_web_tool(query: str) -> str:
        if "2006-2007" in query:
            return """Here are the total points scored by Miami Heat players in the 2006-2007 season:
            Udonis Haslem: 844 points
            Dwayne Wade: 1397 points
            James Posey: 550 points
            ...
            """
        elif "2007-2008" in query:
            return "The number of total rebounds for Dwayne Wade in the Miami Heat season 2007-2008 is 214."
        elif "2008-2009" in query:
            return "The number of total rebounds for Dwayne Wade in the Miami Heat season 2008-2009 is 398."
        return "No data found."

    def percentage_change_tool(start: float, end: float) -> float:
        return ((end - start) / start) * 100

    planning_agent = AssistantAgent(
        "PlanningAgent",
        description="An agent for planning tasks, this agent should be the first to engage when given a new task.",
        model_client=model_client,
        system_message="""
        You are a planning agent.
        Your job is to break down complex tasks into smaller, manageable subtasks.
        Your team members are:
            WebSearchAgent: Searches for information
            DataAnalystAgent: Performs calculations

        You only plan and delegate tasks - you do not execute them yourself.

        When assigning tasks, use this format:
        1. <agent> : <task>

        After all tasks are complete, summarize the findings and end with "TERMINATE".
        """,
    )

    web_search_agent = AssistantAgent(
        "WebSearchAgent",
        description="An agent for searching information on the web.",
        tools=[search_web_tool],
        model_client=model_client,
        system_message="""
        You are a web search agent.
        Your only tool is search_tool - use it to find information.
        You make only one search call at a time.
        Once you have the results, you never do calculations based on them.
        """,
    )

    data_analyst_agent = AssistantAgent(
        "DataAnalystAgent",
        description="An agent for performing calculations.",
        model_client=model_client,
        tools=[percentage_change_tool],
        system_message="""
        You are a data analyst.
        Given the tasks you have been assigned, you should analyze the data and provide results using the tools provided.
        If you have not seen the data, ask for it.
        """,
    )

    text_mention_termination = TextMentionTermination("TERMINATE")
    max_messages_termination = MaxMessageTermination(max_messages=10)
    termination = text_mention_termination | max_messages_termination

    selector_prompt = """Select an agent to perform task.

    {roles}

    Current conversation context:
    {history}

    Read the above conversation, then select an agent from {participants} to perform the next task.
    Make sure the planner agent has assigned tasks before other agents start working.
    Only select one agent.
    """

    selector_prompt ="""You are in a role play game. 
    The following roles are available:
    
    {roles}
    
    Read the following conversation. Then select the next role from {participants} to play. 
    Only return the role.
    
    {history}
    
    Read the above conversation. Then select the next role from {participants} to play. Only return the role.
    """

    team = SelectorGroupChat(
        participants=[planning_agent, web_search_agent, data_analyst_agent],
        model_client=model_client,
        termination_condition=termination,
        selector_prompt=selector_prompt,
        allow_repeated_speaker=False, 
    )

    return team

async def get_history() -> list[dict[str, Any]]:
    """Get chat history from file."""
    if not os.path.exists(history_path):
        return []
    async with aiofiles.open(history_path, "r") as file:
        return json.loads(await file.read())

@app.get("/history")
async def history() -> list[dict[str, Any]]:
    try:
        return await get_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.websocket("/ws/chat")
async def chat(websocket: WebSocket):
    await websocket.accept()

    # User input function used by the team.
    async def _user_input(prompt: str, cancellation_token: CancellationToken | None) -> str:
        data = await websocket.receive_json()
        message = TextMessage.model_validate(data)
        return message.content

    try:
        while True:
            # Get user message.
            data = await websocket.receive_json()
            request = TextMessage.model_validate(data)

            try:
                # Get the team and respond to the message.
                team = await get_team(_user_input)
                history = await get_history()
                stream = team.run_stream(task=request)
                async for message in stream:
                    if isinstance(message, TaskResult):
                        continue
                    await websocket.send_json(message.model_dump())

                config = team.dump_component().model_dump()
                # save as json 
                with open("travel_team.json", "w") as f:
                    json.dump(config, f, indent=4)    
                    # if not isinstance(message, UserInputRequestedEvent):
                    #     # Don't save user input events to history.
                    #     history.append(message.model_dump())

                # # Save team state to file.
                # async with aiofiles.open(state_path, "w") as file:
                #     state = await team.save_state()
                #     await file.write(json.dumps(state))

                # # Save chat history to file.
                # async with aiofiles.open(history_path, "w") as file:
                #     await file.write(json.dumps(history))
                    
            except Exception as e:
                # Send error message to client
                error_message = {
                    "type": "error",
                    "content": f"Error: {str(e)}",
                    "source": "system"
                }
                await websocket.send_json(error_message)
                # Re-enable input after error
                await websocket.send_json({
                    "type": "UserInputRequestedEvent",
                    "content": "An error occurred. Please try again.",
                    "source": "system"
                })
                
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "content": f"Unexpected error: {str(e)}",
                "source": "system"
            })
        except:
            pass



async def team_manager(config:str):
    wm = TeamManager()
    result = wm.run_stream(task="Who was the Miami Heat player with the highest points in the 2006-2007 season, and what was the percentage change in his total rebounds between the 2007-2008 and 2008-2009 seasons?", team_config=config)
    async for response in result:
        print(response)


# Example usage
if __name__ == "__main__":

    # asyncio.run(team_manager("travel_team.json"));

    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)


