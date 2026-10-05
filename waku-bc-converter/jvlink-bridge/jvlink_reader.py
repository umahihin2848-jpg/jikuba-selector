#!/usr/bin/env python3
"""Small JV-Link 5.x reader based on the official Python 3.14 pattern.
It returns raw bytes; parsing is deliberately delegated to the official SDK
JVData_Struct.py so byte offsets are never guessed in this repository.
"""
from __future__ import annotations
import os


def connect(sid="UNKNOWN"):
    if os.name != "nt": raise RuntimeError("Windows only")
    import win32com.client
    jv = win32com.client.Dispatch("JVDTLab.JVLink")
    rc = jv.JVInit(sid)
    if rc != 0: raise RuntimeError(f"JVInit error: {rc}")
    return jv


def gets_all(jv, buff_size=150000):
    """Read the currently opened JV stream with JVGets (official Python pattern)."""
    buff = bytearray(); fname = bytearray()
    while True:
        rc, memview, fname = jv.JVGets(buff, buff_size, fname)
        if rc > 0:
            yield memview.tobytes()
        elif rc == 0:
            return
        elif rc == -1:
            continue
        else:
            raise RuntimeError(f"JVGets error: {rc}")


def open_race(jv, from_time, option=2):
    """Open RACE data. Python COM returns (rc, read_count, download_count, last_time)."""
    result = jv.JVOpen("RACE", from_time, option, 0, 0, "")
    rc = result[0] if isinstance(result, tuple) else result
    if rc < 0: raise RuntimeError(f"JVOpen(RACE) error: {rc}")
    return result


def open_realtime(jv, data_spec, key):
    """Open a realtime stream (e.g. official odds/event DataSpec)."""
    rc = jv.JVRTOpen(data_spec, key)
    if isinstance(rc, tuple): rc = rc[0]
    if rc < 0: raise RuntimeError(f"JVRTOpen({data_spec}) error: {rc}")
    return rc
