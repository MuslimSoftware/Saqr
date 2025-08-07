from app.config.environment import environment
import uvicorn

def main():
    uvicorn.run(
        "app.main:app", 
        host=environment.HOST, 
        port=environment.PORT, 
        reload=not environment.PRODUCTION
    )

if __name__ == "__main__":
    main() 