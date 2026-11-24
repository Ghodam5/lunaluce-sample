# 「11 画像の頼み方」のことばと見本画像を、林さんの「指示ことば見本帳.html」から作る（OMS 2.59）
# 使い方: python3 tools/image-words.py 指示ことば見本帳.html oms/image-words
#   → oms/image-words/words.json と img/*.webp（見本帳の画像を縮めて WebP に）。英語のことばがない段は下の EN で足す。要 Pillow
import re, sys, json, base64, io, html, os
from PIL import Image
src, outdir = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
os.makedirs(outdir + '/img', exist_ok=True)
def txt(x): return html.unescape(re.sub(r'<[^>]+>', '', x)).strip()
cats = []
for cm in re.finditer(r'<section class="cat" id="([^"]+)">(.*?)(?=<section class="cat"|<footer|</main>)', s, re.S):
    cid, body = cm.group(1), cm.group(2)
    name = txt(re.search(r'<h2>(.*?)<span', body, re.S).group(1))
    intro = txt(re.search(r'<p class="intro">(.*?)</p>', body, re.S).group(1))
    how = [txt(x) for x in re.findall(r'<li>(.*?)</li>', re.search(r'<ol class="how">(.*?)</ol>', body, re.S).group(1), re.S)]
    secs, combos = [], []
    for sm in re.finditer(r'<section class="sec" id="([^"]+)">(.*?)</section>', body, re.S):
        sid, sb = sm.group(1), sm.group(2)
        title = txt(re.search(r'<h3>(.*?)</h3>', sb, re.S).group(1))
        note = re.search(r'<p class="sec-intro">(.*?)</p>', sb, re.S)
        if 'class="combo"' in sb:
            for co in re.finditer(r'<article class="combo".*?<h4>(.*?)</h4>\s*<pre>(.*?)</pre>', sb, re.S):
                combos.append({'title': txt(co.group(1)), 'text': txt(co.group(2))})
            continue
        terms = []
        for i, tm in enumerate(re.finditer(r'<article class="term( wide)?"[^>]*>(.*?)</article>', sb, re.S)):
            tb = tm.group(2)
            tid = sid + '-' + str(i + 1)
            img = re.search(r'src="data:image/jpeg;base64,([^"]+)"', tb)
            if img:
                im = Image.open(io.BytesIO(base64.b64decode(img.group(1)))).convert('RGB')
                im.thumbnail((560, 560) if tm.group(1) else (420, 420))
                im.save(outdir + '/img/' + tid + '.webp', 'WEBP', quality=72, method=6)
            ex = re.search(r'class="example-text">例：「(.*?)」</span>', tb, re.S)
            en = re.search(r'<p class="en">(.*?)</p>', tb, re.S)
            terms.append({'id': tid, 'name': txt(re.search(r'<h4>(.*?)</h4>', tb, re.S).group(1)),
                          'blurb': txt(re.search(r'class="blurb">(.*?)</p>', tb, re.S).group(1)),
                          'say': txt(ex.group(1)) if ex else '', 'en': txt(en.group(1)) if en else '',
                          'wide': bool(tm.group(1)), 'img': 'img/' + tid + '.webp' if img else ''})
        secs.append({'id': sid, 'title': title, 'note': txt(note.group(1)) if note else '', 'terms': terms})
    cats.append({'id': cid, 'name': name, 'intro': intro, 'how': how, 'sections': secs, 'combos': combos})
json.dump({'source': '指示ことば見本帳.html（林さん作、2026-11-24）', 'categories': cats}, open(outdir + '/words.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
n = sum(len(x['terms']) for c in cats for x in c['sections'])
print(len(cats), n, sum(1 for c in cats for x in c['sections'] for t in x['terms'] if not t['en']))

# 英語のことば（見本帳に英語がない段）
EN = {
'video-move': ['slow zoom in','slow zoom out','pan left to right','tilt down','dolly in','dolly out','orbit around the product','tracking shot','static locked-off camera'],
'video-shot': ['long shot','medium shot','close-up'],
'video-speed': ['slow motion','real-time speed','time-lapse'],
'video-trans': ['hard cut','cross-fade','wipe transition'],
'video-shape': ['vertical 9:16','square 1:1','horizontal 16:9','short, under 15 seconds','30 to 60 seconds'],
'video-mood': ['soft, gentle mood','upbeat, rhythmic pacing','luxurious, slow and calm'],
'illust-touch': ['watercolor illustration','line drawing, no color','flat illustration, minimal shading','anime style','picture book style','pencil sketch','Japanese ink painting style, sumi-e','simple icon style','oil painting style, thick brushstrokes'],
'illust-color': ['pale pastel colors','vivid bold colors','limited color palette','monochrome, single color','seasonal colors'],
'illust-line': ['thin clean lines','thick bold lines','no outlines','hand-drawn wobbly lines'],
'illust-other': ['ample negative space','with background scene','plain white background','cute, sparkles','elegant, refined','hand-drawn crayon texture','three-dimensional shading'],
'slides-layout': ['title and body layout','diagram left, text right','big number as headline','full-bleed photo with text overlay','row of cards','split top and bottom'],
'slides-types': ['comparison table','step-by-step flow','timeline','before and after','pie chart','mind map'],
'slides-text': ['minimal text','moderate text','detailed text'],
'slides-color': ['soft pastel palette','bold high-contrast palette','white background','dark background, light text'],
'slides-carousel': ['hook on the first slide','slide numbers','consistent template','summary on the last slide','swipe cue'],
'sns-textplace': ['large centered text','text on a bottom band','small text at the top','text in the empty space','text only, no photo'],
'sns-font': ['elegant serif (Mincho) font','clean sans-serif (Gothic) font','handwritten font','heavy bold font'],
'sns-ratio': ['1:1 square','4:5 portrait','9:16 vertical','16:9 horizontal'],
'sns-margin': ['ample white space','dense full layout','white border around the product'],
'sns-eye': ['one big catchphrase','product as the hero','big numbers','question headline','before and after split'],
'sns-color': ['bright soft colors','luxurious dark and gold','seasonal colors','white-based clean','dark background with white text'],
'app-parts': ['header bar','footer navigation','rounded button','card','modal dialog','side menu'],
'app-parts2': ['tabs','input fields','list','banner','toast notification','icons'],
'app-pattern': ['hero image layout','card grid','product grid','single-column article','minimal layout','vertical scroll'],
'app-space': ['generous spacing','compact spacing'],
'app-motion': ['press-down button','bottom sheet','fade in','slide transition','reveal on scroll'],
}
for c in cats:
    for s2 in c['sections']:
        if s2['id'] in EN:
            assert len(EN[s2['id']]) == len(s2['terms']), s2['id']
            for t, e in zip(s2['terms'], EN[s2['id']]):
                if not t['en']: t['en'] = e
json.dump({'source': '指示ことば見本帳.html（林さん作、2026-11-24）', 'categories': cats}, open(outdir + '/words.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
