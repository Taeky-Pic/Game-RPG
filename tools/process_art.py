"""아트리스트 등에서 만든 원본 이미지를 게임용 PNG로 변환합니다.

사용법:
  python3 tools/process_art.py <원본파일> <에셋이름> [--bg green|magenta|black|auto] [--height 픽셀] [--tile]

- 단색 배경 제거 (가장자리 색 번짐 보정 포함), 투명 여백 자르기, 크기 조절
- --tile: 정사각형 바닥 텍스처를 쿼터뷰 다이아몬드(가로:세로 = 2:1)로 변환
- 결과: client/assets/art/<에셋이름>.png, client/assets/art/art.json 갱신
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'client', 'assets', 'art')
KEYS = {'green': (0, 255, 0), 'magenta': (255, 0, 255), 'black': (0, 0, 0)}


def detect_bg(im):
    w, h = im.size
    px = im.load()
    samples = [px[x, y][:3] for x in range(0, w, max(1, w // 20)) for y in (0, h - 1)]
    samples += [px[x, y][:3] for y in range(0, h, max(1, h // 20)) for x in (0, w - 1)]
    avg = tuple(sum(c[i] for c in samples) / len(samples) for i in range(3))
    return min(KEYS, key=lambda k: sum((avg[i] - KEYS[k][i]) ** 2 for i in range(3)))


def key_out(im, bg):
    """배경색에 가까운 픽셀을 투명하게. 경계는 부드럽게, 색 번짐은 제거."""
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if bg == 'green':
                k = g - max(r, b)            # 초록 우세 정도
                if k > 90: px[x, y] = (0, 0, 0, 0); continue
                if k > 30:
                    alpha = int(255 * (90 - k) / 60)
                    px[x, y] = (r, max(r, b), b, min(a, alpha)); continue
                if k > 0: px[x, y] = (r, max(r, b) + k // 2, b, a)
            elif bg == 'magenta':
                k = min(r, b) - g
                if k > 90: px[x, y] = (0, 0, 0, 0); continue
                if k > 30:
                    alpha = int(255 * (90 - k) / 60)
                    m = g + (k // 3)
                    px[x, y] = (min(r, m + 40), g, min(b, m + 40), min(a, alpha)); continue
            elif bg == 'black':
                # 빛 효과: 밝기를 알파로 사용 (가산 합성용)
                v = max(r, g, b)
                if v < 12: px[x, y] = (0, 0, 0, 0); continue
                s = 255 / v
                px[x, y] = (min(255, int(r * s)), min(255, int(g * s)), min(255, int(b * s)), v)
    # 1px 남은 테두리 잡티 제거
    if bg != 'black':
        im.putalpha(im.getchannel('A').filter(ImageFilter.MinFilter(3)))
    return im


def to_iso_tile(im, width):
    """정사각형 텍스처 -> 2:1 다이아몬드."""
    im = im.convert('RGBA')
    s = min(im.size)
    im = im.crop((0, 0, s, s)).resize((512, 512), Image.LANCZOS)
    rot = im.rotate(45, resample=Image.BICUBIC, expand=True)
    rot = rot.resize((width, width // 2), Image.LANCZOS)
    mask = Image.new('L', rot.size, 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(mask)
    w, h = rot.size
    d.polygon([(w / 2, 0), (w, h / 2), (w / 2, h), (0, h / 2)], fill=255)
    rot.putalpha(mask)
    return rot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('name')
    ap.add_argument('--bg', default='auto')
    ap.add_argument('--height', type=int, default=0, help='결과 높이(px). 0이면 원본 유지')
    ap.add_argument('--tile', type=int, default=0, help='바닥 타일 가로 폭(px)')
    a = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    im = Image.open(a.src)
    if a.tile:
        out = to_iso_tile(im, a.tile)
    else:
        im = im.convert('RGB')
        bg = detect_bg(im) if a.bg == 'auto' else a.bg
        out = key_out(im, bg)
        bbox = out.getchannel('A').getbbox()
        if not bbox:
            sys.exit('배경을 지우고 나니 남은 게 없습니다. --bg 를 확인하세요.')
        out = out.crop(bbox)
        if a.height:
            w = round(out.width * a.height / out.height)
            out = out.resize((w, a.height), Image.LANCZOS)
        print(f'배경: {bg}')
    path = os.path.join(OUT, a.name + '.png')
    out.save(path, optimize=True)

    man_path = os.path.join(OUT, 'art.json')
    man = {}
    if os.path.exists(man_path):
        with open(man_path, encoding='utf-8') as f:
            man = json.load(f)
    man[a.name] = {'w': out.width, 'h': out.height}
    with open(man_path, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=1, sort_keys=True)
    print(f'저장: {path} ({out.width}x{out.height})')


if __name__ == '__main__':
    main()
