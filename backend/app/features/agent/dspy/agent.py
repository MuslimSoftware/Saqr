import dspy
from app.features.agent.dspy.callback import ReActCallback
from app.features.agent.dspy.memory import MemoryManager
from app.config.environment import environment
from app.features.agent.dspy.tools.scrape_website import create_scrape_website_tool
from app.features.agent.graph.tools import query_sql_db, search_web
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.config.dependencies import ChatServiceDep
    from app.features.chat.models import Chat

class AgentSignature(dspy.Signature):
    """You are Saqr, a friendly movie rental assistant that helps users explore the Sakila movie database. 
    
    You have access to these tools:
    1) query_sql_db: Query the Sakila MySQL database containing movies, actors, categories, customers, rentals, and inventory
    2) scrape_website: Extract information from websites (for additional movie details if needed)
    3) finish: Call this when you have gathered all needed information and want to provide your final answer
    
    ABOUT THE SAKILA DATABASE:
    The Sakila database contains realistic movie rental data including:
    - Films: titles, descriptions, ratings, categories, rental rates
    - Actors: names and their filmographies  
    - Categories: movie genres like Action, Comedy, Drama, etc.
    - Customers: rental customer information
    - Rentals: transaction history and rental patterns
    - Inventory: available copies of films at different stores
    
    YOUR ROLE:
    - Help users find movies, actors, and rental information
    - Answer questions about movie data in a friendly, conversational way
    - Provide recommendations based on categories, ratings, or rental popularity
    - Explain rental patterns and customer preferences
    
    IMPORTANT TOOL USAGE RULES:
    - If a tool call results in an error, only re-try once. If it fails again, you need to summarize the information you have gathered so far and ask the user if they want to continue with the task.
    - Use tools to gather information, then provide your response in assistant_response
    - Only use the finish tool with your final answer when you're completely done
    - Each tool has specific parameter names - use exactly what's documented
    - AVOID DUPLICATE TOOL CALLS: Check the recent_tool_results field to see if you already have the data you need
    - Limit the total number of tool calls to 5, if you need to call more tools, you need to summarize the information you have gathered so far and ask the user if they want to continue with the task.
    - If recent tool results contain the information you need, use that data instead of calling the tool again.
    - When answering questions about tool calls, don't include the tool results in your response.
    - Always give the user a report in simple markdown format of the information you have gathered in a clean and readable format. Don't use complex markdowns like tables just stick to simple headers and lists.
    
    CONVERSATION HISTORY:
    You have access to conversation history in the 'history' field. Use this to:
    - Remember what you discussed before with the user
    - Refer back to previous questions and answers
    - Maintain context across the conversation
    - Answer questions about what was discussed earlier
    
    RECENT TOOL RESULTS:
    The 'recent_tool_results' field contains results from recently executed tools.
    - Review this data first before deciding to use tools
    - If you find relevant data from recent tool executions, use it instead of re-running the same tools
    - This helps avoid unnecessary duplicate calls and improves efficiency
    - Recent results include tool name, inputs, outputs, and completion time"""
    
    user_input: str = dspy.InputField(desc="The user's current question or request")
    history: dspy.History = dspy.InputField(desc="Previous conversation history with user_input and assistant_response pairs. Use this to maintain context and answer questions about past discussions.")
    recent_tool_results: str = dspy.InputField(desc="Recent tool execution results to avoid duplicate calls. Check this first before using tools - if you find relevant data here, use it instead of calling tools again.")
    assistant_response: str = dspy.OutputField(desc="Your response to the user, taking into account both their current question and the conversation history")

def finish(final_answer: str):
    """
    Call this tool ONLY when you have completely finished gathering all information and are ready to provide your final answer to the user.
    
    This tool signals that you are done with the task. Do not call this tool if you still need to gather more information or use other tools.
    
    Args:
        final_answer: Your complete final response to the user's question
    
    Returns:
        The final answer string
    
    Example usage:
        finish("Based on my analysis of the booking data, here are the key findings...")
    """
    print(f"Finished: {final_answer}")
    return final_answer

async def prompt(
    user_input: str, 
    chat_service: Optional["ChatServiceDep"] = None, 
    chat: Optional["Chat"] = None,
    session_token: str = None,
    max_history_messages: int = 10,
    summary_threshold: int = 20
):
    """
    Main agent prompt function with conversation history and summarization.
    
    Args:
        user_input: The user's current input/question
        chat_service: Chat service dependency for accessing conversation history
        chat: Current chat context
        max_history_messages: Maximum number of recent messages to keep detailed
        summary_threshold: Number of messages before summarization kicks in
    """
    # Configure DSPy with explicit adapter settings for better parsing
    lm = dspy.LM(
        model="openai/gpt-4o", 
        api_key=environment.OPENAI_API_KEY,
        # Add explicit configuration to help with parsing
        max_tokens=4000,
        temperature=0.1
    )
    
    dspy.configure(lm=lm)
    
    # Get conversation history with summarization support
    memory_manager = MemoryManager(
        chat_service=chat_service,
        chat=chat,
        session_token=session_token,
        max_recent_messages=max_history_messages,
        summary_threshold=summary_threshold
    )
    
    history = await memory_manager.get_conversation_history()

    # Get recent tool results to avoid duplicate calls
    recent_tool_results = await memory_manager.get_recent_tool_results(limit=10)
    
    # Format tool results for the agent
    formatted_tool_results = "No recent tool results available."
    if recent_tool_results:
        tool_summaries = []
        for result in recent_tool_results:
            tool_name = result["tool_name"]
            inputs = result["input_payload"]
            outputs = result["output_payload"]
            completed_at = result["completed_at"]
            
            # Create a summary of the tool result
            input_summary = str(inputs)[:100] + "..." if len(str(inputs)) > 100 else str(inputs)
            output_summary = str(outputs)[:200] + "..." if len(str(outputs)) > 200 else str(outputs)
            
            tool_summaries.append(
                f"Tool: {tool_name}\n"
                f"  Input: {input_summary}\n"
                f"  Output: {output_summary}\n"
                f"  Completed: {completed_at}\n"
            )
        
        formatted_tool_results = "\n".join(tool_summaries)

    callback = ReActCallback(chat_service=chat_service, chat=chat)
    dspy.settings.callbacks = [callback]
    
    # Create the scrape_website tool with chat context
    scrape_website_tool = create_scrape_website_tool(chat_service=chat_service, chat=chat)
    
    # Create ReAct instance with tools and our signature, using more explicit configuration
    try:
        qa = dspy.ReAct(
            AgentSignature, 
            tools=[
                query_sql_db,
                scrape_website_tool,
                finish,
            ],
            max_iters=10  # Limit iterations to prevent infinite loops
        )

        response = await qa.acall(
            user_input=user_input, 
            history=history, 
            recent_tool_results=formatted_tool_results
        )
        return response.assistant_response
        
    except Exception as e:
        error_message = f"DSPy ReAct parsing error: {str(e)}"
        print(error_message)
        
        pass
        
        # Re-raise the exception so it gets handled properly by the calling code
        raise e