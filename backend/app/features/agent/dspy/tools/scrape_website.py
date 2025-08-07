from browser_use import Browser
from typing import Any, Optional, Tuple, TYPE_CHECKING
from langchain_google_genai import ChatGoogleGenerativeAI
from browser_use import Agent as BrowserUseAgent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContext, BrowserContextConfig
from browser_use.agent.views import AgentOutput, AgentHistoryList, AgentBrain
from browser_use.browser.views import BrowserState
import os
import tempfile
from bson import ObjectId
from app.config.environment import environment

if TYPE_CHECKING:
    from app.config.dependencies import ChatServiceDep
    from app.features.chat.models import Chat

def create_scrape_website_tool(chat_service: Optional["ChatServiceDep"] = None, chat: Optional["Chat"] = None):
    """
    Factory function that creates a scrape_website tool with chat context bound.
    This allows the tool to save screenshots to the correct chat.
    """
        
    async def scrape_website(url: str, user_request: str) -> Any:
        """
        This tool scrapes websites and returns the content.
        Use this when the user asks for information from websites.

        Args:
            url: The URL of the website to scrape
            user_request: The user's request for the website

        Returns:
            The content of the website
        """
        browser: Optional[Browser] = None
        context: Optional[BrowserContext] = None
        try:
            # Sensitive site-specific credentials removed
            execution_llm, planner_llm = get_llm_config()
            task_description = construct_task_description(url, user_request)

            cookie_path = get_cookie_file_path()
            
            browser_config = BrowserConfig(headless=True)
            context_config = BrowserContextConfig(cookies_file=cookie_path)
            browser = Browser(config=browser_config)

            context = await browser.new_context(config=context_config)

            # Create callback with chat context
            async def screenshot_callback(state: BrowserState, output: AgentOutput, step_index: int) -> None:
                await new_step_callback_save_screenshot(
                    state=state,
                    output=output,
                    step_index=step_index,
                    chat_service=chat_service,
                    chat=chat
                )

            browser_use_agent = BrowserUseAgent(
                task=task_description,
                llm=execution_llm,
                planner_llm=planner_llm,
                browser_context=context,
                use_vision_for_planner=False,
                # No site-specific sensitive data passed
                register_new_step_callback=screenshot_callback,
            )
            result = await browser_use_agent.run()

            # Get all extracted content from the agent's history
            all_extracted_content = result.extracted_content()
            
            if all_extracted_content:
                # Join all extracted content and return the most substantial piece
                content = '\n\n'.join(filter(None, all_extracted_content))
                if content.strip():
                    return content
            
            # Fallback to final_result if no extracted content found
            return result.final_result()
        except Exception as e:
            print(f"Error scraping website: {e}")
            return {"error": str(e)}
        finally:
            # Close context first to allow cookies to be saved automatically
            if context:
                try:
                    await context.close()
                    print(f"Browser context closed, cookies should be saved")
                except Exception as e:
                    print(f"Warning: Failed to close context properly: {e}")
                    
            # Close browser after context
            if browser:
                try:
                    await browser.close()
                    print(f"Browser closed successfully")
                except Exception as e:
                    print(f"Warning: Failed to close browser properly: {e}")

    return scrape_website



def get_llm_config() -> Tuple[ChatGoogleGenerativeAI, ChatGoogleGenerativeAI]:
    """Initializes LLM configurations."""
    execution_llm = ChatGoogleGenerativeAI(
        model=environment.BROWSER_EXECUTION_MODEL,
        temperature=0.1
    )
    planner_llm = ChatGoogleGenerativeAI(
        model=environment.BROWSER_PLANNER_MODEL,
        temperature=0.1
    )
    return execution_llm, planner_llm

def construct_task_description(input_url: str, user_request: str) -> str:
    """Constructs the task description."""
    return (
        f"Your primary goal is to navigate to the target page ({input_url}) and then fulfill the user's request: {user_request}."
    )

def get_cookie_file_path() -> str:
    """Generates a unique cookie file path based on user_id."""
        
    cookie_id = f"user_1" # Construct the ID here
    # Use the app's data/cookies directory which is created by the Dockerfile
    base_dir = "/app/data/cookies"
    # Create the base directory if it doesn't exist
    os.makedirs(base_dir, exist_ok=True) 
    filename = f"{cookie_id}_cookies.json"
    full_path = os.path.join(base_dir, filename)
    return full_path



# --- Callback Implementations ---

async def new_step_callback_save_screenshot(
    state: BrowserState,
    output: AgentOutput,
    step_index: int,
    chat_service: Optional["ChatServiceDep"] = None,
    chat: Optional["Chat"] = None,
) -> None:
    """Callback triggered after each step, attempts to save a screenshot."""
    print(f"Callback new_step_callback_save_screenshot: Step {step_index} completed.")
    url, screenshot = state.url, state.screenshot
    current_state: AgentBrain = output.current_state

    if screenshot and chat_service and chat:
        try:
            print(f"Screenshot: {url}")
            
            # Create the screenshot data URI
            data_uri = f"data:image/png;base64,{screenshot}"

            # TODO: Uncomment when ScreenshotRepository is available
            from app.features.chat.repositories import ScreenshotRepository
            screenshot_repo = ScreenshotRepository()
            
            # Save screenshot to the chat
            created_screenshot = await screenshot_repo.create_screenshot(
                chat_id=ObjectId(chat.id), 
                image_data=data_uri,
                page_summary=current_state.page_summary,
                evaluation_previous_goal=current_state.evaluation_previous_goal,
                memory=current_state.memory,
                next_goal=current_state.next_goal
            )
            
            # Broadcast screenshot to frontend via chat_service
            await chat_service.broadcast_screenshot_event(
                chat=chat,
                screenshot=created_screenshot,
                step_index=step_index
            )
            
            print(f"Screenshot saved and broadcasted for chat {chat.id}, step {step_index}")
            
        except Exception as e:
            # Log the full error with traceback for better debugging
            print(f"Callback: Error during screenshot saving or broadcasting for chat_id {chat.id}: {e}", exc_info=True)
            pass
    else:
        if not screenshot:
            print(f"No screenshot available for step {step_index}")
        if not chat_service or not chat:
            print(f"No chat context available for screenshot saving in step {step_index}")

async def done_callback_log_history(history: AgentHistoryList) -> None:
    """Callback triggered when the browser_use_agent completes successfully."""
    print(f"Done callback!")
    # You can add more detailed history logging or processing here if needed.
    # logger.debug(f"Full agent history: {history}")

async def error_callback_decide_raise() -> bool:
    """Callback for external agent status error check."""
    print(f"Error callback!")
    # This callback is expected to return a boolean.
    # True would mean an error should be raised based on external status.
    # False means no error from this callback's perspective.
    # The specific logic depends on how browser_use intends this to be used.
    return False