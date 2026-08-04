from typing import Any
from backend.schemas.understanding import BusinessUnderstanding
import re

# Mapping AI outputs to canonical ontology values
CANONICAL_MAPPINGS = {
    "budget": {
        "low": ["low", "cheap", "minimal", "tight"],
        "medium": ["medium", "balanced", "moderate", "average"],
        "high": ["high", "unlimited", "enterprise", "large"]
    },
    "traffic": {
        "low": ["low", "small", "light", "minimal", "few", "tiny"],
        "medium": ["medium", "moderate", "average", "growing"],
        "high": ["high", "heavy", "large", "spikes", "surge", "massive"]
    },
    "availability": {
        "standard": ["standard", "normal", "basic"],
        "high": ["high", "ha", "critical", "always on", "99.99"],
        "multi_region": ["multi_region", "global", "dr", "disaster recovery"]
    },
    "realtime_latency": {
        "yes": ["yes", "true", "realtime", "live", "fast", "instant"],
        "no": ["no", "false", "batch", "delayed", "async"]
    },
    "application_type": {
        "web_app": ["web app", "web_app", "website", "portfolio", "personal site", "personal website", "landing page", "showcase"],
        "ecommerce": ["ecommerce", "e-commerce", "store", "marketplace", "retail"],
        "saas": ["saas", "subscription", "multi-tenant", "multi tenant", "b2b", "software as a service"],
        "internal_tool": ["internal tool", "internal", "dashboard", "admin tool", "operations tool"],
        "social_media": ["social media", "social network", "community"],
        "event_driven": ["event driven", "event-driven", "event based"],
        "ai_workload": ["ai", "machine learning", "ml", "data science", "predictive"],
        "streaming": ["streaming", "video streaming", "media streaming"]
    },
    "database": {
        "postgresql": ["postgresql", "postgres"],
        "mysql": ["mysql"],
        "dynamodb": ["dynamodb", "nosql", "dynamo"],
        "mongodb": ["mongodb", "mongo"],
        "sql": ["sql", "relational", "rds"]
    },
    "media_storage": {
        "low": ["low", "none", "minimal", "small", "tiny"],
        "medium": ["medium", "moderate", "some"],
        "high": ["high", "heavy", "large", "massive"]
    },
    "compliance": {
        "none": ["none", "no", "n/a", "not required"],
        "soc2": ["soc2", "soc-2"],
        "hipaa": ["hipaa", "health", "medical"],
        "pci": ["pci", "payment"]
    },
    "cloud": {
        "aws": ["aws", "amazon"],
        "gcp": ["gcp", "google"],
        "azure": ["azure", "microsoft"]
    }
}

class Normalizer:
    """
    Normalizes AI outputs into strict canonical values defined by the DOPA ontology.
    """

    @staticmethod
    def normalize(understanding: BusinessUnderstanding) -> BusinessUnderstanding:
        """
        In-place normalization of the explicit and inferred facts.
        """
        # Normalize explicit facts
        for key, value in understanding.explicit_facts.model_dump(exclude_none=True).items():
            norm_val = Normalizer._normalize_value(key, value)
            if norm_val is not None:
                setattr(understanding.explicit_facts, key, norm_val)

        # Normalize inferred facts
        for key, value in understanding.inferred_facts.model_dump(exclude_none=True).items():
            norm_val = Normalizer._normalize_value(key, value)
            if norm_val is not None:
                setattr(understanding.inferred_facts, key, norm_val)

        return understanding

    @staticmethod
    def _normalize_value(field: str, value: Any) -> Any:
        if not isinstance(value, str):
            return value

        val_lower = str(value).lower().strip()

        if field in CANONICAL_MAPPINGS:
            for canonical, synonyms in CANONICAL_MAPPINGS[field].items():
                if val_lower == canonical or any(syn in val_lower for syn in synonyms):
                    return canonical

        # For region, try a regex pass for typical AWS regions
        if field == "region":
            match = re.search(r"(us-east-[12]|us-west-[12]|eu-west-[12]|eu-central-1|ap-southeast-[12]|ap-northeast-[12]|sa-east-1|ca-central-1|ap-south-1)", val_lower)
            if match:
                return match.group(1)

        # If no mapping matched, return the lowercased value (might be an app type like "portfolio" or "ecommerce")
        return val_lower
