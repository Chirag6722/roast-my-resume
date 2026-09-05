"""
Roast generation entry point. Fully local: no external AI provider is called.
The LocalRoaster derives every line from the submitted resume's own content.
"""
from typing import Any, Dict, Optional

from app.local_roaster import LocalRoaster
from app.models import RoastIntensity, RoastResult


class AIRoaster:
    @classmethod
    async def generate_roast(
        cls,
        parsed_resume: Dict[str, Any],
        file_name: str,
        intensity: RoastIntensity,
        target_job: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> RoastResult:
        return LocalRoaster.generate(parsed_resume, file_name, intensity, target_job, user_id)
