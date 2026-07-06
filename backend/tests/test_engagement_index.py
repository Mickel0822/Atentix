import os

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "ci-placeholder")

import pytest

from endpoints.websockets.attention_monitor import DrowsinessTracker
from services.attention_logic import (
    calculate_blink_score,
    calculate_engagement_index,
    calculate_engagement_index_with_ear,
    calculate_full_attention_metrics,
    calculate_gaze_score,
    calculate_pose_score,
    get_attention_status,
)


def test_gaze_score_uses_default_threshold():
    assert calculate_gaze_score(0.0, threshold=20.0) == 1.0
    assert calculate_gaze_score(21.0, threshold=20.0) == 0.0


def test_pose_score_uses_both_thresholds():
    assert calculate_pose_score(0.0, 0.0, yaw_threshold=25.0, pitch_threshold=15.0) == 1.0
    assert calculate_pose_score(30.0, 0.0, yaw_threshold=25.0, pitch_threshold=15.0) == 0.0


def test_blink_score_respects_ideal_range():
    assert calculate_blink_score(13.0, ideal_min=12, ideal_max=15) == 1.0
    assert calculate_blink_score(0.0, ideal_min=12, ideal_max=15) == 0.0


def test_engagement_index_is_weighted():
    score = calculate_engagement_index(
        gaze_score=1.0,
        pose_score=0.5,
        blink_score=0.25,
        weights={"gaze": 0.5, "pose": 0.3, "blink": 0.2},
    )

    assert score == pytest.approx(0.7)


def test_engagement_index_with_ear_penalizes_score():
    score = calculate_engagement_index_with_ear(
        gaze_score=1.0,
        pose_score=1.0,
        blink_score=1.0,
        ear_score=0.4,
        weights={"gaze": 0.5, "pose": 0.3, "blink": 0.2},
    )

    assert score == pytest.approx(0.4)


def test_full_attention_metrics_classifies_engaged():
    metrics = calculate_full_attention_metrics(
        gaze_yaw=0.0,
        head_yaw=0.0,
        head_pitch=0.0,
        left_ear=0.3,
        right_ear=0.3,
        blinks_per_minute=13.0,
    )

    assert metrics.engagement_index == pytest.approx(1.0)
    assert metrics.status == "engaged"
    assert metrics.gaze_score == 1.0
    assert metrics.pose_score == 1.0
    assert metrics.blink_score == 1.0
    assert metrics.warnings == []


def test_full_attention_metrics_classifies_distracted():
    metrics = calculate_full_attention_metrics(
        gaze_yaw=45.0,
        head_yaw=30.0,
        head_pitch=20.0,
        left_ear=0.3,
        right_ear=0.3,
        blinks_per_minute=0.0,
    )

    assert metrics.engagement_index == pytest.approx(0.0)
    assert metrics.status == "distracted"


def test_drowsiness_tracker_enters_asleep_after_threshold():
    tracker = DrowsinessTracker(threshold_seconds=2.0)

    assert tracker.update(eyes_closed=True, timestamp=10.0) is False
    assert tracker.update(eyes_closed=True, timestamp=11.5) is False
    assert tracker.update(eyes_closed=True, timestamp=12.2) is True
