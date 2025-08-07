from enum import Enum

class AgentOutputType(str, Enum):
    """Defines the types of output events the AgentService recognizes."""
    STREAM_START = "stream_start"    # First chunk of a streamed response (includes message_id)
    STREAM_CHUNK = "stream_chunk"    # Subsequent chunk of a streamed response
    STREAM_END = "stream_end"        # Indicates the end of a streamed response
    FINAL_MESSAGE = "final_message" # A complete, non-streamed message
    DELEGATION = "delegation"        # Agent is delegating to another agent
    TOOL_RESULT = "tool_result"      # The result returned by a tool call
    ERROR = "error"                  # An error occurred during processing
    # Add other types as needed (e.g., TOOL_CALL)
