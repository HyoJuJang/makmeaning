#!/usr/bin/env python3
"""Register an already-generated, visually approved transparent PNG without editing pixels."""
from pathlib import Path
import argparse, csv, hashlib, json, os, re, shutil, tempfile
import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[1]
def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.'+path.name, dir=path.parent)
    with os.fdopen(fd, 'w') as f:
        json.dump(value, f, ensure_ascii=False, indent=2); f.write('\n')
    os.replace(name, path)

def register(job_path):
    job=json.loads(job_path.read_text())
    if job['status']=='registered': return {'key':job['key'],'status':'already_registered'}
    if job['status']!='generated' or not job.get('visualReview','').startswith('passed:'):
        raise ValueError('A generated PNG must be visually reviewed before registration')
    for field in ['key','domain','familyId','color','pattern']:
        if not re.fullmatch('[a-z][a-z0-9_-]*',job[field]):raise ValueError('Unsafe asset identifier')
    with (REPO/'data/catalog/products.csv').open(encoding='utf-8-sig',newline='') as f:
        products={r['prd_id']:r for r in csv.DictReader(f)}
    ids=job['approvedProductIds']
    if not ids or len(set(ids))!=len(ids):raise ValueError('Explicit, unique reviewed product IDs required')
    if any(i not in products or products[i]['domain']!=job['domain'] for i in ids):raise ValueError('Product domain mismatch')
    source=Path(job['generatedPath'])
    with Image.open(source) as im:
        if im.format!='PNG' or 'A' not in im.getbands():raise ValueError('Transparent PNG required')
        alpha=np.asarray(im.getchannel('A'))
        if float((alpha==0).sum())/alpha.size<.2:raise ValueError('Insufficient real alpha transparency')
        mask=alpha>=200
        xs=np.where(mask.sum(axis=0)>8)[0];ys=np.where(mask.sum(axis=1)>8)[0]
        if len(xs)<10 or len(ys)<10:raise ValueError('No visible object')
        x0=max(0,int(xs[0])-12);y0=max(0,int(ys[0])-12)
        x1=min(im.width,int(xs[-1])+13);y1=min(im.height,int(ys[-1])+13)
        width,height=im.size
    destination=REPO/'app/assets/game-items/v1'/job['domain']/job['familyId']/(job['key']+'.png')
    sha=hashlib.sha256(source.read_bytes()).hexdigest()
    if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest()!=sha:
        raise ValueError('Refusing to overwrite a different asset')
    destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,destination)
    asset_id=job['familyId']+'--'+job['key']
    asset=dict(id=asset_id,familyId=job['familyId'],color=job['color'],pattern=job['pattern'],
      domain=job['domain'],label=job['label'].replace(' · 형태 확인 필요', ''),version='v1',sourcePath=str(destination.relative_to(REPO)),
      url='/'+str(destination.relative_to(REPO/'app')),width=width,height=height,
      frame=dict(x=x0,y=y0,width=x1-x0,height=y1-y0),anchor=dict(x=.5,y=.98),placement=job['placement'],
      sha256=sha,status='ready',generationMethod='built-in image_gen',colorPolicy='exact',approvedProductIds=ids,
      notes='검수한 대표 상품 이미지에 기반한 공용 게임 표현. 구매 옵션의 정확한 재현이나 가상 피팅이 아님.')
    manifest_path=REPO/'data/game-assets/manifest.json';manifest=json.loads(manifest_path.read_text())
    existing=next((a for a in manifest['assets'] if a['id']==asset_id),None)
    if existing and existing!=asset:raise ValueError('Asset registration already exists with different metadata')
    if not existing:manifest['assets'].append(asset)
    override_path=REPO/'data/game-assets/product-overrides.json'
    overrides=json.loads(override_path.read_text()) if override_path.exists() else []
    for product_id in ids:
        override=dict(prd_id=product_id,familyId=job['familyId'],color=job['color'],pattern=job['pattern'],
          mappingStatus='classified',evidence=[f'실제 대표 이미지 시각 검수: https://asset.m-gs.kr/prod/{product_id}/1/550',job.get('reviewEvidence',job['subject']),'대표 이미지 색상 기준; 구매 선택 옵션은 미확인'],reasons=[])
        old=next((i for i,v in enumerate(overrides) if v['prd_id']==product_id),None)
        if old is None:overrides.append(override)
        else:overrides[old]=override
    # Both files are individually atomic; checkpoint makes an interrupted registration retryable.
    save(manifest_path,manifest);save(override_path,overrides)
    job.update(status='registered',assetId=asset_id,sourcePath=asset['sourcePath'],url=asset['url'],sha256=sha,
      alphaValidation='passed',frame=asset['frame'])
    save(job_path,job)
    return {'key':job['key'],'assetId':asset_id,'productIds':ids,'alpha':'passed'}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('jobs',nargs='+');args=parser.parse_args()
    for job in args.jobs:print(json.dumps(register(Path(job)),ensure_ascii=False),flush=True)
