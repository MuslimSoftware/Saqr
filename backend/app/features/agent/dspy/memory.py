from typing import TYPE_CHECKING, Optional, List, Dict, Any
import dspy

if TYPE_CHECKING:
    from app.config.dependencies import ChatServiceDep
    from app.features.chat.models import Chat

class ConversationSummarizer(dspy.Signature):
    """Summarize a conversation to preserve key context while reducing length."""
    conversation = dspy.InputField(desc="The conversation text to summarize")
    summary = dspy.OutputField(desc="A concise summary that preserves key information, context, and important details")

class MemoryManager:
    """Manages conversation memory with sliding window and summarization for the dspy agent."""
    
    def __init__(
        self,
        chat_service: Optional["ChatServiceDep"] = None,
        chat: Optional["Chat"] = None,
        session_token: str = None,
        max_recent_messages: int = 10,
        summary_threshold: int = 20
    ):
        self.chat_service = chat_service
        self.chat = chat
        self.session_token = session_token
        self.max_recent_messages = max_recent_messages
        self.summary_threshold = summary_threshold
        
        # Debug logging for chat object
        if self.chat:
            print(f"MemoryManager: Chat object received")
            print(f"MemoryManager: Chat ID: {self.chat.id}")
            print(f"MemoryManager: Chat ID type: {type(self.chat.id)}")
            print(f"MemoryManager: Chat object type: {type(self.chat)}")
        else:
            print("MemoryManager: No chat object provided")
        
    async def get_conversation_history(self) -> dspy.History:
        """
        Get conversation history as a dspy.History object.
        Uses summarization for long conversations and keeps recent messages detailed.
        Includes messages, tool calls, and results.
        """
        if not self.chat_service or not self.chat or not self.chat.id:
            print("Missing chat_service, chat, or chat.id")
            return dspy.History(messages=[])
            
        try:
            # Fetch more events to check if we need summarization
            all_events = await self._fetch_all_events(self.summary_threshold * 2)
            
            # If conversation is short, return all events
            if len(all_events) <= self.summary_threshold:
                history_messages = self._convert_to_history_format(all_events)
                return dspy.History(messages=history_messages)
            
            # Long conversation - use summarization
            return await self._get_summarized_history(all_events)
            
        except Exception as e:
            print(f"Error retrieving conversation history: {e}")
            print(f"Error type: {type(e)}")
            print(f"Chat ID: {self.chat.id if self.chat else None}")
            print(f"Chat ID type: {type(self.chat.id) if self.chat and self.chat.id else None}")
            print(f"Chat service available: {self.chat_service is not None}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            return dspy.History(messages=[])
    
    async def get_recent_tool_results(self, tool_name: str = None, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get recent tool execution results to help prevent duplicate tool calls.
        Note: This functionality has been disabled as MongoDB dependencies were removed.
        Redis-based chat storage is used instead.
        
        Args:
            tool_name: Specific tool name to filter by (optional)
            limit: Maximum number of tool results to return
            
        Returns:
            Empty list - tool results retrieval not available without MongoDB
        """
        print("Tool results retrieval disabled - MongoDB dependencies removed")
        return []
    
    async def _get_summarized_history(self, all_events: List[Dict[str, Any]]) -> dspy.History:
        """Get summarized older events plus recent detailed events."""
        # Split into older events to summarize and recent events to keep detailed
        older_events = all_events[:-self.max_recent_messages]
        recent_events = all_events[-self.max_recent_messages:]
        
        history_messages = []
        
        # Summarize older events if they exist
        if older_events:
            older_formatted = self._format_events_for_summary(older_events)
            summary = await self._summarize_conversation(older_formatted)
            # Add summary as a conversation entry
            history_messages.append({
                "user_input": "Previous conversation summary",
                "assistant_response": summary
            })
        
        # Add recent detailed events
        recent_history = self._convert_to_history_format(recent_events)
        history_messages.extend(recent_history)
        
        return dspy.History(messages=history_messages)
    
    async def _fetch_all_events(self, limit: int) -> List[Dict[str, Any]]:
        """
        Fetch all types of events (messages, tools, reasoning) from Redis chat storage.
        """
        if not self.chat_service or not self.chat:
            print("No chat service or chat available")
            return []
            
        try:
            # Check if we have session token
            if not self.session_token:
                print("MemoryManager: No session token provided, cannot fetch events")
                return []
                
            # Try to get Redis service and fetch messages from Redis
            from app.config.dependencies.services import get_redis_chat_service
            redis_service = get_redis_chat_service()
            
            chat_id_str = str(self.chat.id)
            print(f"MemoryManager: Fetching events for chat ID: {chat_id_str} with session token: {self.session_token}")
            
            # Convert ObjectId back to UUID for Redis operations
            try:
                redis_uuid = await redis_service._objectid_to_uuid(chat_id_str, self.session_token)
                messages = await redis_service.get_messages_for_chat(redis_uuid, self.session_token, limit, 0)
                
                # Reverse message order for proper agent history context
                # Redis returns newest-first, but agent needs oldest-first for conversation flow
                messages.reverse()
                
                # Convert Redis messages to event format expected by the agent
                events = []
                for msg in messages:
                    event = {
                        "_id": msg["id"],
                        "type": "message",
                        "author": "user" if msg["role"] == "user" else "agent",
                        "content": msg["content"],
                        "created_at": msg["timestamp"],
                        "payload": None
                    }
                    events.append(event)
                
                print(f"MemoryManager: Retrieved {len(events)} events from Redis")
                return events
                
            except Exception as e:
                print(f"MemoryManager: Error converting ObjectId or fetching from Redis: {e}")
                # Fallback - return empty for now
                return []
                
        except Exception as e:
            print(f"MemoryManager: Error fetching events: {e}")
            return []
    
    def _convert_to_history_format(self, events: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """
        Convert events to dspy.History format with user_input and assistant_response keys.
        Groups user/assistant message pairs and includes tool execution context.
        """
        history_messages = []
        current_entry = {}
        
        for event in events:
            event_type = event["type"]
            author = event["author"]
            content = event["content"]
            
            if event_type == "message":
                if author == "user":
                    # If we have a pending entry, save it first
                    if current_entry:
                        # Fill missing assistant response if needed
                        if "assistant_response" not in current_entry:
                            current_entry["assistant_response"] = ""
                        history_messages.append(current_entry)
                    
                    # Start new entry with user input
                    current_entry = {"user_input": content}
                
                elif author == "agent":
                    # Add assistant response to current entry
                    if "user_input" not in current_entry:
                        # If no user input, create a generic one
                        current_entry["user_input"] = ""
                    current_entry["assistant_response"] = content
                    
                    # Complete the entry
                    history_messages.append(current_entry)
                    current_entry = {}
            
            elif event_type == "tool":
                # Add tool execution context to the conversation
                tool_summary = self._format_tool_event_for_history(event)
                if tool_summary:
                    # Add as a system context entry
                    history_messages.append({
                        "user_input": "Tool execution context",
                        "assistant_response": tool_summary
                    })
        
        # Handle any remaining incomplete entry
        if current_entry:
            if "assistant_response" not in current_entry:
                current_entry["assistant_response"] = ""
            history_messages.append(current_entry)
        
        return history_messages
    
    def _format_tool_event_for_history(self, event: Dict[str, Any]) -> str:
        """Format tool event data for inclusion in conversation history."""
        if "tool_calls" not in event or not event["tool_calls"]:
            return ""
        
        tool_summaries = []
        for tool_call in event["tool_calls"]:
            tool_name = tool_call["tool_name"]
            status = tool_call["status"]
            
            if status == "completed" and tool_call["output_payload"]:
                # Format the tool result
                output = tool_call["output_payload"]
                if isinstance(output, dict):
                    # Try to extract meaningful data
                    if "result" in output:
                        result_summary = str(output["result"])[:200] + "..." if len(str(output["result"])) > 200 else str(output["result"])
                    elif "data" in output:
                        result_summary = str(output["data"])[:200] + "..." if len(str(output["data"])) > 200 else str(output["data"])
                    else:
                        result_summary = str(output)[:200] + "..." if len(str(output)) > 200 else str(output)
                else:
                    result_summary = str(output)[:200] + "..." if len(str(output)) > 200 else str(output)
                
                tool_summaries.append(f"Tool '{tool_name}' executed successfully. Result: {result_summary}")
            elif status == "error":
                tool_summaries.append(f"Tool '{tool_name}' failed with error")
        
        return " | ".join(tool_summaries) if tool_summaries else ""
    
    def _format_events_for_summary(self, events: List[Dict[str, Any]]) -> str:
        """Format events into a string for summarization."""
        formatted = ""
        for event in events:
            event_type = event["type"]
            author = event["author"]
            content = event["content"]
            
            if event_type == "message":
                role = author.capitalize()
                formatted += f"{role}: {content}\n"
            elif event_type == "tool":
                tool_summary = self._format_tool_event_for_history(event)
                if tool_summary:
                    formatted += f"System: {tool_summary}\n"
        
        return formatted
    
    async def _summarize_conversation(self, conversation: str) -> str:
        """Summarize a conversation using dspy with a separate context to avoid callback interference."""
        try:
            summarizer = dspy.Predict(ConversationSummarizer)
            result = await summarizer.acall(conversation=conversation)
            print(f"Summarized conversation: {result}")
            
            return result.summary
        except Exception as e:
            print(f"Error summarizing conversation: {e}")
            
            # Fallback to a simple truncation
            lines = conversation.split('\n')
            if len(lines) > 10:
                return f"Earlier conversation covered: {', '.join(lines[:5])}... [truncated]"
            return conversation 