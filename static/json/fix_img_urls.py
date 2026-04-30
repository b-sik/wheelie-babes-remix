#!/usr/bin/env python3
# replace_escaped_urls.py
from pathlib import Path

OLD_ESC = r"https:\/\/bsik-media.nyc3.digitaloceanspaces.com\/wheelie-babes\/"
NEW_ESC = r"https:\/\/wheelie-babes.bsik.net\/images\/"

def main():
    folder = Path(".")
    files = sorted(folder.glob("*.json"), key=lambda p: (len(p.stem), p.stem))

    changed = []
    total = 0

    for p in files:
        text = p.read_text(encoding="utf-8")
        n = text.count(OLD_ESC)
        if n:
            p.write_text(text.replace(OLD_ESC, NEW_ESC), encoding="utf-8")
            changed.append((p.name, n))
            total += n

    log = folder / "replace_log.txt"
    with log.open("w", encoding="utf-8") as f:
        f.write(f"OLD_ESC: {OLD_ESC}\nNEW_ESC: {NEW_ESC}\n\n")
        f.write(f"Files scanned: {len(files)}\n")
        f.write(f"Files changed: {len(changed)}\n")
        f.write(f"Total replacements: {total}\n\n")
        for name, n in changed:
            f.write(f"{name}\t{n}\n")

    print(f"Done. Changed {len(changed)} files; {total} replacements. Log: {log}")

if __name__ == "__main__":
    main()

