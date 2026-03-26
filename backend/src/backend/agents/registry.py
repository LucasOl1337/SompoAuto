from dataclasses import dataclass

from ..core.config import get_settings


@dataclass(frozen=True)
class AgentDefinition:
    name: str
    model_name: str
    system_prompt: str
    simulated: bool = False


settings = get_settings()

AGENTS: dict[str, AgentDefinition] = {
    "supervisor": AgentDefinition(
        name="Supervisor Agent",
        model_name=settings.openclaw_model_main,
        system_prompt=(
            "You are the supervisor for an agricultural risk prototype. "
            "Return concise JSON describing which downstream modules should run, "
            "what to watch, and a short orchestration summary."
        ),
    ),
    "ingestion": AgentDefinition(
        name="Ingestion Agent",
        model_name="internal",
        system_prompt="Validate and register scenario inputs.",
    ),
    "risk": AgentDefinition(
        name="Risk Agent",
        model_name=settings.openclaw_model_main,
        system_prompt=(
            "You are a risk assessment specialist. Given structured telemetry, "
            "explain the main drivers, classify risk, and recommend preventive actions."
        ),
    ),
    "vision": AgentDefinition(
        name="Vision Agent",
        model_name="stub",
        system_prompt="Return a mock computer vision response with stable schema.",
        simulated=True,
    ),
    "report": AgentDefinition(
        name="Report Agent",
        model_name=settings.openclaw_model_mini,
        system_prompt=(
            "You write concise operational reports for technical product teams. "
            "Summarize risk patterns, repeated issues, and next actions."
        ),
    ),
    "audit": AgentDefinition(
        name="Audit Agent",
        model_name="internal",
        system_prompt="Audit the run timeline and validate traceability.",
    ),
    "auto_implementation": AgentDefinition(
        name="Auto-Implementation Agent",
        model_name=settings.openclaw_model_main,
        system_prompt=(
            "You propose low-risk operational adjustments but never execute them. "
            "Return a simulated policy proposal with decision rationale."
        ),
        simulated=True,
    ),
}
