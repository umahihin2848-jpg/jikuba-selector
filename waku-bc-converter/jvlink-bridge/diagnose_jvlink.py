#!/usr/bin/env python3
"""Windows preflight for JRA-VAN Data Lab / JV-Link 5.x.
Run on the PC that has JV-Link installed. No service key is printed or saved.
"""
from __future__ import annotations
import importlib.util
import json
import os
import platform
import sys


def main():
    report = {
        "python": sys.version,
        "architecture": platform.architecture()[0],
        "windows": platform.platform(),
        "os_name": os.name,
        "pywin32": False,
        "jvdata_struct": False,
        "com": False,
        "jvinit": None,
        "errors": [],
    }
    if os.name != "nt":
        report["errors"].append("JV-Link requires Windows")
        print(json.dumps(report, ensure_ascii=False, indent=2)); return 2
    try:
        import pythoncom  # noqa
        import win32com.client
        report["pywin32"] = True
    except Exception as e:
        report["errors"].append(f"pywin32: {e}")
        print(json.dumps(report, ensure_ascii=False, indent=2)); return 2

    report["jvdata_struct"] = importlib.util.find_spec("JVData_Struct") is not None
    try:
        jv = win32com.client.Dispatch("JVDTLab.JVLink")
        report["com"] = True
        rc = jv.JVInit("UNKNOWN")
        report["jvinit"] = rc
        if rc != 0:
            report["errors"].append(f"JVInit returned {rc}")
        try: jv.JVClose()
        except Exception: pass
    except Exception as e:
        report["errors"].append(f"COM/JVInit: {e}")

    if not report["jvdata_struct"]:
        report["errors"].append("JVData_Struct.py not importable; copy the official SDK Python structure module beside the bridge or add it to PYTHONPATH")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["com"] and report["jvinit"] == 0 and report["jvdata_struct"] else 2

if __name__ == "__main__":
    raise SystemExit(main())
