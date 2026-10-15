"""Export separated transparent sprites, shared size/origin, and basket layers.
Run from any directory. Requires Pillow. Originals are kept unchanged.
"""
from pathlib import Path
from collections import deque
import json
from PIL import Image, ImageDraw, ImageChops

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parent / 'public' / 'asset-styles'
KINDS = ['basket', 'balea', 'alverde', 'ebelin', 'coupon', 'bomb', 'box']

def object_bounds(image):
    # Components avoid cutting broad baskets/tickets at nominal grid boundaries.
    small = image.getchannel('A').resize((400,400))
    data = list(small.getdata()); seen = bytearray(len(data))
    groups = [[] for _ in KINDS]
    centers = [(1/6,.19),(.5,.19),(5/6,.19),(1/6,.54),(.5,.54),(5/6,.54),(1/6,.84)]
    for start, value in enumerate(data):
        if value < 32 or seen[start]: continue
        seen[start] = 1; q = deque([start]); points = []
        while q:
            index = q.popleft(); x,y = index%400,index//400; points.append((x,y))
            for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
                nx,ny=x+dx,y+dy
                if 0<=nx<400 and 0<=ny<400:
                    n=ny*400+nx
                    if not seen[n] and data[n]>=32: seen[n]=1;q.append(n)
        if len(points)<10:continue
        xs,ys=zip(*points); cx,cy=sum(xs)/len(xs)/400,sum(ys)/len(ys)/400
        kind=min(range(7),key=lambda i:(cx-centers[i][0])**2+(cy-centers[i][1])**2)
        groups[kind].append((min(xs),min(ys),max(xs)+1,max(ys)+1))
    bounds=[]
    for group in groups:
        assert group, 'Missing sprite'
        x0=min(b[0] for b in group);y0=min(b[1] for b in group)
        x1=max(b[2] for b in group);y1=max(b[3] for b in group)
        sx,sy=image.width/400,image.height/400
        bounds.append((max(0,int(x0*sx)-8),max(0,int(y0*sy)-8),min(image.width,int(x1*sx)+8),min(image.height,int(y1*sy)+8)))
    return bounds

for job in json.loads((HERE/'sprite-prompts.json').read_text())['assets']:
    source=HERE/job['file']
    image=Image.open(source).convert('RGBA')
    assert image.getchannel('A').getextrema()[0]==0
    folder=OUTPUT/job['id'];folder.mkdir(parents=True,exist_ok=True)
    for kind,bounds in zip(KINDS,object_bounds(image)):
        obj=image.crop(bounds)
        if kind=='basket':
            size=(360,336); obj.thumbnail((300,292),Image.Resampling.LANCZOS)
            # Basket mouth aligns to y=126 = 42 logical units, the engine origin.
            mouth_fraction=.48
            y=round(126-obj.height*mouth_fraction)
            canvas=Image.new('RGBA',size);canvas.alpha_composite(obj,((360-obj.width)//2,y))
        else:
            size=(216,174) if kind=='coupon' else (192,228)
            maximum=(190,150) if kind=='coupon' else (168,204)
            obj.thumbnail(maximum,Image.Resampling.LANCZOS)
            canvas=Image.new('RGBA',size)
            canvas.alpha_composite(obj,((size[0]-obj.width)//2,(size[1]-obj.height)//2))
        canvas.save(folder/(kind+'.png'))
        if kind=='basket':
            for part,region in [('basketBack',(0,0,360,126)),('basketFront',(0,126,360,336))]:
                layer=Image.new('RGBA',size);layer.paste(canvas.crop(region),(region[0],region[1]));layer.save(folder/(part+'.png'))
        assert canvas.getchannel('A').getbbox(), kind
    print(job['id'], '9 PNGs exported')
    back=Image.open(folder/'basketBack.png')
    front=Image.open(folder/'basketFront.png')
    basket=Image.open(folder/'basket.png')
    stacked=Image.alpha_composite(back,front)
    for color in ['black','white']:
        bg=Image.new('RGBA',basket.size,color)
        diff=ImageChops.difference(Image.alpha_composite(bg,stacked),Image.alpha_composite(bg,basket))
        assert not diff.convert('RGB').getbbox(), 'Basket layers must stack without seams'

report=[]
for folder in sorted(OUTPUT.iterdir()):
    files=list(folder.glob('*.png'));assert len(files)==9
    for file in files:
        im=Image.open(file)
        assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0
        report.append({'style':folder.name,'asset':file.stem,'size':list(im.size),'bytes':file.stat().st_size})
(HERE/'sprite-validation.json').write_text(json.dumps({'basket_layers_match':True,'sprites':report},indent=2)+'\n')

sheet=Image.new('RGB',(1200,5*190),'#0A1931');draw=ImageDraw.Draw(sheet)
for row,job in enumerate(json.loads((HERE/'sprite-prompts.json').read_text())['assets']):
    draw.text((8,row*190+8),job['id'],fill='white')
    for col,kind in enumerate(KINDS):
        im=Image.open(OUTPUT/job['id']/(kind+'.png'));im.thumbnail((150,140),Image.Resampling.LANCZOS)
        sheet.paste(im,(col*170+(170-im.width)//2,row*190+30),im)
sheet.save(HERE/'styles-contact-sheet.jpg',quality=95)
