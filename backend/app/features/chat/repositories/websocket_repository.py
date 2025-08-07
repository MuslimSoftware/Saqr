from fastapi import WebSocket
from typing import Dict, List
import json
import logging

# Renamed class
class WebSocketRepository:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.logger = logging.getLogger(__name__)

    async def connect(self, websocket: WebSocket, chat_id: str):
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = []
        self.active_connections[chat_id].append(websocket)
        print(f"WebSocket connected to chat {chat_id}. Total: {len(self.active_connections[chat_id])}")

    def disconnect(self, websocket: WebSocket, chat_id: str):
        if chat_id in self.active_connections:
            if websocket in self.active_connections[chat_id]:
                self.active_connections[chat_id].remove(websocket)
                print(f"WebSocket disconnected from chat {chat_id}. Remaining: {len(self.active_connections[chat_id])}")
                if not self.active_connections[chat_id]:
                    del self.active_connections[chat_id]
            else:
                 print(f"WS disconnect: Socket already removed from chat {chat_id}.")
        else:
             print(f"WS disconnect: Chat room {chat_id} not found.")

    async def broadcast_to_chat(self, message: str, chat_id: str):
        self.logger.info(f"[WebSocketRepository] Attempting to broadcast to chat_id: {chat_id}. Message type: {json.loads(message).get('type', 'N/A')}")
#         
        if chat_id in self.active_connections and self.active_connections[chat_id]:
            print(f"Broadcasting to chat {chat_id}: {message[:50]}...")
            self.logger.info(f"[WebSocketRepository] Found {len(self.active_connections[chat_id])} active connection(s) for chat_id: {chat_id}")
            
            connections = self.active_connections[chat_id][:]
            disconnected_sockets = []
            for connection in connections:
                try:
                    await connection.send_text(message)
                    self.logger.debug(f"[WebSocketRepository] Successfully sent message to connection in chat {chat_id}")
                except Exception as e:
                    self.logger.error(f"[WebSocketRepository] Error sending to websocket in chat {chat_id}: {e}. Disconnecting.")
                    print(f"Error sending to websocket in chat {chat_id}: {e}. Disconnecting.")
                    disconnected_sockets.append(connection)
            
            # Use self.disconnect to ensure proper cleanup and logging
            for sock in disconnected_sockets:
                self.disconnect(sock, chat_id) # Call the disconnect method
        else:
            self.logger.warning(f"[WebSocketRepository] No active connections found for chat_id: {chat_id}. Cannot broadcast message.") 