from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class CalibrationRecord:
    predicted_confidence: float
    actual_success: bool
    timestamp: float = field(default_factory=time.time)


class ConfidenceCalibrator:
    """
    Empirical confidence calibrator.
    Tracks predicted confidence vs ground-truth success to detect
    overconfidence drift and apply calibration shrinkage.
    """

    def __init__(self) -> None:
        self.records: List[CalibrationRecord] = []

    def record_outcome(self, predicted_confidence: float, actual_success: bool) -> None:
        self.records.append(
            CalibrationRecord(
                predicted_confidence=max(0.0, min(1.0, float(predicted_confidence))),
                actual_success=bool(actual_success),
            )
        )

    def compute_brier_score(self) -> float:
        """Lower is better (0.0 = perfect probabilistic calibration)."""
        if not self.records:
            return 0.0
        total_sq_err = sum(
            (r.predicted_confidence - (1.0 if r.actual_success else 0.0)) ** 2
            for r in self.records
        )
        return round(total_sq_err / len(self.records), 4)

    def calibrate(self, raw_confidence: float) -> float:
        """Calibrates raw confidence based on historical empirical accuracy."""
        raw = max(0.0, min(1.0, float(raw_confidence)))
        if len(self.records) < 3:
            return raw  # Not enough data for shrinkage

        # Compute empirical pass rate
        pass_rate = sum(1 for r in self.records if r.actual_success) / len(self.records)
        mean_pred = sum(r.predicted_confidence for r in self.records) / len(self.records)

        # Overconfidence gap
        gap = mean_pred - pass_rate
        if gap > 0.15:
            # Chronic overconfidence detected -> apply conservative penalty
            shrinkage = gap * 0.6
            calibrated = max(0.1, raw - shrinkage)
            return round(calibrated, 3)

        return raw

    def stats(self) -> Dict[str, Any]:
        return {
            "total_records": len(self.records),
            "brier_score": self.compute_brier_score(),
        }
