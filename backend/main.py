from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1 import conversation, generate, projects

app = FastAPI(title="DOPA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(conversation.router, prefix="/api/v1/conversation", tags=["conversation"])
app.include_router(generate.router, prefix="/api/v1/generate", tags=["generation"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
