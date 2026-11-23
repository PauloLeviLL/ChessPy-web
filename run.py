import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "chesspy_web.main:app",
        app_dir="src",
        host="0.0.0.0",
        port=8001,
        reload=False,
    )