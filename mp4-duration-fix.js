/* Repair fragmented MP4 duration headers before saving Android MediaRecorder movies.
 * Some gallery apps read the mvhd/tkhd header (often 0 or ~3s) instead of the
 * actual moof/trun sample timeline (~12s). Samples are never transcoded. */
(function(scope){
'use strict';
function u64(v,p){return v.getUint32(p)*4294967296+v.getUint32(p+4);}
function put64(v,p,n){v.setUint32(p,Math.floor(n/4294967296));v.setUint32(p+4,n>>>0);}
function boxes(v,from,to){
  const result=[];
  for(let p=from;p+8<=to;){
    let size=v.getUint32(p),header=8;
    if(size===1){if(p+16>to)throw Error('MP4の拡張ボックスが不正です');size=u64(v,p+8);header=16;}
    if(size===0)size=to-p;
    if(!Number.isSafeInteger(size)||size<header||p+size>to)throw Error('MP4のボックス長が不正です');
    const type=String.fromCharCode(...new Uint8Array(v.buffer,v.byteOffset+p+4,4));
    result.push({type,from:p,data:p+header,end:p+size});
    p+=size;
  }
  return result;
}
const find=(items,type)=>items.find(x=>x.type===type);
const version=(v,b)=>v.getUint8(b.data);
const flags=(v,b)=>v.getUint8(b.data+1)*65536+v.getUint8(b.data+2)*256+v.getUint8(b.data+3);
function header(v,b,kind){
  const wide=version(v,b)===1;
  if(kind==='tkhd'){
    const id=v.getUint32(b.data+(wide?20:12));
    const pos=b.data+(wide?32:20);
    return {id,pos,wide,duration:wide?u64(v,pos):v.getUint32(pos)};
  }
  const scale=v.getUint32(b.data+(wide?20:12)),pos=b.data+(wide?24:16);
  return {scale,pos,wide,duration:wide?u64(v,pos):v.getUint32(pos)};
}
function setDuration(v,h,value){
  const n=Math.max(0,Math.round(value));
  if(!Number.isSafeInteger(n)||(!h.wide&&n>0xffffffff))throw Error('MP4の再生時間が不正です');
  if(h.wide)put64(v,h.pos,n);else v.setUint32(h.pos,n);
}
function parseTracks(v,moovBoxes){
  const tracks=new Map();
  for(const b of moovBoxes){
    if(b.type!=='trak')continue;
    const children=boxes(v,b.data,b.end),tkhd=find(children,'tkhd'),mdia=find(children,'mdia');
    if(!tkhd||!mdia)continue;
    const mdhd=find(boxes(v,mdia.data,mdia.end),'mdhd');
    if(!mdhd)continue;
    const movie=header(v,tkhd,'tkhd'),media=header(v,mdhd,'mdhd');
    if(media.scale)tracks.set(movie.id,{movie,media,end:0});
  }
  return tracks;
}
function trexDefaults(v,mvex){
  const values=new Map();
  if(mvex)for(const b of boxes(v,mvex.data,mvex.end))
    if(b.type==='trex')values.set(v.getUint32(b.data+4),v.getUint32(b.data+12));
  return values;
}
function scanFragment(v,traf,tracks,defaults){
  const list=boxes(v,traf.data,traf.end);
  const tfhd=find(list,'tfhd'),tfdt=find(list,'tfdt');
  if(!tfhd||!tfdt)return;
  const id=v.getUint32(tfhd.data+4),track=tracks.get(id);
  if(!track)return;
  const f=flags(v,tfhd);
  let off=tfhd.data+8;
  if(f&1)off+=8;
  if(f&2)off+=4;
  let defaultDuration=defaults.get(id)||0;
  if(f&8){defaultDuration=v.getUint32(off);off+=4;}
  const base=version(v,tfdt)===1?u64(v,tfdt.data+4):v.getUint32(tfdt.data+4);
  let end=base,hasSamples=false;
  for(const run of list){
    if(run.type!=='trun')continue;
    const rf=flags(v,run),count=v.getUint32(run.data+4);
    let p=run.data+8;
    if(rf&1)p+=4;
    if(rf&4)p+=4;
    let total=0;
    for(let i=0;i<count;i++){
      let dur=defaultDuration;
      if(rf&0x100){dur=v.getUint32(p);p+=4;}
      if(rf&0x200)p+=4;
      if(rf&0x400)p+=4;
      if(rf&0x800)p+=4;
      total+=dur;
    }
    if(count){hasSamples=true;end+=total;}
  }
  if(hasSamples)track.end=Math.max(track.end,end);
}
function patch(buffer,expectedSeconds){
  const view=new DataView(buffer),roots=boxes(view,0,buffer.byteLength);
  const moov=find(roots,'moov'),fragments=roots.filter(x=>x.type==='moof');
  if(!moov||!fragments.length)return {buffer,patched:false,reason:'not-fragmented'};
  const parts=boxes(view,moov.data,moov.end),mvhd=find(parts,'mvhd');
  if(!mvhd)throw Error('MP4の再生時間情報がありません');
  const movie=header(view,mvhd,'mvhd'),tracks=parseTracks(view,parts);
  if(!movie.scale||!tracks.size)throw Error('MP4の動画トラック情報が不正です');
  const mvex=find(parts,'mvex'),defaults=trexDefaults(view,mvex);
  for(const fragment of fragments){
    for(const child of boxes(view,fragment.data,fragment.end))
      if(child.type==='traf')scanFragment(view,child,tracks,defaults);
  }
  const durations=[...tracks.values()].filter(t=>t.end>0).map(t=>t.end/t.media.scale);
  const seconds=Math.max(0,...durations);
  if(!Number.isFinite(seconds)||seconds<=0)throw Error('MP4の再生時間を取得できませんでした');
  if(Number.isFinite(expectedSeconds)&&Math.abs(seconds-expectedSeconds)>Math.max(1.5,expectedSeconds*.12))
    throw Error('録画した動画の再生時間が予定と一致しません。再度お試しください');
  const previousHeaderSeconds=movie.duration/movie.scale;
  setDuration(view,movie,seconds*movie.scale);
  for(const t of tracks.values()){
    if(!t.end)continue;
    setDuration(view,t.media,t.end);
    setDuration(view,t.movie,t.end/t.media.scale*movie.scale);
  }
  if(mvex)for(const b of boxes(view,mvex.data,mvex.end))
    if(b.type==='mehd')setDuration(view,{pos:b.data+4,wide:version(view,b)===1},seconds*movie.scale);
  return {buffer,patched:true,seconds,previousHeaderSeconds,
    tracks:[...tracks.values()].map(t=>({seconds:t.end/t.media.scale}))};
}
async function normalize(blob,expectedSeconds){
  if(!blob||!blob.size||!blob.type.startsWith('video/mp4'))return {blob,patched:false};
  const result=patch(await blob.arrayBuffer(),expectedSeconds);
  return result.patched?{...result,blob:new Blob([result.buffer],{type:'video/mp4'})}:{blob,patched:false};
}
scope.__memoryFixMp4Duration=normalize;
scope.__memoryPatchMp4DurationBuffer=patch;
})(typeof window!=='undefined'?window:globalThis);
