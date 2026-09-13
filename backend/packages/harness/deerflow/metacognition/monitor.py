from __future__ import annotations

from typing import Any, Dict, List, Optional

from .calibration import ConfidenceCalibrator
from .models import BiasFlag, CognitiveMode, MetacognitiveAssessment


class MetacognitiveMonitor:
    """
    Monitors agent cognitive processes and detects cognitive failure modes.
    """

    def __init__(self, calibrator: Optional[ConfidenceCalibrator] = None) -> None:
        self.calibrator = calibrator or ConfidenceCalibrator()

    def assess_state(
        self,
        action_history: List[Dict[str, Any]],
        current_confidence: float,
        mode: CognitiveMode = CognitiveMode.DELIBERATIVE,
    ) -> MetacognitiveAssessment:
        detected_biases: List[BiasFlag] = []
        should_switch = False
        stagnation_score = 0.0

        calibrated_conf = self.calibrator.calibrate(current_confidence)

        # 1. Detect Plan Stagnation: repeated failures on identical actions
        if len(action_history) >= 3:
            recent_fails = [a for a in action_history[-3:] if not a.get("success", False)]
            if len(recent_fails) >= 2:
                detected_biases.append(BiasFlag.PLAN_STAGNATION)
                stagnation_score = round(len(recent_fails) / 3.0, 2)
                should_switch = True

        # 2. Detect Overconfidence: claimed confidence > 0.85 despite consecutive failures
        if current_confidence > 0.85 and any(b == BiasFlag.PLAN_STAGNATION for b in detected_biases):
            detected_biases.append(BiasFlag.OVERCONFIDENCE)
            calibrated_conf = min(calibrated_conf, 0.50)

        # 3. Detect Confirmation Bias: repeating identical search query or tool parameters
        if len(action_history) >= 3:
            tools = [a.get("tool") for a in action_history[-3:] if a.get("tool")]
            if len(tools) == 3 and len(set(tools)) == 1 and not action_history[-1].get("success", False):
                detected_biases.append(BiasFlag.CONFIRMATION_BIAS)
                should_switch = True

        # Formulate actionable recommendation
        if BiasFlag.PLAN_STAGNATION in detected_biases or should_switch:
            rec = "Stagnation or bias detected. Recommend switching strategy or requesting peer verification."
        elif BiasFlag.OVERCONFIDENCE in detected_biases:
            rec = "High overconfidence drift detected. Recommend reducing risk tier and running verification."
        else:
            rec = "Cognitive state healthy. Continue nominal execution."

        return MetacognitiveAssessment(
            mode=mode,
            confidence=current_confidence,
            calibrated_confidence=calibrated_conf,
            detected_biases=detected_biases,
            stagnation_score=stagnation_score,
            recommendation=rec,
            should_switch_strategy=should_switch,
        )
