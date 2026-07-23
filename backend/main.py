from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1 import (
    conversation,
    cost,
    explanation,
    graph,
    projects,
    reasoning,
    recommendations,
    reports,
    security,
    terraform,
    validation,
)

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
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["recommendations"])
app.include_router(graph.router, prefix="/api/v1/graph", tags=["graph"])
app.include_router(reasoning.router, prefix="/api/v1/reasoning", tags=["reasoning"])
app.include_router(terraform.router, prefix="/api/v1/terraform", tags=["terraform"])
app.include_router(security.router, prefix="/api/v1/security", tags=["security"])
app.include_router(cost.router, prefix="/api/v1/cost", tags=["cost"])
app.include_router(validation.router, prefix="/api/v1/validation", tags=["validation"])
app.include_router(explanation.router, prefix="/api/v1/explanation", tags=["explanation"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
