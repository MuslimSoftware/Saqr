class AppException(Exception):
    """Root Exception class for all custom exceptions."""
    
    def __init__(self, message: str, error_code: str = None, status_code: int = 500):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(message)

class DatabaseException(AppException):
    """Exception for database errors."""
    
    def __init__(self, message: str, error_code: str = None, status_code: int = 500):
        super().__init__(message, error_code, status_code)

class DuplicateEntityException(AppException):
    """Exception for when a duplicate entity is found."""
    
    def __init__(self, message: str, error_code: str = None, status_code: int = 400):
        super().__init__(message, error_code, status_code)
