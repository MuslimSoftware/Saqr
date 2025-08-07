from typing import List, Optional
from beanie import PydanticObjectId
from datetime import datetime

from ..models import Screenshot

class ScreenshotRepository:
    """Handles database operations for Screenshot model."""

    async def create_screenshot(self, chat_id: PydanticObjectId, image_data: str, page_summary: Optional[str] = None, evaluation_previous_goal: Optional[str] = None, memory: Optional[str] = None, next_goal: Optional[str] = None) -> Screenshot:
        """Creates and saves a new Screenshot document."""
        new_screenshot = Screenshot(
            chat_id=chat_id,
            image_data=image_data,
            page_summary=page_summary,
            evaluation_previous_goal=evaluation_previous_goal,
            memory=memory,
            next_goal=next_goal
        )
        await new_screenshot.create()
        return new_screenshot

    async def count_screenshots_by_chat_id(self, chat_id: PydanticObjectId) -> int:
        """Counts the total number of screenshots for a specific chat."""
        return await Screenshot.find(Screenshot.chat_id == chat_id).count()

    async def find_screenshots_by_chat_id(
        self,
        chat_id: PydanticObjectId,
        limit: int = 50, 
        before_timestamp: Optional[datetime] = None
    ) -> List[Screenshot]:
        """Finds screenshots for a specific chat, ordered descending by creation time, with pagination."""
        query = Screenshot.find(Screenshot.chat_id == chat_id)

        if before_timestamp:
            query = query.find(Screenshot.created_at < before_timestamp)
            
        results = await query.sort(-Screenshot.created_at) \
                           .limit(limit) \
                           .to_list()

        return results

    async def delete_screenshots_for_chat(self, chat_id: PydanticObjectId) -> None:
        """Delete all screenshots for a specific chat."""
        await Screenshot.find(Screenshot.chat_id == chat_id).delete()