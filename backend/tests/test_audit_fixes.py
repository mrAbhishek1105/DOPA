import pytest
from pydantic import ValidationError

from backend.api.v1.conversation import ConversationMessageRequest
from backend.api.v1.projects import CreateProjectRequest
from backend.schemas.requirements import RequirementModel


def test_create_project_request_enforces_length_limits():
    long_name = "x" * 300
    with pytest.raises(ValidationError):
        CreateProjectRequest(name=long_name)

    with pytest.raises(ValidationError):
        CreateProjectRequest(name="")


def test_conversation_message_request_enforces_length_limits():
    long_message = "x" * 9000
    with pytest.raises(ValidationError):
        ConversationMessageRequest(project_id="00000000-0000-0000-0000-000000000001", message=long_message)

    with pytest.raises(ValidationError):
        ConversationMessageRequest(project_id="00000000-0000-0000-0000-000000000001", message="")


def test_requirement_model_accepts_supported_clouds_and_preserves_capabilities():
    model = RequirementModel(application_type="web_app", cloud="azure", capabilities=["storage", "compute"])
    assert model.cloud == "azure"
    assert model.capabilities == ["storage", "compute"]

    with pytest.raises(ValidationError):
        RequirementModel(application_type="web_app", cloud="oracle")
