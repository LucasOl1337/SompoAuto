from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from typing import Any

from ..agents.registry import AgentDefinition
from ..core.config import get_settings


@dataclass
class AgentRuntimeResult:
    runtime_name: str
    model_name: str
    content: dict[str, Any]
    raw_text: str


class OpenClawRuntime:
    def __init__(self) -> None:
        self.settings = get_settings()

    def describe_health(self) -> tuple[str, str]:
        if shutil.which(self.settings.openclaw_command) is None:
            return ("missing", self.settings.openclaw_runtime_mode)
        if self.settings.openclaw_runtime_mode == "mock":
            return ("mock", "mock")
        return ("available", self.settings.openclaw_runtime_mode)

    def invoke(self, agent: AgentDefinition, payload: dict[str, Any]) -> AgentRuntimeResult:
        mode = self.settings.openclaw_runtime_mode
        if mode in {"auto", "cli"} and shutil.which(self.settings.openclaw_command):
            try:
                return self._invoke_cli(agent, payload)
            except Exception:
                if mode == "cli":
                    raise
        return self._invoke_mock(agent, payload)

    def _invoke_cli(self, agent: AgentDefinition, payload: dict[str, Any]) -> AgentRuntimeResult:
        prompt = (
            f"Agent role: {agent.name}\n"
            f"Instructions: {agent.system_prompt}\n"
            "Return valid JSON only with keys that fit the task.\n"
            f"Payload:\n{json.dumps(payload, ensure_ascii=True)}"
        )
        completed = subprocess.run(
            [
                self.settings.openclaw_command,
                "agent",
                "--local",
                "--json",
                "--thinking",
                "low",
                "--timeout",
                str(self.settings.openclaw_timeout_seconds),
                "--message",
                prompt,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        parsed = json.loads(completed.stdout)
        message = self._extract_text(parsed)
        content = self._parse_json_text(message)
        return AgentRuntimeResult(
            runtime_name="openclaw-cli-local",
            model_name=agent.model_name,
            content=content,
            raw_text=message,
        )

    def _extract_text(self, response: dict[str, Any]) -> str:
        if isinstance(response.get("reply"), str):
            return response["reply"]
        if isinstance(response.get("message"), str):
            return response["message"]
        return json.dumps(response)

    def _parse_json_text(self, raw_text: str) -> dict[str, Any]:
        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(raw_text)

    def _invoke_mock(self, agent: AgentDefinition, payload: dict[str, Any]) -> AgentRuntimeResult:
        content: dict[str, Any]
        if agent.name == "Supervisor Agent":
            attachments = payload.get("attachments", [])
            content = {
                "should_run_vision": bool(attachments),
                "should_run_auto_implementation": True,
                "watch_items": [
                    "temperature",
                    "vibration",
                    "speed",
                    "proximity_water",
                ],
                "summary": "Supervisor routed the run through ingestion, risk, audit, report, and optional vision stub.",
            }
        elif agent.name == "Risk Agent":
            content = {
                "summary": payload.get("summary", ""),
                "tone": "technical",
            }
        elif agent.name == "Report Agent":
            content = {
                "summary": "Hourly report consolidated the available runs and highlighted the dominant operational risks.",
                "system_notes": "Report generated in mock mode through the OpenClaw adapter fallback.",
            }
        elif agent.name == "Auto-Implementation Agent":
            content = {
                "proposal": "Reduce telemetry polling interval for high-vibration equipment and raise alert priority.",
                "decision_reason": "Low-risk recommendation suitable for review before any live automation.",
            }
        else:
            content = {"status": "ok"}
        return AgentRuntimeResult(
            runtime_name="openclaw-mock",
            model_name=agent.model_name,
            content=content,
            raw_text=json.dumps(content),
        )
