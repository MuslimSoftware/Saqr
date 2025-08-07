import logging
import sys
import os # Add os import
import traceback  # Import the traceback module
from logging.handlers import RotatingFileHandler

# --- Custom Formatter --- 
class TracebackSuppressingFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        # Format the base message using the original formatter logic
        # Temporarily clear exc_info so the base formatter doesn't add the full trace
        original_exc_info = record.exc_info
        record.exc_info = None
        s = super().format(record)
        record.exc_info = original_exc_info # Restore it

        # If exception info exists, format just the type and message and append
        if record.exc_info:
            exc_type, exc_value, _ = record.exc_info
            # Format only the exception type and message, no traceback
            # traceback.format_exception_only returns a list of strings, usually one
            formatted_exception = "".join(traceback.format_exception_only(exc_type, exc_value)).strip()
            s += f" - EXCEPTION: {formatted_exception}"
            
            # Optionally add code location if available (might not always be in exc_info)
            # This depends heavily on how the logging call was made and the exception context
            # if record.pathname and record.lineno:
            #    s += f" [in {record.pathname}:{record.lineno}]"
                
        return s

# --- Logging Setup --- 
def setup_logging():
    # --- Create logs directory if it doesn't exist ---
    log_directory = "data/logs" 
    if not os.path.exists(log_directory):
        os.makedirs(log_directory)
    log_file_path = os.path.join(log_directory, "app.log")
    
    # Create the custom formatter
    # Keep the original format string for the base message
    formatter = TracebackSuppressingFormatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Create and configure the file handler
    file_handler = RotatingFileHandler(
        log_file_path, # Use the new path
        maxBytes=512*1024,  # 0.5MB
        backupCount=5
    )
    file_handler.setLevel(logging.ERROR)
    file_handler.setFormatter(formatter) # Use the custom formatter
    
    # Create and configure the console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.ERROR)
    console_handler.setFormatter(formatter) # Use the custom formatter
    
    # Configure the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.ERROR)
    # Clear existing handlers before adding new ones to prevent duplicates
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)