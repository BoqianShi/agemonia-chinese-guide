#!/usr/bin/env python3
"""Rebuild verified, spoiler-isolated story images from the user's Chinese PDF.

Requires Python 3, Pillow, NumPy, and Poppler's pdfimages. No OCR is used at
runtime: every title was visually checked against the source scan.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'docs/storybook-index.json'


def trim_segment(image: Image.Image, continuation: bool):
    """Trim only exterior whitespace; reject empty column-top decorations."""
    a = np.asarray(image).astype(np.int16)
    low, high = a.min(axis=2), a.max(axis=2)
    text = ((high < 155) & ((high - low) < 75)) | (
        (a[:, :, 0] > 80) & (a[:, :, 0] > a[:, :, 1] * 1.5)
        & (a[:, :, 0] > a[:, :, 2] * 1.5) & (a[:, :, 2] < 130)
    )
    text_rows = np.flatnonzero(text.sum(axis=1) > max(3, image.width * .004))
    if len(text_rows) < 4 or int(text.sum()) < 55:
        return None
    ink_rows = np.flatnonzero((low < 190).sum(axis=1) > max(2, image.width * .003))
    top = max(0, int(text_rows[0] if continuation else ink_rows[0]) - 7)
    bottom = min(image.height, int(ink_rows[-1]) + 8)
    return image.crop((0, top, image.width, bottom)), top


def build(pdf: Path, work: Path, only: set[str] | None = None):
    index = json.loads(INDEX.read_text())
    digest = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if digest != index['source']['sha256']:
        raise ValueError('This PDF differs from the scan used to verify the index.')
    cache_marker = work / 'source.sha256'
    if cache_marker.exists() and cache_marker.read_text().strip() != digest:
        raise ValueError('The image cache belongs to a different PDF.')
    if not cache_marker.exists() or not (work / 'page-000.jpg').exists():
        subprocess.run(['pdfimages', '-j', str(pdf), str(work / 'page')], check=True)
        cache_marker.write_text(digest + '\n')
    entries = {}
    segments = []
    active = None
    empty_continuations = {(x['after'], x['pdfPage'], x['column']) for x in index['emptyContinuations']}
    for page in index['pages']:
        pdf_page = page['pdfPage']
        image_path = work / f'page-{pdf_page - 1:03}.jpg'
        if hashlib.sha256(image_path.read_bytes()).hexdigest() != page['imageSha256']:
            raise ValueError(f'The cached scan on page {pdf_page} differs from the verified image.')
        with Image.open(image_path) as source:
            source = source.convert('RGB')
            if source.size != (page['width'], page['height']):
                raise ValueError(f'Scan dimensions differ on page {pdf_page}.')
            for column_number, column in enumerate(page['columns']):
                headings = column['headings']
                cuts = [(h['y'], h['id']) for h in headings]
                start = page['top']
                continuation = True
                for end, new_id in cuts + [(page['bottom'], None)]:
                    if active and end > start:
                        final_end = min(end, 1750) if active == '999' and pdf_page == 71 else end
                        box = [column['left'], start, column['right'], final_end]
                        is_empty_margin = continuation and (active, pdf_page, column_number + 1) in empty_continuations
                        result = None if is_empty_margin else trim_segment(source.crop(box), continuation)
                        if result:
                            image, trim_top = result
                            entry = entries.setdefault(active, {'pages': [], 'images': []})
                            if pdf_page not in entry['pages']:
                                entry['pages'].append(pdf_page)
                            part = len(entry['images']) + 1
                            filename = f'{active}-{part}.webp'
                            src = f'assets/stories/{filename}'
                            if only is None or active in only:
                                image.save(ROOT / src, 'WEBP', quality=90, method=6)
                            entry['images'].append({'src': src, 'width': image.width, 'height': image.height})
                            segments.append({'id': active, 'part': part, 'pdfPage': pdf_page,
                                'column': column_number + 1, 'box': [box[0], start + trim_top, box[2], start + trim_top + image.height]})
                    if new_id is not None:
                        active = new_id
                        entries.setdefault(active, {'pages': [], 'images': []})
                    start = end
                    continuation = False
    empty = [key for key, entry in entries.items() if not entry['images']]
    if empty:
        raise ValueError(f'No image content for {empty}')
    ordered = dict(sorted(entries.items()))
    data = {'version': 1, 'source': index['source'], 'entries': ordered}
    if only is None:
        expected_files = {image['src'] for entry in ordered.values() for image in entry['images']}
        for old in (ROOT / 'assets/stories').glob('*.webp'):
            if str(old.relative_to(ROOT)) not in expected_files:
                old.unlink()
        (ROOT / 'assets/story-data.js').write_text('window.AGEMONIA_STORIES = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    (work / 'segments.json').write_text(json.dumps(segments, ensure_ascii=False, indent=2))
    (work / 'manifest.json').write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"{len(entries)} stories; {len(segments)} image segments; {sum(len(x['images']) > 1 for x in entries.values())} multi-part stories")
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path, help='The original 72-page Chinese storybook scan')
    parser.add_argument('--work', type=Path, help='Cache extracted JPEGs and audit manifests here')
    parser.add_argument('--only', help='Comma-separated story numbers to render for visual review')
    args = parser.parse_args()
    (ROOT / 'assets/stories').mkdir(parents=True, exist_ok=True)
    only = set(args.only.split(',')) if args.only else None
    if args.work:
        args.work.mkdir(parents=True, exist_ok=True)
        build(args.pdf, args.work, only)
    else:
        with tempfile.TemporaryDirectory(prefix='agemonia-story-') as folder:
            build(args.pdf, Path(folder), only)


if __name__ == '__main__':
    main()
