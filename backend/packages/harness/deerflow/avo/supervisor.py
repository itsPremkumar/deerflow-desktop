from __future__ import annotations

import logging
from typing import Any, Dict, Tuple

logger = logging.getLogger("deerflow.avo.supervisor")


class AVOSupervisor:
    """
    Supervises the AVO evolution loop.
    Monitors consecutive non-improving iterations (stagnation).
    Triggers plateau mitigation when max_no_improve threshold is reached.
    """

    def __init__(self, max_no_improve: int = 4) -> None:
        self.max_no_improve = max_no_improve
        self.consecutive_stagnation: int = 0
        self.total_improvements: int = 0
        self.total_stagnation_events: int = 0

    def observe(self, improved: bool) -> Tuple[bool, str]:
        """
        Observes whether the last iteration committed an improvement.
        Returns: (is_stagnated, diagnostic_message)
        """
        if improved:
            self.consecutive_stagnation = 0
            self.total_improvements += 1
            return False, "NOMINAL: Improvement detected."

        self.consecutive_stagnation += 1
        if self.consecutive_stagnation >= self.max_no_improve:
            self.total_stagnation_events += 1
            diag = (
                f"STAGNATION_DETECTED: Search plateaued after {self.consecutive_stagnation} "
                "consecutive non-improving iterations. Forcing exploratory perturbation."
            )
            logger.warning(diag)
            # Reset counter after triggering mitigation
            self.consecutive_stagnation = 0
            return True, diag

        return False, f"MONITORING: Stagnation count at {self.consecutive_stagnation}/{self.max_no_improve}."

    def stats(self) -> Dict[str, Any]:
        return {
            "max_no_improve": self.max_no_improve,
            "consecutive_stagnation": self.consecutive_stagnation,
            "total_improvements": self.total_improvements,
            "total_stagnation_events": self.total_stagnation_events,
        }
