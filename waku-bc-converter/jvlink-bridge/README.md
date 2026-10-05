# JV-Link → Race Scanner bridge

The iPhone scanner cannot call Windows JV-Link directly. This folder contains the Windows collector/normalizer that feeds `scanner.html`.

## Current status

- Scanner → `data/today.json` → detail handoff: implemented and smoke-tested.
- Windows collector/normalizer: `collect_today.py` added.
- Live JV-Link connection: adapter is ready, but the SDK-version-specific record parser/open wrapper must be supplied on the Windows PC from the official JRA-VAN Data Lab SDK. This repository deliberately does not guess byte offsets or store a service key.

JV-Link is the JRA-VAN Data Lab interface module and is supplied as an ActiveX COM control. Official JV-Data identifies O1 as win/place/frame-quinella odds and O2 as quinella odds; RA/SE race-card records are obtained through race data. The exact COM wrapper/out-parameter behavior and record structures should come from the installed official SDK.

## Flow

1. Windows + JRA-VAN Data Lab + JV-Link reads today's RA/SE/O1/O2 records.
2. `collect_today.py` normalizes them.
3. It atomically writes `waku-bc-converter/data/today.json`.
4. iPhone scanner loads that JSON, ranks every race, and sends selected races to the detailed converter.

## Scanner JSON schema

```json
{
  "generatedAt": "2026-10-05T10:15:00+09:00",
  "source": "JRA-VAN Data Lab / JV-Link",
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

## Windows setup

Requirements:

- Windows 11
- JRA-VAN Data Lab subscription and installed JV-Link
- Official JRA-VAN Data Lab SDK / data specifications
- Python 3
- `pywin32` (`py -m pip install pywin32`)

Create `jvdata_parser.py` beside `collect_today.py` with two functions based on the installed official SDK:

```python
def open_records(jv, spec, from_time):
    # JVOpen/JVRead (or realtime call where appropriate) and yield raw records.
    ...

def parse_record(raw):
    # Return normalized RA / SE / O1 / O2 dictionaries consumed by collect_today.py.
    ...
```

Set the installed COM ProgID explicitly rather than guessing it:

```bat
set JVLINK_PROGID=<ProgID shown by your installed official SDK/verification environment>
```

Then run:

```bat
py collect_today.py --snapshot T-15
```

The collector never stores the JRA-VAN service key in GitHub or in `today.json`.

## Offline bridge test

The normalizer can be tested without Windows/JV-Link by passing already-parsed records:

```bat
py collect_today.py --fixture parsed-records.json --out ../data/today.json --snapshot test
```

`scanner.html` also accepts the resulting JSON via file import.

## Important deployment note

A static GitHub Pages site cannot make a browser on iPhone call a COM control running on a Windows PC. Writing `today.json` locally also does not automatically publish it to Pages. A production connection therefore needs one of these transports after local JV-Link acquisition is working:

1. Windows collector commits/uploads the generated JSON to the web host, or
2. Windows runs a small authenticated HTTPS endpoint that the scanner fetches.

Do not expose JV-Link itself or the service key to the public web.

## Validation principle

The scanner score is a screening score, not a fair probability or a proven betting edge. Keep snapshots and all scanned races, including passes, so score bands can be evaluated prospectively against results and actual returns.
