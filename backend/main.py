import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1 import (
    configuration,
    conversation,
    cost,
    explanation,
    graph,
    projects,
    reasoning,
    recommendations,
    reports,
    security,
    synthesis,
    terraform,
    validation,
)
from backend.services.knowledge_loader import KnowledgeLoader

logger = logging.getLogger(__name__)

app = FastAPI(title="DOPA API", version="1.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(conversation.router, prefix="/api/v1/conversation", tags=["conversation"])
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["recommendations"])
app.include_router(graph.router, prefix="/api/v1/graph", tags=["graph"])
app.include_router(configuration.router, prefix="/api/v1/configuration", tags=["configuration"])
app.include_router(reasoning.router, prefix="/api/v1/reasoning", tags=["reasoning"])
app.include_router(terraform.router, prefix="/api/v1/terraform", tags=["terraform"])
app.include_router(security.router, prefix="/api/v1/security", tags=["security"])
app.include_router(cost.router, prefix="/api/v1/cost", tags=["cost"])
app.include_router(validation.router, prefix="/api/v1/validation", tags=["validation"])
app.include_router(explanation.router, prefix="/api/v1/explanation", tags=["explanation"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(synthesis.router, prefix="/api/v1/synthesis", tags=["synthesis"])


@app.on_event("startup")
async def startup_validation() -> None:
    KnowledgeLoader().load_all()
    logger.info("Knowledge base loaded and validated successfully")


@app.get("/health")
def health_check():
    return {"status": "ok"}
