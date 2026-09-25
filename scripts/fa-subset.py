"""Build the self-hosted Font Awesome subset in public/assets/fa/.

The store used the full Font Awesome 6.5.1 from cdnjs: ~20 kB of CSS plus
~290 kB of icon fonts on every phone, for a few dozen icons. This keeps only
the icons the code actually names.

Run it again whenever you add an icon (a new `fa-...` class or a CSS
`content: "\\fXXX"`); src/shared/__tests__/faSubset.test.js fails until you do.

    python -m pip install --user fonttools brotli
    python scripts/fa-subset.py
"""
import json, os, re, sys, urllib.request
from io import BytesIO
from fontTools import subset
from fontTools.ttLib import TTFont

VERSION = '6.5.1'
CDN = f'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/{VERSION}'
FONTS = ['fa-solid-900', 'fa-regular-400', 'fa-brands-400']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'fa')
SCAN_DIRS = [os.path.join(ROOT, 'src'), os.path.join(ROOT, 'public', 'js')]
SCAN_FILES = [os.path.join(ROOT, 'index.html')]
SCAN_EXT = ('.js', '.jsx', '.css', '.html')


def fetch(url):
    with urllib.request.urlopen(url) as r:
        return r.read()


def sources():
    for d in SCAN_DIRS:
        for base, _, files in os.walk(d):
            if '__tests__' in base:
                continue
            for f in files:
                if f.endswith(SCAN_EXT):
                    yield os.path.join(base, f)
    yield from SCAN_FILES


def used_names_and_codepoints():
    names, codepoints = set(), set()
    for path in sources():
        text = open(path, encoding='utf-8', errors='ignore').read()
        names.update(re.findall(r'\bfa-[a-z0-9]+(?:-[a-z0-9]+)*', text))
        # CSS glyphs drawn straight from the font, e.g. content: "\f061"
        for cp in re.findall(r'content:\s*["\']\\(f[0-9a-f]{3})["\']', text, re.I):
            codepoints.add(int(cp, 16))
    return names, codepoints


def main():
    css = fetch(f'{CDN}/css/all.min.css').decode('utf-8')
    names, extra_cps = used_names_and_codepoints()

    # Every icon rule looks like .fa-leaf:before{content:"\f06c"} (several
    # aliases may share one rule). Everything else is kept as is.
    rule = re.compile(r'([^{}@]+)\{content:"\\([0-9a-f]+)"\}')
    kept_icons, codepoints = {}, set(extra_cps)

    def filter_rule(m):
        selectors = [s.strip() for s in m.group(1).split(',')]
        icon_sel = [s for s in selectors if re.fullmatch(r'\.fa-[a-z0-9-]+::?before', s)]
        if not icon_sel or len(icon_sel) != len(selectors):
            return m.group(0)
        keep = [s for s in icon_sel if s.split(':')[0][1:] in names]
        if not keep:
            return ''
        cp = int(m.group(2), 16)
        codepoints.add(cp)
        for s in keep:
            kept_icons[s.split(':')[0][1:]] = m.group(2)
        return ','.join(keep) + '{content:"\\' + m.group(2) + '"}'

    css = rule.sub(filter_rule, css)
    # The v4 compatibility font is never used here.
    css = re.sub(r'@font-face\{[^}]*fa-v4compatibility[^}]*\}', '', css)
    css = css.replace('../webfonts/', './')
    # Only woff2 is shipped; every browser the store supports reads it.
    css = re.sub(r',url\(\./[^)]+\.ttf\) format\("truetype"\)', '', css)

    os.makedirs(OUT, exist_ok=True)
    sizes = {}
    for name in FONTS:
        font = TTFont(BytesIO(fetch(f'{CDN}/webfonts/{name}.woff2')))
        cmap = font.getBestCmap()
        want = sorted(cp for cp in codepoints if cp in cmap)
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.notdef_outline = True
        sub = subset.Subsetter(options=opts)
        sub.populate(unicodes=want or [0x20])
        sub.subset(font)
        path = os.path.join(OUT, f'{name}.woff2')
        font.flavor = 'woff2'
        font.save(path)
        sizes[name] = os.path.getsize(path)

    header = (f'/* Font Awesome Free {VERSION} (https://fontawesome.com, icons CC BY 4.0, '
              f'fonts SIL OFL 1.1, code MIT) - subset built by scripts/fa-subset.py. '
              f'Do not edit; re-run the script. */\n')
    open(os.path.join(OUT, 'fa-subset.css'), 'w', encoding='utf-8').write(header + css)
    manifest = {'version': VERSION, 'icons': dict(sorted(kept_icons.items())),
                'codepoints': sorted(f'{cp:x}' for cp in codepoints)}
    json.dump(manifest, open(os.path.join(OUT, 'icons.json'), 'w', encoding='utf-8'), indent=1)
    print(f'{len(kept_icons)} icon names, {len(codepoints)} glyphs')
    print('css', os.path.getsize(os.path.join(OUT, 'fa-subset.css')), 'bytes;', ', '.join(f'{k} {v} bytes' for k, v in sizes.items()))


if __name__ == '__main__':
    sys.exit(main())
