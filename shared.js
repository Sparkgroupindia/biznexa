/* BizNexa: GitHub Pages -> Apps Script JSONP reads + hidden-form writes (no CORS/preflight). */
(function(){'use strict';
const conf=window.BX_CONFIG||{};
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+(Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=v=>v?new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—';
const phone=s=>String(s||'').replace(/\D/g,'').replace(/^0+/,'');
const wa=(num,msg)=>'https://wa.me/'+(phone(num).length===10?'91'+phone(num):phone(num))+'?text='+encodeURIComponent(msg||'');
const getParams=()=>new URLSearchParams(location.search);
const site=()=>location.href.slice(0,location.href.lastIndexOf('/')+1);
const cardLink=id=>site()+'card.html?id='+encodeURIComponent(id);
const catalogLink=id=>site()+'catalog.html?id='+encodeURIComponent(id);
const invoiceLink=(id,token)=>site()+'invoice.html?id='+encodeURIComponent(id)+'&token='+encodeURIComponent(token);
const token=(role='client')=>localStorage.getItem('bx_'+role+'_token')||'';
const setToken=(role,v)=>localStorage.setItem('bx_'+role+'_token',v);
const clearToken=role=>localStorage.removeItem('bx_'+role+'_token');
const themes=['amber','ocean','emerald','rose','slate','violet'];
const theme=t=>document.documentElement.dataset.theme=themes.includes(t)?t:'amber';
const rand=()=>{if(crypto&&crypto.randomUUID)return crypto.randomUUID().replace(/-/g,'');return 'r'+Date.now()+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)};
const ensure=()=>{if(!/^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec(?:\?.*)?$/.test(conf.API_URL||''))throw Error('config.js में Apps Script /exec URL पेस्ट करें।');};
const get=(action,payload={},ms=25000)=>new Promise((resolve,reject)=>{
  try{ensure()}catch(e){reject(e);return}
  const cb='bxcb_'+rand().replace(/[^a-zA-Z0-9_]/g,'');const sc=document.createElement('script');let finished=false;
  const timeout=setTimeout(()=>done(Error('Server response timeout. Retry.')),ms);
  function done(err,data){if(finished)return;finished=true;clearTimeout(timeout);delete window[cb];sc.remove();err?reject(err):resolve(data)}
  window[cb]=(response)=>{if(!response||!response.ok)done(Error(response?.error||'Server error'));else done(null,response.data)};
  sc.onerror=()=>done(Error('Cannot reach Apps Script. Check deployment permissions and config URL.'));
  sc.src=conf.API_URL+(conf.API_URL.includes('?')?'&':'?')+'action='+encodeURIComponent(action)+'&payload='+encodeURIComponent(JSON.stringify(payload))+'&callback='+cb+'&_='+Date.now();
  document.head.appendChild(sc);
});
const post=(action,payload={},ms=65000)=>new Promise((resolve,reject)=>{
  try{ensure()}catch(e){reject(e);return}
  const rid=rand()+rand();const frame=document.createElement('iframe');frame.name='bxframe_'+rid;frame.style.display='none';frame.setAttribute('title','Background request');
  const form=document.createElement('form');form.method='POST';form.action=conf.API_URL;form.target=frame.name;form.style.display='none';
  function input(k,v){const el=document.createElement('input');el.name=k;el.value=v;form.appendChild(el)}
  input('action',action);input('rid',rid);input('payload',JSON.stringify(payload));
  document.body.append(frame,form);let ended=false;const started=Date.now();let timer;
  function finish(err,data){if(ended)return;ended=true;clearTimeout(timer);form.remove();setTimeout(()=>frame.remove(),100);err?reject(err):resolve(data)}
  async function poll(){if(ended)return;if(Date.now()-started>ms){finish(Error('Write response timeout. Check dashboard before repeating to avoid duplicate orders.'));return}
    try{const r=await get('receipt',{rid},12000);if(r){if(!r.ok)finish(Error(r.error||'Server error'));else finish(null,r.data);return}}
    catch(e){ /* keep polling: the form request might still be executing */ }
    timer=setTimeout(poll,1000);
  }
  form.submit();timer=setTimeout(poll,850);
});
function notice(msg,type='info'){let box=$('#toast');if(!box){box=document.createElement('div');box.id='toast';document.body.appendChild(box)}box.textContent=msg;box.className='toast '+type;box.style.display='block';clearTimeout(window.__bxToast);window.__bxToast=setTimeout(()=>box.style.display='none',4300)}
function busy(btn,state,label){if(!btn)return;if(state){btn.dataset.oldLabel=btn.textContent;btn.disabled=true;btn.textContent=label||'Please wait…'}else{btn.disabled=false;btn.textContent=btn.dataset.oldLabel||btn.textContent}}
async function copy(v){try{await navigator.clipboard.writeText(v);notice('Link copied','success')}catch(e){prompt('Copy this link:',v)}}
function placeholder(label,emoji='🏬'){return `<div class="image-placeholder"><span>${emoji}</span><small>${escape(label||'No image')}</small></div>`}
function imageHTML(src,label,klass=''){if(!/^https:\/\//.test(src||''))return placeholder(label);return `<img class="${escape(klass)}" src="${escape(src)}" alt="${escape(label)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div class=&quot;image-placeholder&quot;>🖼️</div>')">`}
function modal(html){const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML='<div class="modal"><button class="modal-close" aria-label="Close">✕</button>'+html+'</div>';document.body.appendChild(wrap);wrap.querySelector('.modal-close').onclick=()=>wrap.remove();wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});return wrap}
async function compress(file,logo=false){
  if(!file)return '';
  if(file.size>20*1024*1024)throw Error('Maximum image upload 20 MB');
  if(!/^image\//.test(file.type))throw Error('Please select an image');
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(Error('Cannot read image'));im.src=url});
    const size=logo?560:800,can=document.createElement('canvas');can.width=can.height=size;const ctx=can.getContext('2d');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);
    const factor=logo?Math.min(size/img.width,size/img.height):Math.max(size/img.width,size/img.height);
    const w=img.width*factor,h=img.height*factor;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
    let encoded='',quality=.86;
    for(let i=0;i<10;i++){encoded=can.toDataURL('image/jpeg',quality);if(Math.round((encoded.length-23)*.75)<=145000)break;quality=Math.max(.38,quality-.075)}
    if(Math.round((encoded.length-23)*.75)>155000){const small=document.createElement('canvas');small.width=small.height=640;small.getContext('2d').drawImage(can,0,0,640,640);encoded=small.toDataURL('image/jpeg',.65)}
    if(Math.round((encoded.length-23)*.75)>190000)throw Error('Image compression failed. Try another image');
    return encoded;
  }finally{URL.revokeObjectURL(url)}
}
function downloadBlob(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
function createBillImage(invoice,business){
  const lines=invoice.items||[],w=900,h=Math.max(1150,860+lines.length*58),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#15233d';x.fillRect(0,0,w,180);
  x.fillStyle='#ffffff';x.font='bold 44px Arial';x.fillText(String(business.business||'Business').slice(0,30),54,79);
  x.font='22px Arial';x.fillStyle='#d6e2ff';x.fillText('INVOICE • '+invoice.status,55,127);
  let y=225;
  function txt(v,left,bold=false,size=23,color='#1b2642'){x.fillStyle=color;x.font=(bold?'bold ':'')+size+'px Arial';x.fillText(String(v||'').slice(0,58),left,y)}
  txt('Invoice: '+invoice.id,54,true,24);y+=41;txt('Date: '+date(invoice.createdAt),54);y+=38;txt('Customer: '+invoice.customer,54);y+=36;txt('Mobile: '+invoice.mobile,54);y+=42;
  x.fillStyle='#e8edf4';x.fillRect(54,y,w-108,2);y+=46;
  txt('ITEM',54,true,22);txt('TOTAL',705,true,22);y+=33;
  lines.forEach(p=>{txt(String(p.name).slice(0,35),54,false,22);y+=28;txt(p.qty+' × '+money(p.price),54,false,19,'#626e82');txt(money(p.amount),705,true,20);y+=32;});
  y+=24;x.fillStyle='#d7dee8';x.fillRect(54,y,w-108,2);y+=45;
  txt('Subtotal',54);txt(money(invoice.subtotal),690,true);y+=44;
  if(invoice.tax){txt('Tax',54);txt(money(invoice.tax),690,true);y+=44}
  x.fillStyle='#f2f5fa';x.fillRect(40,y-20,w-80,94);y+=40;txt('TOTAL',54,true,34);txt(money(invoice.total),642,true,32);y+=75;
  txt('Payment: '+invoice.status,54,true,26,invoice.status==='PAID'?'#16875a':'#b45309');y+=42;
  if(business.upi){txt('UPI: '+String(business.upi).slice(0,35),54,false,21);y+=40}
  txt('Thank you for your business!',54,true,25,'#566781');y+=36;
  txt('Generated by BizNexa',54,false,18,'#8d99a9');
  return new Promise(resolve=>c.toBlob(resolve,'image/png'));
}
async function shareBill(inv,business){
  const blob=await createBillImage(inv,business);if(!blob)throw Error('Cannot create bill image');
  const file=new File([blob],inv.id+'.png',{type:'image/png'});
  const text=`${business.business} bill ${inv.id}\nAmount ${money(inv.total)} | ${inv.status}\nView: ${invoiceLink(inv.id,inv.token)}`;
  if(navigator.share&&navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:'Invoice '+inv.id,text});return}catch(e){if(e.name==='AbortError')return;}
  }
  downloadBlob(blob,inv.id+'.png');
  if(inv.mobile){window.open(wa(inv.mobile,text),'_blank','noopener');notice('Bill image downloaded. Attach it in WhatsApp chat.','info')}
  else notice('Bill image downloaded. Share it with your customer.','success');
}
function setBusyScreen(el,text='Loading…'){if(el)el.innerHTML='<div class="loading"><div class="spinner"></div><p>'+escape(text)+'</p></div>'}
function registerSW(){if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});}
function applyBrand(){const name=String(conf.BRAND||'BizNexa').trim().slice(0,36)||'BizNexa';document.title=document.title.replace(/BizNexa/g,name);$$('.brand').forEach(el=>{Array.from(el.childNodes).filter(n=>n.nodeType===3).forEach(n=>{n.textContent=n.textContent.replace(/BizNexa/g,name)});const mark=el.querySelector('.brandmark');if(mark)mark.textContent=name.charAt(0).toUpperCase()})}
applyBrand();
window.BX={conf,$,$$,escape,money,date,phone,wa,getParams,site,cardLink,catalogLink,invoiceLink,token,setToken,clearToken,theme,themes,get,post,notice,busy,copy,placeholder,imageHTML,modal,compress,shareBill,createBillImage,registerSW,setBusyScreen};
})();
