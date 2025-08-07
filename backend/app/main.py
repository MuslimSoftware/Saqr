from fastapi import FastAPI
from app.config.environment import environment
from app.infrastructure.database.internal import init_db
from app.infrastructure.database.external import init_external_mongo_client, init_sql_engine, close_external_mongo_client, close_sql_engine
from app.infrastructure.caching import init_redis_pool, close_redis_pool
from app.features.auth.controllers import auth_controller
from app.features.chat.controllers import chat_controller
from app.features.chat.controllers import demo_chat_controller
from app.middlewares import setup_middleware, setup_exception_handlers
from app.infrastructure.logging import setup_logging
from app.infrastructure.security import limiter
import contextlib

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Internal DBs ---
    await init_db()
    init_redis_pool()

    # --- External DBs ---
    init_sql_engine()
    # init_external_mongo_client()

    yield

    # --- Cleanup ---
    close_redis_pool()
    # close_external_mongo_client()
    close_sql_engine()

app = FastAPI(
    title=environment.PROJECT_NAME,
    description=environment.PROJECT_DESCRIPTION,
    version=environment.PROJECT_VERSION,
    lifespan=lifespan,
)

# Setup rate limiting state
app.state.limiter = limiter

setup_exception_handlers(app)

# Setup logging AFTER exception handlers are attached
setup_logging()

# Setup middlewares
setup_middleware(app)

# Include routers with global API prefix
api_prefix = f"{environment.API_PREFIX}{environment.API_VERSION_PREFIX}"
app.include_router(auth_controller.router, prefix=api_prefix)
app.include_router(chat_controller.router, prefix=api_prefix)
app.include_router(demo_chat_controller.router, prefix=api_prefix)

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Welcome to the API"}