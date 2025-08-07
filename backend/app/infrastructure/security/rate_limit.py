from slowapi import Limiter
from slowapi.util import get_remote_address

# Centralized limiter instance
# Configure default limits here if needed, e.g., ["100/minute"]
limiter = Limiter(key_func=get_remote_address)