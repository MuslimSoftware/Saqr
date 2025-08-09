import json
import asyncio
from datetime import datetime, date, timezone
from dspy.utils.callback import BaseCallback
from typing import TYPE_CHECKING, Optional, Dict, Any, List, Callable
from dataclasses import dataclass

if TYPE_CHECKING:
    from app.config.dependencies import ChatServiceDep
    from app.features.chat.models import Chat
    from beanie import PydanticObjectId
# Types previously from chat_event_model - now defined locally
from typing import Literal
ChatEventType = Literal['message', 'reasoning', 'tool_use', 'tool_result']
ToolStatus = Literal['pending', 'completed', 'error']

# Create constants for easier access
class ToolStatus:
    PENDING = 'pending'
    COMPLETED = 'completed' 
    ERROR = 'error'

@dataclass
class PendingOperation:
    """Represents a pending chat service operation."""
    operation_type: str
    operation_func: Callable
    description: str

class ReActCallback(BaseCallback):
    def __init__(self, chat_service: Optional["ChatServiceDep"] = None, chat: Optional["Chat"] = None):
        self.chat_service = chat_service
        self.chat = chat
        self.call_id = None

        self.reasoning_message_id = None
        self.reasoning_start_time = None
        self.reasoning_trajectory = []  # Track meaningful reasoning steps

        self.operation_queue: List[PendingOperation] = []
        self.processing_queue = False
        
        # Track tool events by tool name -> event_id (one trajectory per tool)
        self.tool_events: Dict[str, str] = {}  # tool_name -> event_id
        
        # Track call_id -> tool_name mapping for updates
        self._call_id_to_tool: Dict[str, str] = {}  # call_id -> tool_name

    # ============================================================================
    # HELPER METHODS FOR BETTER FORMATTING AND SEQUENTIAL EXECUTION
    # ============================================================================
    
    def _format_data(self, data: Any, max_length: int = 200) -> str:
        """Format data for printing with proper truncation and type information."""
        if data is None:
            return "None"
        
        # Get class name and type information
        class_name = data.__class__.__name__
        module_name = getattr(data.__class__, '__module__', 'unknown')
        type_info = f"[{module_name}.{class_name}]"
        
        # Convert to string representation
        try:
            if hasattr(data, '__dict__'):
                # For objects with attributes, show a cleaner representation
                str_data = f"{type_info} {str(data)}"
            else:
                str_data = f"{type_info} {str(data)}"
        except Exception:
            str_data = f"{type_info} <unprintable object>"
        
        # Truncate if too long
        if len(str_data) > max_length:
            return str_data[:max_length] + "..."
        return str_data
    
    async def _process_operation_queue(self):
        """Process all queued operations sequentially."""
        if self.processing_queue or not self.operation_queue:
            return
            
        self.processing_queue = True
        
        while self.operation_queue:
            operation = self.operation_queue.pop(0)
            try:
                await operation.operation_func()
            except Exception as e:
                pass
        
        self.processing_queue = False

    def _queue_operation(self, operation_type: str, operation_func: Callable, description: str):
        """Queue an operation for sequential execution."""
        operation = PendingOperation(operation_type, operation_func, description)
        self.operation_queue.append(operation)
        
        # Start processing if not already processing
        if not self.processing_queue:
            asyncio.create_task(self._process_operation_queue())

    # ============================================================================
    # CALLBACK METHODS - ORDERED BY REACT EXECUTION FLOW
    # ============================================================================

    def on_module_start(self, call_id, instance, inputs):
        if hasattr(instance, '__class__') and instance.__class__.__name__ == "ReAct":
            self.call_id = call_id
            
            async def create_reasoning_message():
                try:
                    # Generate a consistent ID for this reasoning session that will be used for all updates
                    import uuid
                    self.reasoning_message_id = str(uuid.uuid4())
                    self.reasoning_start_time = datetime.now()
                    self.reasoning_trajectory = ["Starting to process your request"]
                    
                    # Create initial reasoning message with consistent ID
                    await self.chat_service.send_reasoning_message(
                        chat=self.chat,
                        content="Thinking...",
                        trajectory=self.reasoning_trajectory,
                        status="thinking",
                        message_id=self.reasoning_message_id  # Use consistent ID
                    )
                    print(f"✅ Started reasoning session {self.reasoning_message_id}")
                except Exception as e:
                    print(f"❌ Failed to create reasoning message: {e}")
                    self.reasoning_message_id = None
            
            self._queue_operation("create_reasoning_message", create_reasoning_message, "Creating reasoning message")

    def on_adapter_parse_end(self, call_id, outputs, exception=None):
        if exception:
            pass

        if outputs.get("next_thought"):
            
            async def update_thought():
                try:
                    thought = outputs.get('next_thought')
                    # Only add significant thoughts to trajectory, not every small update
                    if thought and len(thought.strip()) > 20:  # Only add substantial thoughts
                        self.reasoning_trajectory.append(thought)
                    
                    # Update the same reasoning message with current thought as content
                    await self.chat_service.send_reasoning_message(
                        chat=self.chat,
                        content=thought if thought else "Thinking...",
                        trajectory=self.reasoning_trajectory,
                        status="thinking",
                        message_id=self.reasoning_message_id  # Use same ID to update
                    )
                    print(f"✅ Updated reasoning with thought: {thought[:50] if thought else 'None'}...")
                except Exception as e:
                    print(f"❌ Failed to update reasoning with thought: {e}")
            
            self._queue_operation("update_thought", update_thought, "Updating reasoning message with thought")

        if outputs.get("reasoning"):
            
            async def update_reasoning():
                try:
                    reasoning_content = outputs.get('reasoning')
                    # Add reasoning to trajectory as a meaningful step
                    if reasoning_content and reasoning_content not in self.reasoning_trajectory:
                        self.reasoning_trajectory.append(reasoning_content)
                    
                    # Update the same reasoning message
                    await self.chat_service.send_reasoning_message(
                        chat=self.chat,
                        content=reasoning_content if reasoning_content else "Processing...",
                        trajectory=self.reasoning_trajectory,
                        status="thinking",
                        message_id=self.reasoning_message_id  # Use same ID to update
                    )
                    print(f"✅ Updated reasoning: {reasoning_content[:50] if reasoning_content else 'None'}...")
                except Exception as e:
                    print(f"❌ Failed to update reasoning: {e}")
            
            self._queue_operation("update_reasoning", update_reasoning, "Updating reasoning message with reasoning")

        if outputs.get("assistant_response"):
            
            async def send_response():
                try:
                    await self.chat_service.send_agent_message(
                        chat=self.chat,
                        content=outputs.get('assistant_response'),
                    )
                except Exception as e:
                    pass
            
            self._queue_operation("send_response", send_response, "Sending agent message")
            self.tool_events.clear()
            self._call_id_to_tool.clear()

    def on_module_end(self, call_id, outputs, exception=None):
        if call_id == self.call_id:
            async def complete_reasoning():
                try:
                    # Calculate elapsed time
                    if self.reasoning_start_time:
                        elapsed_time = datetime.now() - self.reasoning_start_time
                        total_seconds = elapsed_time.total_seconds()
                        
                        if total_seconds < 1:
                            timing_info = f"Completed in {int(total_seconds * 1000)}ms"
                        elif total_seconds < 60:
                            timing_info = f"Completed in {total_seconds:.1f}s"
                        else:
                            minutes = int(total_seconds // 60)
                            seconds = int(total_seconds % 60)
                            timing_info = f"Completed in {minutes}m {seconds}s"
                    else:
                        timing_info = "Thinking completed"
                    
                    # Add final completion step to trajectory
                    self.reasoning_trajectory.append(timing_info)
                    
                    # Send final update to same reasoning message with complete status
                    await self.chat_service.send_reasoning_message(
                        chat=self.chat,
                        content="Thought process complete",
                        trajectory=self.reasoning_trajectory,
                        status="complete",
                        message_id=self.reasoning_message_id  # Use same ID for final update
                    )
                    print(f"✅ Reasoning session completed: {timing_info}")
                except Exception as e:
                    print(f"❌ Failed to complete reasoning: {e}")
            
            self._queue_operation("complete_reasoning", complete_reasoning, "Completing reasoning message")

    def on_tool_start(self, call_id, instance, inputs):
        tool_name = getattr(instance, 'name', str(instance))
        
        # Don't send tool invocations for the finish tool - it's internal
        if tool_name == "finish":
            return

        # Ensure input_payload is a proper dictionary
        input_payload = {}
        if isinstance(inputs, dict):
            input_payload = inputs
        elif hasattr(inputs, '__dict__'):
            input_payload = inputs.__dict__
        else:
            input_payload = {"args": str(inputs)}
        
        async def create_or_add_tool_event():
            try:
                # Always create new tool event using the existing send_tool_message method
                await self.chat_service.send_tool_message(
                    chat=self.chat,
                    tool_name=tool_name,
                    input_payload=input_payload
                )
                # Generate unique event ID for tracking
                import uuid
                self.tool_events[tool_name] = str(uuid.uuid4())
                print(f"✅ Created tool message for {tool_name}")
            except Exception as e:
                print(f"❌ FAILED: Could not create tool message for {tool_name} - {str(e)}")
                # Remove failed entry
                self.tool_events.pop(tool_name, None)
        
        self._queue_operation("create_tool_event", create_or_add_tool_event, f"Creating/updating tool message for {tool_name}")

        # Store call_id -> tool_name mapping
        self._call_id_to_tool[call_id] = tool_name

    def on_tool_end(self, call_id, outputs, exception=None):
        # Get tool name from call_id mapping
        tool_name = self._call_id_to_tool.get(call_id)
        event_id = self.tool_events.get(tool_name) if tool_name else None

        # Update the tool event if we have one
        if self.chat_service and self.chat and tool_name and tool_name != "finish":
            # Prepare output payload
            output_payload = {}
            if outputs is not None:
                if isinstance(outputs, dict):
                    output_payload = outputs
                elif hasattr(outputs, '__dict__'):
                    output_payload = outputs.__dict__
                else:
                    output_payload = {"result": str(outputs)}
            
            # Determine status
            status = ToolStatus.ERROR if exception else ToolStatus.COMPLETED
            
            async def update_tool_event():
                # Wait a bit for the tool event to be created if not available yet
                max_retries = 10
                retry_count = 0
                current_event_id = self.tool_events.get(tool_name)
                
                while not current_event_id and retry_count < max_retries:
                    print(f"   ⏳ Waiting for tool event creation... (retry {retry_count + 1}/{max_retries})")
                    await asyncio.sleep(0.1)  # Wait 100ms
                    current_event_id = self.tool_events.get(tool_name)
                    retry_count += 1
                
                # Use the new Redis/WebSocket broadcasting method
                try:
                    await self.chat_service.send_tool_update(
                        chat=self.chat,
                        tool_name=tool_name,
                        status="completed" if status == ToolStatus.COMPLETED else "error",
                        output_payload=output_payload
                    )
                    print(f"   ✅ Tool update sent for {tool_name}")
                except Exception as e:
                    print(f"   ❌ Error sending tool update for {tool_name}: {e}")
            
            self._queue_operation("update_tool_event", update_tool_event, f"Updating tool message for {tool_name}")
        
        # Clean up call_id mapping
        self._call_id_to_tool.pop(call_id, None)