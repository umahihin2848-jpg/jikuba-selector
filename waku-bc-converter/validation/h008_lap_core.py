"""H008a research-only race-level course lap-shape metrics; not horse aptitude scores."""
import re
import numpy as np

def parse_date(s):
    chunks = re.findall(r'\d+', str(s))
    if len(chunks) != 3:
        raise ValueError('date must have exactly year/month/day')
    year, month, day = map(int, chunks)
    if not (2016 <= year <= 2100 and 1 <= month <= 12 and 1 <= day <= 31):
        raise ValueError('date outside valid range')
    return year * 10000 + month * 100 + day

def phase_metrics(lap_string, distance, threshold=0.3):
    """200m race fractions. First 200m standing start excluded from early pace.

    Mid segment: 4th fraction through the one before last 600m.
    For 1200m there is no such middle segment; return None for mid-lull.
    This is purely a race-level descriptive label, not an as-of forecast.
    """
    try:
        laps = np.array([float(v) for v in str(lap_string).split('-')], dtype=float)
        distance = int(distance)
    except (ValueError, TypeError):
        return None
    if distance % 200 or len(laps) != distance // 200 or not np.all(np.isfinite(laps)):
        return None
    if not np.all((laps > 9.0) & (laps < 17.0)):
        return None
    early = float(laps[1:3].mean())
    late = float(laps[-3:].mean())
    middle = float(laps[3:-3].mean()) if len(laps) > 6 else np.nan
    me = middle - early if np.isfinite(middle) else np.nan
    ml = middle - late if np.isfinite(middle) else np.nan
    return {
        'early2_no_start': early,
        'middle': middle,
        'late3': late,
        'middle_over_early': me,
        'middle_over_late': ml,
        'lull_index': middle - (early + late) / 2 if np.isfinite(middle) else np.nan,
        'lull_both_0p3': int(me >= threshold and ml >= threshold) if np.isfinite(middle) else np.nan,
        'late3_minus_early2': late - early,
        'final_furlong_slower': float(laps[-1] - laps[-3:-1].mean()),
        'splits': laps.tolist(),
    }