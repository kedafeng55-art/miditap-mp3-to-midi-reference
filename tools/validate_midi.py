"""Validate the chunk structure of a Standard MIDI File."""

from __future__ import annotations

import argparse
from pathlib import Path
import struct


def validate(path: Path) -> str:
    data = path.read_bytes()
    if data[:4] != b"MThd":
        raise ValueError("missing MThd signature")
    if len(data) < 14:
        raise ValueError("file is shorter than the MIDI header")

    header_len = struct.unpack(">I", data[4:8])[0]
    if header_len != 6:
        raise ValueError(f"unexpected header length {header_len}")

    fmt, declared_tracks, division = struct.unpack(">HHH", data[8:14])
    if fmt not in (0, 1, 2):
        raise ValueError(f"unsupported format {fmt}")
    if declared_tracks == 0:
        raise ValueError("declared track count is zero")
    if division == 0:
        raise ValueError("time division is zero")

    offset = 14
    tracks = 0
    end_markers = 0
    while offset < len(data):
        if data[offset : offset + 4] != b"MTrk":
            raise ValueError(f"missing MTrk signature at byte {offset}")
        if offset + 8 > len(data):
            raise ValueError("truncated track header")
        length = struct.unpack(">I", data[offset + 4 : offset + 8])[0]
        start = offset + 8
        end = start + length
        if end > len(data):
            raise ValueError("track length exceeds file size")
        marker_count = data[start:end].count(b"\xff\x2f\x00")
        if marker_count != 1:
            raise ValueError(
                f"track {tracks + 1} has {marker_count} end-of-track markers"
            )
        end_markers += marker_count
        tracks += 1
        offset = end

    if offset != len(data):
        raise ValueError("unparsed trailing bytes")
    if tracks != declared_tracks:
        raise ValueError(
            f"declared {declared_tracks} tracks but parsed {tracks}"
        )

    return (
        f"valid SMF: format={fmt}, tracks={tracks}, division={division}, "
        f"bytes={len(data)}, end_markers={end_markers}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("midi_file", type=Path)
    args = parser.parse_args()
    print(validate(args.midi_file))


if __name__ == "__main__":
    main()

