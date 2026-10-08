import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from evaluate_message_reliability import probability_metrics


def test_perfect_probabilities_have_zero_losses():
    result = probability_metrics([("a", {"a": 1.0, "b": 0.0})])
    assert result["log_loss"] == result["multiclass_brier_sum"] == 0
    assert result["top_label_ece_10_bins"] == 0
    assert result["reliability_bins"][0]["count"] == 1


def test_uninformative_balanced_model_can_have_zero_ece_but_poor_prediction_loss():
    result = probability_metrics([(label, dict(a=1 / 3, b=1 / 3, c=1 / 3)) for label in "abc"])
    assert result["top_label_ece_10_bins"] == pytest.approx(0)
    assert result["log_loss"] == pytest.approx(math.log(3))
    assert result["multiclass_brier_sum"] == pytest.approx(2 / 3)


@pytest.mark.parametrize("probabilities", [{"a": 1.2, "b": -0.2}, {"a": 0.7}, {"a": math.nan}])
def test_invalid_probabilities_cannot_produce_metrics(probabilities):
    with pytest.raises(ValueError):
        probability_metrics([("a", probabilities)])
