from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_ext.tools.mcp import StdioServerParams, mcp_server_tools

import asyncio
import aiofiles
import yaml

async def run_mcp(config:str):
    # Get the fetch tool from mcp-server-fetch.
    fetch_mcp_server = StdioServerParams(command="uvx", args=["mcp-server-fetch"])
    tools = await mcp_server_tools(fetch_mcp_server)

    # Create an agent that can use the fetch tool.
    async with aiofiles.open(config, "r") as file:
        model_config = yaml.safe_load(await file.read())
        model_client = OpenAIChatCompletionClient.load_component(model_config)

    agent = AssistantAgent(name="fetcher", model_client=model_client, tools=tools, reflect_on_tool_use=True)  # type: ignore

    # Let the agent fetch the content of a URL and summarize it.
    result = agent.run_stream(task="Summarize the content of https://en.wikipedia.org/wiki/Seattle")
    async for response in result:
        print(response)

# Example usage
if __name__ == "__main__":

    asyncio.run(run_mcp("model_config.yaml"));
