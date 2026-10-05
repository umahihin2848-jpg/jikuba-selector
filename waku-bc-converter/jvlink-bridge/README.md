# JV-Link → Race Scanner bridge

The iPhone scanner cannot call Windows JV-Link directly. This folder defines the bridge contract used by `scanner.html`.

## Flow

1. A Windows JV-Link collector reads today's race card plus win, frame-quinella and quinella odds.
2. It writes `waku-bc-converter/data/today.json` using the schema below.
3. The web scanner loads that JSON, ranks every race, and only sends selected races to the detailed converter.

## JSON schema

```json
{
  "generatedAt": "2026-10-05T10:15:00+09:00",
  "source": "JV-Link",
  "snapshot": "T-15",
  "races": [
    {
      "date": "2026-10-05",
      "venue": "東京",
      "raceNo": 11,
      "raceName": "example",
      "startTime": "15:45",
      "runners": 16,
      "horses": [
        {"horseNo": 1, "frame": 1, "name": "horse", "winOdds": 3.2}
      ],
      "frameOdds": {"1-2": 5.8},
      "quinellaOdds": {"1-2": 12.4}
    }
  ]
}
```

`scanner.html` also accepts this JSON via file import, so the scanner can be tested before a Windows JV-Link collector is connected.

## Validation principle

The scanner score is a screening score, not a fair probability or a proven betting edge. Keep snapshots and all scanned races, including passes, so score bands can be evaluated prospectively against results and actual returns.
