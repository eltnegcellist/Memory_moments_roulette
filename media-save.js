/* Save generated media to a user-selected location on supported browsers. */
(()=>{
'use strict';
const mediaTypes={
  '.mp4':{type:'video/mp4',folder:'videos',label:'MP4 動画'},
  '.webm':{type:'video/webm',folder:'videos',label:'WebM 動画'},
  '.gif':{type:'image/gif',folder:'pictures',label:'GIF 画像'},
  '.png':{type:'image/png',folder:'pictures',label:'PNG 画像'},
  '.jpg':{type:'image/jpeg',folder:'pictures',label:'JPEG 画像'},
  '.jpeg':{type:'image/jpeg',folder:'pictures',label:'JPEG 画像'},
  '.webp':{type:'image/webp',folder:'pictures',label:'WebP 画像'}
};
function extension(filename){
  return (String(filename||'').match(/\.[a-z0-9]+$/i)||[''])[0].toLowerCase();
}
function download(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function prepare(filename){
  if(typeof window.showSaveFilePicker!=='function')return {mode:'download'};
  const ext=extension(filename);
  const media=mediaTypes[ext];
  const options={
    suggestedName:filename,
    id:media?.folder==='videos'?'memory-roulette-videos':media?.folder==='pictures'?'memory-roulette-pictures':'memory-roulette-files',
    startIn:media?.folder||'downloads'
  };
  if(media)options.types=[{description:media.label,accept:{[media.type]:[ext]}}];
  try{
    // This must run immediately in the user's click handler, before long-running encoding.
    const handle=await window.showSaveFilePicker(options);
    return {mode:'picker',handle,extension:ext};
  }catch(err){
    if(err?.name==='AbortError')return {mode:'cancelled'};
    console.warn('Save picker unavailable; falling back to downloads',err);
    return {mode:'download',warning:'保存先を選択できなかったため、通常のダウンロードを使用します。'};
  }
}
async function finish(blob,filename,prepared){
  const target=prepared||await prepare(filename);
  if(target.mode==='cancelled')return {mode:'cancelled'};
  if(target.mode==='picker'){
    if(target.extension!==extension(filename)){
      download(blob,filename);
      return {mode:'download',warning:'生成された動画形式が変わったため、正しい拡張子でダウンロードします。'};
    }
    let writer;
    try{
      writer=await target.handle.createWritable();
      await writer.write(blob);
      await writer.close();
      return {mode:'picker'};
    }catch(err){
      try{await writer?.abort();}catch(e){}
      console.warn('Direct media save failed; falling back to downloads',err);
      download(blob,filename);
      return {mode:'download',warning:'選択したフォルダへの書き込みができず、通常のダウンロードに切り替えました。'};
    }
  }
  download(blob,filename);
  return {mode:'download',warning:target.warning||''};
}
window.__memoryPrepareMediaSave=prepare;
window.__memoryWriteMediaSave=finish;
window.__memorySaveMediaFile=(blob,filename)=>finish(blob,filename);
})();
