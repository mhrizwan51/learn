
/* ---------- registry ---------- */
const COURSES={
  tc:{name:'Textile Costing',short:'Costing',color:'#0f766e',desc:'Financial and managerial accounting applied to spinning, weaving, dyeing, printing and stitching — from the accounting equation to a full product costing.',meta:'26 lectures · 40 live worksheets'},
  fd:{name:'Fabric Design',short:'Fabric Design',color:'#4338ca',desc:'Woven structures on point paper: plain, twill, satin and their derivatives, drafting, hexadecimal design notation, cords, piqué, double cloth, colour-and-weave and fabric analysis.',meta:'21 lectures · 72 weave diagrams'},
  wc:{name:'Weaving Calculations',short:'Weaving Calc.',color:'#b45309',desc:'Yarn counts, fabric weight, warping, sizing, beams, reeds, cover factor, crimp, loom production, planning and feasibility of a weaving plant.',meta:'21 pages covering 28 lectures · 30 live worksheets'}
};
const L=[]; // lectures in order
function lecture(o){L.push(o);}
/* ---------- helpers ---------- */
const fmt=(v,f)=>{
  if(typeof v==='string')return v;
  if(v===undefined||v===null||Number.isNaN(v)||!isFinite(v))return '–';
  f=f||'#,##0.00';
  if(typeof v==='string')return v;
  if(f==='txt')return v;
  let pct=f.endsWith('%'),d=0;const m=f.match(/\.(0+)/);if(m)d=m[1].length;
  let x=pct?v*100:v;let s=Math.abs(x).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  if(!f.includes(','))s=s.replace(/,/g,'');
  if(x<0)s='('+s+')';
  return s+(pct?'%':'');
};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
let pending=[];let uid=0;
/* ---------- Excel-style sheet ----------
 spec: {title, cols:[widths], rows:[ [cell,...], ... ], legend}
 cell: string (label) | {t:'label',cls} | {in:'name',v:default,fmt,unit,opts:[...]} | {f:(v)=>number,n:'name',fx:'=A1*B2',fmt,tot,unit} | {h:'header'} | {s:'section'} | null
*/
function S(spec){const id='xl'+(++uid);pending.push({t:'sheet',id,spec});return `<div class="xl" id="${id}"></div>`;}
function mountSheet(id,spec){
  const el=document.getElementById(id);if(!el)return;
  const v={};const inputs=[];const fxCells=[];
  const ncol=Math.max(...spec.rows.map(r=>r.length));
  const colL=i=>String.fromCharCode(65+i);
  let h=`<div class="bar"><span class="title">${esc(spec.title||'Sheet')}</span><span class="nb" id="${id}_nb"></span><span class="fxb" id="${id}_fx"></span></div><div class="wrap"><table><thead><tr><th></th>`;
  for(let c=0;c<ncol;c++)h+=`<th${spec.cols&&spec.cols[c]?` style="min-width:${spec.cols[c]}px"`:''}>${colL(c)}</th>`;
  h+='</tr></thead><tbody>';
  spec.rows.forEach((row,ri)=>{
    h+=`<tr><td class="rn">${ri+1}</td>`;
    for(let c=0;c<ncol;c++){
      const cell=row[c];const ref=colL(c)+(ri+1);
      if(cell===undefined||cell===null){h+='<td></td>';continue;}
      if(typeof cell==='string'){h+=`<td class="lbl">${cell}</td>`;continue;}
      if(cell.h!==undefined){h+=`<td class="hd">${cell.h}</td>`;continue;}
      if(cell.s!==undefined){h+=`<td class="sec" colspan="${cell.span||1}">${cell.s}</td>`;continue;}
      if(cell.t!==undefined){h+=`<td class="lbl ${cell.cls||''}">${cell.t}</td>`;continue;}
      if(cell.u!==undefined){h+=`<td class="unit">${cell.u}</td>`;continue;}
      if(cell.in!==undefined){
        v[cell.in]=cell.v;
        if(cell.opts){h+=`<td class="in" data-ref="${ref}"><select data-in="${cell.in}">${cell.opts.map(o=>`<option value="${esc(o)}"${o==cell.v?' selected':''}>${esc(o)}</option>`).join('')}</select></td>`;}
        else h+=`<td class="in" data-ref="${ref}"><input data-in="${cell.in}" data-fmt="${cell.fmt||''}" value="${cell.fmt&&cell.fmt.endsWith('%')?parseFloat((cell.v*100).toPrecision(12)):cell.v}"${cell.step?` step="${cell.step}"`:''}></td>`;
        continue;}
      if(cell.f){h+=`<td class="num fx${cell.tot?' tot':''}" data-ref="${ref}" data-fx="${esc(cell.fx||'')}" id="${id}_c${ri}_${c}"></td>`;fxCells.push({ri,c,cell});continue;}
      h+='<td></td>';
    }
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  if(spec.legend!==false)h+=`<div class="legend"><span><i style="background:#fffef5"></i>blue = input (edit me)</span><span><i style="background:#f7f8fa"></i>grey = formula (click to see it)</span>${spec.note?`<span>${spec.note}</span>`:''}</div>`;
  el.innerHTML=h;
  const fxb=document.getElementById(id+'_fx'),nb=document.getElementById(id+'_nb');
  function recalc(){
    el.querySelectorAll('[data-in]').forEach(i=>{const n=i.dataset.in;if(i.tagName==='SELECT'){v[n]=i.value;return;}let x=parseFloat(i.value.replace(/,/g,''));if(isNaN(x))x=0;if((i.dataset.fmt||'').endsWith('%'))x=x/100;v[n]=x;});
    fxCells.forEach(({ri,c,cell})=>{let val;try{val=cell.f(v);}catch(e){val=NaN;}if(cell.n)v[cell.n]=val;const td=document.getElementById(`${id}_c${ri}_${c}`);td.textContent=fmt(val,cell.fmt);td.classList.toggle('neg',typeof val==='number'&&val<0);});
    if(spec.onchange)spec.onchange(v);
  }
  el.addEventListener('input',recalc);
  el.addEventListener('click',e=>{const td=e.target.closest('td[data-ref]');if(!td)return;el.querySelectorAll('.focus').forEach(x=>x.classList.remove('focus'));td.classList.add('focus');nb.textContent=td.dataset.ref;fxb.textContent=td.dataset.fx||(td.classList.contains('in')?'input value':'');});
  el.addEventListener('focusin',e=>{const td=e.target.closest('td[data-ref]');if(td){nb.textContent=td.dataset.ref;fxb.textContent='input value';}});
  recalc();
}
/* ---------- weave renderer ----------
 W({hex:['$AAABFF',...], w:24, title, size:14, colors:[warp,weft], draft:true, effect:true})
 hex list is written bottom-up: first code = first pick (bottom row of point paper). Bits MSB first = leftmost end.
*/
function decodeHex(hexes,w){
  const rows=[];
  hexes.forEach(hx=>{hx=String(hx).replace(/^\$/,'').trim();if(!hx)return;let bits='';for(const ch of hx){bits+=parseInt(ch,16).toString(2).padStart(4,'0');}
    const need=Math.ceil(w/4)*4;bits=bits.padStart(need,'0');rows.push(bits.slice(0,w).split('').map(b=>b==='1'?1:0));});
  return rows; // rows[0] = pick 1 (bottom)
}
function W(spec){const id='wv'+(++uid);pending.push({t:'weave',id,spec});return `<div id="${id}"></div>`;}
function weaveSVGs(rows,spec){
  const w=rows[0].length,hgt=rows.length,s=spec.size||16,pad=2;
  const marks=spec.marks||{};
  // point paper
  let svg=`<svg width="${w*s+pad*2}" height="${hgt*s+pad*2}" viewBox="0 0 ${w*s+pad*2} ${hgt*s+pad*2}">`;
  for(let p=0;p<hgt;p++){const y=pad+(hgt-1-p)*s;for(let e=0;e<w;e++){const x=pad+e*s;const up=rows[p][e];
    let fill=up?'#1f2937':'#ffffff';const mk=marks[p+','+e];if(mk)fill=mk;
    svg+=`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${fill}" stroke="#9ca3af" stroke-width=".6"/>`;}}
  // repeat border every 8? draw thicker lines each 4
  for(let e=4;e<w;e+=4)svg+=`<line x1="${pad+e*s}" y1="${pad}" x2="${pad+e*s}" y2="${pad+hgt*s}" stroke="#6b7280" stroke-width=".9"/>`;
  for(let p=4;p<hgt;p+=4)svg+=`<line x1="${pad}" y1="${pad+(hgt-p)*s}" x2="${pad+w*s}" y2="${pad+(hgt-p)*s}" stroke="#6b7280" stroke-width=".9"/>`;
  svg+='</svg>';
  // fabric effect (tile 2x2 repeats if small)
  const [cw,cf]=spec.colors||['#1e3a8a','#f3f4f6'];
  const rep=spec.tile||(w*hgt<=400?2:1);const W2=w*rep,H2=hgt*rep,t=spec.esize||Math.max(6,Math.min(14,Math.floor(360/Math.max(W2,H2))));
  let eff=`<svg width="${W2*t}" height="${H2*t}" viewBox="0 0 ${W2*t} ${H2*t}"><rect width="100%" height="100%" fill="#d1d5db"/>`;
  const wc=i=>Array.isArray(cw)?cw[i%cw.length]:cw, fc=i=>Array.isArray(cf)?cf[i%cf.length]:cf;
  for(let p=0;p<H2;p++){const y=(H2-1-p)*t;for(let e=0;e<W2;e++){const x=e*t;const up=rows[p%hgt][e%w];
    if(up){eff+=`<rect x="${x+1}" y="${y}" width="${t-2}" height="${t}" fill="${wc(e)}" rx="1.5"/><rect x="${x+1}" y="${y}" width="${(t-2)/3}" height="${t}" fill="rgba(255,255,255,.25)"/>`;}
    else{eff+=`<rect x="${x}" y="${y+1}" width="${t}" height="${t-2}" fill="${fc(p)}" rx="1.5"/><rect x="${x}" y="${y+1}" width="${t}" height="${(t-2)/3}" fill="rgba(255,255,255,.35)"/>`;}}}
  eff+='</svg>';
  return {svg,eff};
}
function draftOf(rows){ // returns {healds:[...per end], nh, lifting:[[...]]}
  const w=rows[0].length,h=rows.length;const key=e=>rows.map(r=>r[e]).join('');const map=new Map();const healds=[];
  for(let e=0;e<w;e++){const k=key(e);if(!map.has(k))map.set(k,map.size+1);healds.push(map.get(k));}
  const nh=map.size;const lifting=rows.map(r=>{const l=[];for(let i=1;i<=nh;i++){const e=healds.indexOf(i);l.push(r[e]);}return l;});
  return {healds,nh,lifting};
}
function mountWeave(id,spec){
  const el=document.getElementById(id);if(!el)return;
  const rows=spec.rows||decodeHex(spec.hex,spec.w);if(!rows.length){el.innerHTML='';return;}
  const {svg,eff}=weaveSVGs(rows,spec);
  let h=`<div class="wv">`;
  h+=`<div class="box"><h4>${esc(spec.title||'Point paper')} · ${rows[0].length} ends × ${rows.length} picks</h4>${svg}</div>`;
  if(spec.effect!==false)h+=`<div class="box"><h4>Fabric effect (${spec.tile||(rows[0].length*rows.length<=400?2:1)}× repeat)</h4>${eff}</div>`;
  if(spec.draft){const d=draftOf(rows);const s=14,w=rows[0].length;let ds=`<svg width="${w*s+4}" height="${d.nh*s+4}">`;for(let e=0;e<w;e++)for(let k=0;k<d.nh;k++){ds+=`<rect x="${2+e*s}" y="${2+(d.nh-1-k)*s}" width="${s}" height="${s}" fill="${d.healds[e]===k+1?'#b45309':'#fff'}" stroke="#9ca3af" stroke-width=".6"/>`;}ds+='</svg>';
    let ls=`<svg width="${d.nh*s+4}" height="${rows.length*s+4}">`;for(let p=0;p<rows.length;p++)for(let k=0;k<d.nh;k++){ls+=`<rect x="${2+k*s}" y="${2+(rows.length-1-p)*s}" width="${s}" height="${s}" fill="${d.lifting[p][k]?'#1f2937':'#fff'}" stroke="#9ca3af" stroke-width=".6"/>`;}ls+='</svg>';
    h+=`<div class="box"><h4>Draft · ${d.nh} healds</h4>${ds}<div style="font-size:12px;color:var(--mut);margin-top:6px">Threading order: ${d.healds.join(' ')}</div></div><div class="box"><h4>Lifting (peg) plan</h4>${ls}</div>`;}
  if(spec.caption)h+=`<div style="flex-basis:100%;font-size:13.5px;color:var(--mut)">${spec.caption}</div>`;
  h+='</div>';el.innerHTML=h;
}
/* hex playground */
function HEXBOX(def,w){const id='hx'+(++uid);pending.push({t:'hexbox',id,def,w});return `<div id="${id}"></div>`;}
function mountHexbox(id,def,w){
  const el=document.getElementById(id);
  el.innerHTML=`<div class="hexin"><div style="flex:1"><label>Design in hexadecimal (one code per pick, first code = first pick at the bottom)</label><textarea id="${id}_t">${esc(def)}</textarea></div><div><label>Ends (width)</label><input id="${id}_w" type="number" value="${w}" style="width:90px"></div><div><label>Warp colour</label><input id="${id}_c1" type="color" value="#1e3a8a"></div><div><label>Weft colour</label><input id="${id}_c2" type="color" value="#f3f4f6"></div><div><button id="${id}_b">Draw</button></div></div><div id="${id}_o"></div>`;
  const draw=()=>{const codes=document.getElementById(id+'_t').value.split(/[\s,]+/).filter(Boolean);const ww=parseInt(document.getElementById(id+'_w').value)||8;
    const rows=decodeHex(codes,ww);const o=document.getElementById(id+'_o');if(!rows.length){o.innerHTML='';return;}
    const c1=document.getElementById(id+'_c1').value,c2=document.getElementById(id+'_c2').value;
    o.innerHTML='';const tmp=document.createElement('div');tmp.id=id+'_wv';o.appendChild(tmp);mountWeave(id+'_wv',{rows,title:'Your design',draft:true,colors:[c1,c2]});};
  document.getElementById(id+'_b').onclick=draw;draw();
}
/* simple SVG chart: {w,h,series:[{pts:[[x,y]],color,label}],xl,yl, xmax,ymax} */
function CH(spec){const id='ch'+(++uid);pending.push({t:'chart',id,spec});return `<div id="${id}"></div>`;}
function chartSVG(spec){
  const w=spec.w||560,h=spec.h||300,m={l:56,r:16,t:16,b:40};const xs=[],ys=[];spec.series.forEach(s=>s.pts.forEach(p=>{xs.push(p[0]);ys.push(p[1]);}));
  const xmin=spec.xmin??0,xmax=spec.xmax??Math.max(...xs),ymin=spec.ymin??Math.min(0,...ys),ymax=spec.ymax??Math.max(...ys);
  const X=x=>m.l+(x-xmin)/(xmax-xmin||1)*(w-m.l-m.r),Y=y=>h-m.b-(y-ymin)/(ymax-ymin||1)*(h-m.t-m.b);
  let s=`<svg class="chart" viewBox="0 0 ${w} ${h}" style="max-width:${w}px">`;
  for(let i=0;i<=5;i++){const y=ymin+(ymax-ymin)*i/5;s+=`<line x1="${m.l}" x2="${w-m.r}" y1="${Y(y)}" y2="${Y(y)}" stroke="#e5e7eb"/><text x="${m.l-6}" y="${Y(y)+4}" font-size="11" text-anchor="end" fill="#6b7280">${fmt(y,spec.yfmt||'#,##0')}</text>`;}
  for(let i=0;i<=5;i++){const x=xmin+(xmax-xmin)*i/5;s+=`<text x="${X(x)}" y="${h-m.b+16}" font-size="11" text-anchor="middle" fill="#6b7280">${fmt(x,spec.xfmt||'#,##0')}</text>`;}
  s+=`<line x1="${m.l}" x2="${w-m.r}" y1="${Y(ymin)}" y2="${Y(ymin)}" stroke="#9ca3af"/>`;
  if(spec.xl)s+=`<text x="${(m.l+w-m.r)/2}" y="${h-4}" font-size="12" text-anchor="middle" fill="#374151">${spec.xl}</text>`;
  if(spec.yl)s+=`<text transform="translate(12,${(m.t+h-m.b)/2}) rotate(-90)" font-size="12" text-anchor="middle" fill="#374151">${spec.yl}</text>`;
  spec.series.forEach((se,i)=>{const d=se.pts.map((p,j)=>(j?'L':'M')+X(p[0])+','+Y(p[1])).join(' ');s+=`<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2.4"/>`;if(se.label)s+=`<text x="${X(se.pts[se.pts.length-1][0])-4}" y="${Y(se.pts[se.pts.length-1][1])-6}" font-size="11.5" text-anchor="end" fill="${se.color}" font-weight="600">${se.label}</text>`;});
  (spec.marks||[]).forEach(mk=>{s+=`<circle cx="${X(mk.x)}" cy="${Y(mk.y)}" r="5" fill="#fff" stroke="${mk.color||'#111'}" stroke-width="2.5"/><text x="${X(mk.x)+9}" y="${Y(mk.y)-9}" font-size="12" font-weight="700" fill="${mk.color||'#111'}">${mk.label||''}</text>`;});
  return s+'</svg>';
}
/* mount all pending widgets */
function mountAll(){pending.forEach(p=>{if(p.t==='sheet')mountSheet(p.id,p.spec);else if(p.t==='weave')mountWeave(p.id,p.spec);else if(p.t==='hexbox')mountHexbox(p.id,p.def,p.w);else if(p.t==='chart'){const e=document.getElementById(p.id);if(e)e.innerHTML=chartSVG(p.spec);}});pending=[];}
/* ---------- router / render ---------- */
function buildNav(){
  const nav=document.getElementById('nav');let h='';
  for(const k in COURSES){const c=COURSES[k];const ls=L.filter(l=>l.course===k);
    h+=`<div class="course" data-c="${k}"><button data-go="${k}"><span class="dot" style="background:${c.color}"></span>${c.name}<span class="cnt" title="Show / hide the list">${ls.length}</span></button><div class="list">`;
    ls.forEach(l=>h+=`<a data-go="${l.id}" data-id="${l.id}" data-s="${esc((l.n+' '+l.title+' '+(l.sub||'')+' '+(l.tags||'')).toLowerCase())}"><span class="n">${l.n}</span>${esc(l.title)}</a>`);
    h+='</div></div>';}
  nav.innerHTML=h;
  nav.querySelectorAll('.course>button .cnt').forEach(b=>b.onclick=e=>{e.stopPropagation();b.closest('.course').classList.toggle('closed');});
  document.getElementById('q').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();nav.querySelectorAll('.list a').forEach(a=>a.classList.toggle('hidden',q&&!a.dataset.s.includes(q)));nav.querySelectorAll('.course').forEach(c=>{if(q)c.classList.remove('closed');});});
}
function home(){
  let h=`<div class="hero"><div class="kicker" style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.8">Textile Engineering · University lectures</div><h1>Textile Lecture Companion</h1><p>Three complete courses by Muhammad Rizwan Zubair rebuilt as interactive web pages: every worksheet is a live spreadsheet you can edit, every weave is drawn on point paper, and every calculation explains itself. Pick a course to begin, or use the search box on the left.</p></div><div class="courses">`;
  for(const k in COURSES){const c=COURSES[k];h+=`<a class="cc" data-go="${k}" style="background:linear-gradient(135deg,${c.color},#111827)"><h3>${c.name}</h3><p>${c.desc}</p><div class="m">${c.meta}</div></a>`;}
  h+='</div>';
  for(const k in COURSES){h+=`<div class="card"><h2 style="color:${COURSES[k].color}">${COURSES[k].name} — lecture index</h2><div class="outline">`;L.filter(l=>l.course===k).forEach(l=>h+=`<a data-go="${l.id}"><span class="n">Lecture ${l.n}</span>${esc(l.title)}</a>`);h+='</div></div>';}
  h+=srcIndex();
  h+=`<div class="card"><h2>How to use this file</h2><p>Everything runs locally in your browser — no internet needed. In the spreadsheet blocks, cells with <b style="color:var(--in)">blue numbers</b> are inputs: change them and every dependent cell recalculates, exactly as in Excel. Click a grey cell to see its formula in the formula bar. Weave diagrams follow the hexadecimal notation taught in Fabric Design Lecture 10: one hexadecimal number per pick, the first number being the bottom pick, a “1” bit meaning the warp end is lifted.</p></div>`;
  return h;
}
function coursePage(k){const c=COURSES[k];const ls=L.filter(l=>l.course===k);
  let h=`<div class="hero" style="background:linear-gradient(135deg,${c.color},#111827)"><div class="kicker" style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.8">Textile Engineering · University course</div><h1>${c.name}</h1><p>${c.desc}</p><p style="margin-top:12px;font-size:13.5px;opacity:.9">${c.meta}. Every worksheet is live: blue figures are inputs, grey cells recalculate. Click a lecture below or use the list on the left.</p><p style="margin-top:14px"><a data-go="${ls[0].id}" class="btn" style="background:#fff;color:${c.color};text-decoration:none;display:inline-block">Start with Lecture ${ls[0].n} →</a></p></div>`;
  h+=`<div class="card"><h2 style="color:${c.color}">Lectures</h2><div class="outline">`;ls.forEach(l=>h+=`<a data-go="${l.id}"><span class="n">Lecture ${l.n}</span>${esc(l.title)}<div style="font-size:12px;color:var(--mut);margin-top:4px">${esc(l.sub||'').slice(0,110)}${(l.sub||'').length>110?'…':''}</div></a>`);h+='</div></div>';
  h+=`<div class="card"><h2>Original lecture files</h2><p>${OLDPAGES[k]?`The classic course page with all the original lecture files is still available: <a href="${OLDPAGES[k]}" target="_blank" rel="noopener">${c.name} — all lecture files ↗</a>.`:''} ${FOLDERS[k]&&FOLDERS[k]!==OLDPAGES[k]?`The Google Drive folder of the course: <a href="${FOLDERS[k]}" target="_blank" rel="noopener">open folder ↗</a>.`:''}</p><div class="srcl">${ls.filter(l=>SRC[l.id]).map(l=>SRC[l.id].map(x=>`<a href="${x[1]}" target="_blank" rel="noopener">${l.n} · ${x[0]} ↗</a>`).join('')).join('')}</div></div>`;
  return h;}
var START=typeof START==='undefined'?'':START;
let CUR=location.hash.replace('#','')||START;
function go(id){CUR=id;try{if(location.href.indexOf('about:')!==0&&!location.href.startsWith('blob:'))history.replaceState(null,'','#'+id);}catch(e){}render();}
document.addEventListener('click',e=>{const a=e.target.closest('[data-go]');if(!a)return;e.preventDefault();go(a.dataset.go);});
function render(){
  const hash=CUR;const page=document.getElementById('page');
  const idx=L.findIndex(l=>l.id===hash);
  document.body.className=idx>=0?L[idx].course:'';
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('active',a.dataset.id===hash));
  if(idx<0&&COURSES[hash]){document.body.className=hash;page.innerHTML=coursePage(hash);document.getElementById('crumb').innerHTML=`<a data-go="" style="color:var(--mut);text-decoration:none;cursor:pointer">Home</a> › <b style="color:${COURSES[hash].color}">${COURSES[hash].name}</b>`;document.getElementById('prevbtn').style.visibility='hidden';const nb=document.getElementById('nextbtn');nb.style.visibility='visible';nb.onclick=()=>go(L.find(l=>l.course===hash).id);document.querySelectorAll('#nav .course').forEach(c=>c.classList.toggle('closed',c.dataset.c!==hash));}
  else if(idx<0){page.innerHTML=home();document.getElementById('crumb').innerHTML='<b>Home</b>';document.getElementById('prevbtn').style.visibility='hidden';document.getElementById('nextbtn').style.visibility='hidden';}
  else{const l=L[idx];const c=COURSES[l.course];
    let h=`<div class="lhead"><div class="kicker">${c.name} · Lecture ${l.n}</div><h1>${esc(l.title)}</h1><div class="sub">${l.sub||''}</div>${l.chips?`<div class="chips">${l.chips.map(x=>`<span class="chip">${x}</span>`).join('')}</div>`:''}</div>`;
    try{h+=l.body();}catch(e){h+=`<div class="warn">Could not render this lecture: ${esc(e.message)}</div>`;console.error(e);}
    h+=srcBox(l.id);
    const prev=L[idx-1],next=L[idx+1];
    h+=`<div class="pn">${prev?`<a data-go="${prev.id}"><small>← Previous · ${COURSES[prev.course].short} ${prev.n}</small>${esc(prev.title)}</a>`:'<span style="flex:1"></span>'}${next?`<a class="next" data-go="${next.id}"><small>Next · ${COURSES[next.course].short} ${next.n} →</small>${esc(next.title)}</a>`:'<span style="flex:1"></span>'}</div>`;
    page.innerHTML=h;mountAll();
    document.getElementById('crumb').innerHTML=`<a data-go="" style="color:var(--mut);text-decoration:none">Home</a> › <a data-go="${l.course}" style="color:${c.color};text-decoration:none">${c.name}</a> › <b>Lecture ${l.n}</b>`;
    const pb=document.getElementById('prevbtn'),nb=document.getElementById('nextbtn');pb.style.visibility=prev?'visible':'hidden';nb.style.visibility=next?'visible':'hidden';pb.onclick=()=>go(prev.id);nb.onclick=()=>go(next.id);
    const act=document.querySelector('#nav a.active');if(act)act.scrollIntoView({block:'nearest'});
  }
  window.scrollTo(0,0);document.getElementById('side').classList.remove('open');
}
window.__hc=()=>{CUR=location.hash.replace('#','');render();};window.addEventListener('hashchange',window.__hc);
document.getElementById('menubtn').onclick=()=>document.getElementById('side').classList.toggle('open');

/* ---- links to the original lecture files on Google Drive ---- */
const O=id=>'https://drive.google.com/open?id='+id, D=id=>'https://docs.google.com/document/d/'+id+'/edit', SH=id=>'https://docs.google.com/spreadsheets/d/'+id+'/edit';
const SRC={
tc01:[['Lecture notes (Doc)',D('0B8Gx78C5XzABWldxWjM4UFAydDQ')],['Worksheet',O('0B8Gx78C5XzABcG9rZzhiWXIzN1U')]],
tc02:[['Lecture notes',O('0B8Gx78C5XzABQTdjVi1uc2ZaS1U')],['Worksheet',O('0B8Gx78C5XzABZ0w2UGZ3dVQ2Skk')]],
tc03:[['Lecture notes',O('0B8Gx78C5XzABNmZTcURIX0cwbTQ')],['Worksheet',O('0B8Gx78C5XzABcDBhSWNERDJaU1k')]],
tc04:[['Lecture notes',O('0B8Gx78C5XzABV25IU01Id2plNFE')],['Worksheet',O('0B8Gx78C5XzABTGQxWlRCUDFOZFE')]],
tc05:[['Lecture notes',O('0B8Gx78C5XzABSGFsR25vc2RsalU')]],
tc06:[['Lecture notes',O('0B8Gx78C5XzABY25SRTAxYnRIN2M')]],
tc07:[['Lecture notes',O('0B8Gx78C5XzABMHlkTkpyS0xKQkU')]],
tc08:[['Lecture notes',O('0B8Gx78C5XzABcVV5YUJqOG9kc2M')]],
tc09:[['Lecture notes',O('0B8Gx78C5XzABU2xKSFRLTno4UnM')],['Reference material',O('0B8Gx78C5XzABZGhmbnhxQXI5TjQ')]],
tc10:[['Lecture notes',O('0B8Gx78C5XzABT3Y1SzJ3YUZpR0k')],['Reference material',O('0B8Gx78C5XzABQzRxTGVveW1LN28')]],
tc11:[['Lecture notes',O('0B8Gx78C5XzABQS03dU11YkVwT1k')]],
tc12:[['Lecture notes',O('0B8Gx78C5XzABanZCczZ4czRqWTQ')]],
tc13:[['Lecture notes',O('0B8Gx78C5XzABODE4MVYtVS03am8')]],
tc14:[['Lecture notes',O('0B8Gx78C5XzABNUJmTzJ2Wm1vVjg')]],
tc15:[['Lecture worksheet',O('0B8Gx78C5XzABVS0waElBekRVS1E')]],
tc16:[['Lecture worksheet',O('0B8Gx78C5XzABLTFXUGlSMTJaMUE')]],
tc17:[['Lecture worksheet',O('0B8Gx78C5XzABNW91bVp5Und6cms')]],
tc18:[['Lecture worksheet',O('0B8Gx78C5XzABb2FnMFZCeEZIWGc')]],
tc19:[['Lecture worksheet',O('0B8Gx78C5XzABODhHMWVfNjk1Y2c')]],
tc20:[['Lecture worksheet',O('0B8Gx78C5XzABQnRqQjlCNVJPWHc')]],
tc21:[['Lecture worksheet',O('0B8Gx78C5XzABZ0VfX1FWcXl0Qk0')]],
tc22:[['Spreadsheet',SH('0B8Gx78C5XzABYjNVdUg4N0pXNDA')]],
tc23:[['Lecture worksheet',O('0B8Gx78C5XzABYXlVR0RlRUZqWDQ')]],
tc24:[['Spreadsheet',SH('0B8Gx78C5XzABOGRRd0ZncjZ0elk')]],
tc25:[['Lecture worksheet',O('0B8Gx78C5XzABN216M2J6azNXZDg')]],
tc26:[['Lecture worksheet',O('0B8Gx78C5XzABdHVGVjNScGszOTA')]],
fd01:[['Lecture 01 Fabric Construction (Doc)',D('1WFgdJIlW3uVqKd9gqEYBIaNdNXtcLsA5LbseLK8qSzs')]],
fd02:[['Lecture 02 Weight of Fabric (Doc)',D('10xFf1t_tgr_NTeBy1eyERdNt1msYAv1x3QT8Nv-5Thk')],['FD Lecture 2 worksheet (Sheet)',SH('1Vos-bdwe9OvoRDzvYD3zW-Eiln-5eekvg9_fsX40Ie4')]],
fd03:[['Lecture 03 Introduction to Weave Designs (Doc)',D('1TMsaDE7tENOEvD80BNj26kEjaMfOT2qLqyA-RCjlIRw')]],
fd04:[['Lecture 04 Twills (Doc)',D('1gMQkelsMnlZeougt6PZq2lPtvGkK3HYpB51bXNZzmDk')]],
fd05:[['Lecture 05 Satin & Sateen (Doc)',D('1K5qC2l0ZdJrp4gIdk1GyPKj6ABMxyAXTJmSz9WsZaQQ')]],
fd06:[['Lecture 06 Plain Weave Derivatives (Doc)',D('1-7SRuPxAFGrCYr5NKl5kfDKhF9HzEjulE9R6oF6H4dw')]],
fd07:[['Lecture 07 Twill Derivatives (Doc)',D('1in_d2YHh-DAFFPCQLgQvnT0sLPlLaw3abfFxkV9_j0Q')]],
fd08:[['Lecture 08 Drafting (Doc)',D('16tlgbUKDSO26bUkPOBok_761OktOvhFz39eS0TDNwSw')]],
fd10:[['Lecture 10 Computer Aided Designs II (Doc)',D('1C1ZTQZpGSCOKFnAvJt9FAheCNUDWS-8vVD5MW31Q1Zk')]],
fd12:[['Lecture 12 Fabric Analysis II (Doc)',D('1O6Bc6zxyRQNgL-zjsEXMwG3SMVLIZ-baoD94hUaLUZQ')]],
fd13:[['Lecture 13 Fancy Designs (Doc)',D('1AMBOlRmtNfqqPj8tbuWMgZ6cd29ZxkK73jCjMAneU-0')]],
fd14:[['Lecture 14 Rib and Cord Structures I (Doc)',D('1tUz6iZ7BUZDdXaom2itIaEoeYqr_R2djqO79bWUke0E')]],
fd16:[['Lecture 16 Rib and Cord Structures II (PDF)',O('0B-ocadlBdhqLc1dsOTltWlFhbDg')]],
fd17:[['Lecture 17 Stripe and Check (Doc)',D('1ydSE_jyfPDZ9cRyNncJvb1DzqRmkOR5ug87DxmX97nE')]],
fd19:[['Lecture 19 Color and Weave (Doc)',D('1D4zJSN1DFWp3tDq1_e0VsxOQT1BgOUjtp-wQtfI6990')]],
fd20:[['Lecture 20 Cover Factor (Doc)',D('1YuRUhptaybLTqx0X6MwXNasczRGjepVmBg6t1gQYqiM')]],
fd22:[['Lecture 22 Spot Designs (Doc)',D('17OKeB6L_C0-reXpGBCY_ExJo8F1rypRur1cVXAeE-qc')]],
fd23:[['Lecture 23 Fancy Designs II (Doc)',D('1NrOcW0hAU53-Q5C1uDg_ePQVfhw1SOIjhQnOFdRY_2c')]],
fd24:[['Lecture 24 Analysis (Doc)',D('1URZh21uZH8_me5MfJBkfyy0DKoytdHgIVB2LTwkp2uw')]],
fd25:[['Lecture 25 Crimp (Doc)',D('1hxSO2MKAWMxw3fKy6HuTrZ1SaxTIp63iy_c7uD8k59k')]],
fd26:[['Lecture 26 Double Cloth (PDF)',O('0B-ocadlBdhqLelRPREEwb1BvRFE')]],
wc00:[['WC Course Outline (Doc)',D('1uxKSLdGz4S0LIo36Y-vPZLXYambaCWKJedwJpeLP3-w')]],
wc01:[['Lecture 01 Counting Systems (Sheet)',SH('1GhBISzAZFGsFQaxEJgBFTYr2XlX_ChXkwg-Xs8Wzjw4')]],
wc02:[['Lecture 02 Multiple Counts I (Sheet)',SH('1JJYMWhdkzCWH0LNuSck51F-P8N0SAITNFWhjls60KH0')]],
wc03:[['Lecture 03 Multiple Counts II (Sheet)',SH('1_nVOLatFSZaIK9FGIIfeznRn6cZ-cOzLMm9zK2XZ0yA')]],
wc04:[['Lecture 04 Multiple Counts III (Sheet)',SH('1-jMVH8-hMXXIk0yD1NRQV6XCZLQ0Q6onn_ibT4XErH4')]],
wc05:[['Lecture 05 Weight of Fabric (Sheet)',SH('1eTJvQld2Pt5AdLrq9wXmjNwjFLNf8KxruzeELvLz43I')]],
wc06:[['Lecture 06 Sett Calculations (Sheet)',SH('1dah4GVMEN5vBQxck6gSYTGnsawSU7d_Jd4zj6rutuaA')]],
wc07:[['Lecture 07 Beam Calculations (Sheet)',SH('1jwrrZzOKDXuGLEZc_edEUeUEorzVBasOlDh2Y6TAbVA')]],
wc08:[['Lecture 08 Breakage – Sized Count (Sheet)',SH('1nGk2-lGO28MgTc7C-2MVZvFzKg4mzChQl-rp6gx7IJk')]],
wc09:[['Lecture 09 Cone Size (Sheet)',SH('1lot8xD4lRuZR0Mk4PYDNQCmTUcswhXjRpQ-9nStt0ik')]],
wc10:[['Lecture 10 Warping Speed (Sheet)',SH('1PTBWHnCsguXUq-kUGafHmvc2gSlyDal_-4yCerAX17I')]],
wc11:[['Lecture 11 Reed Calculation (Sheet)',SH('1FFo247A1gWQmXN4FTiKv_szDEqVP8nP-UAwKJr6d-Mw')]],
wc12:[['Lecture 12 Cover Factor (Doc)',D('1rAX6Q_hyPBLjymdOCmhFrrOA6-hnsY6wzXxPy_J1wHo')],['Lecture 12 Cover Factor for Weaving (Sheet)',SH('1uivGDqpy_IdI5CZjUxXCKuoluFJdq1q4cWpYPwjaSo8')]],
wc13:[['Lecture 13 Fabric Production (Sheet)',SH('1eoeCOOZUWDBFR1ua6hoUteTJxq3bT8aPWDg0bySwvT4')]],
wc14:[['Lecture 14–15 Crimp (Doc)',D('1PvtsAG_LtVFiCNjHtoN6vd5ahf_Sk7WYbM_beS6uRkc')]],
wc17:[['Lecture 17 Blended Fabrics (Sheet)',SH('1pKUfz5blfv8e1u5VmIhImxxbncRg8pa3db7m5DLVZrY')]],
wc18:[['Lecture 18 Sizing Cost Analysis (Sheet)',SH('1pNWI1Cc13E4Oh9EDY7LmWZq0TxJiJK-xLM6t3fd1Z9U')]],
wc19:[['Lecture 19–21 Planning (Excel)',O('1HBp8KsSxiJ3DlaTCNSMukPoiL-soL6hV')]],
wc22:[['Lecture 22 Planning (Sheet)',SH('1cR9UyBvCi-ef8IazFouxBdXP-JeVgF4lhJP7LiBvRi0')]],
wc25:[['Lecture 25 Set Size Planning (Sheet)',SH('1PIQUnb2bN--paDyDVRxDTRCIMjwElcawXdCNQ8zlC-Y')]],
wc27:[['Lecture 27–28 Feasibility Study (Sheet)',SH('1oNod8wQj2krUXgI9bYbpSUvUewNyrwf5UAvH1JU52ZM')]]
};
const FOLDERS={fd:'https://drive.google.com/drive/folders/0B-ocadlBdhqLMEdnQmt5ZTFBaVk?resourcekey=0-X6lo_xQ2sOYrjtBTlg_cEg',wc:'https://drive.google.com/drive/folders/0B-ocadlBdhqLOG9TTjVSZ0tRWXc?resourcekey=0-WhuscVr3kHjp-KEnGLOYvw',tc:'https://www.rizwanzubair.net/textile-lectures/textilecosting-files'};
const OLDPAGES={tc:'https://www.rizwanzubair.net/textile-lectures/textilecosting-files',fd:'https://www.rizwanzubair.net/textile-lectures/fabric-design-files',wc:'https://www.rizwanzubair.net/textile-lectures/weaving-calculations-files'};
function srcBox(id){const s=SRC[id];if(!s)return '';return `<div class="card srcbox"><h2>Original lecture material</h2><p>Open the file this page was built from:</p><div class="srcl">${s.map(x=>`<a href="${x[1]}" target="_blank" rel="noopener">${x[0]} ↗</a>`).join('')}</div></div>`;}
function srcIndex(){let h='<div class="card"><h2>Original lecture files on Google Drive</h2><p>Every page in this companion was built from a Google Doc, Sheet, Word or Excel file of the original course. The links below open those originals (view access).</p><div class="grid3">';
 for(const k in COURSES){h+=`<div><h3 style="color:${COURSES[k].color}">${COURSES[k].name}</h3><ul class="srcul">`;L.filter(l=>l.course===k&&SRC[l.id]).forEach(l=>{SRC[l.id].forEach(x=>h+=`<li><a href="${x[1]}" target="_blank" rel="noopener">${l.n} · ${x[0]}</a></li>`);});
 h+=`</ul><p><a class="btn sec" href="${OLDPAGES[k]}" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block;margin:4px 6px 4px 0">${COURSES[k].name} page with all files ↗</a>${k!=='tc'?`<a class="btn sec" href="${FOLDERS[k]}" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block;margin:4px 0">Drive folder ↗</a>`:''}</p></div>`;}
 return h+'</div></div>';}

/* ===================== TEXTILE COSTING ===================== */
lecture({id:'tc01',course:'tc',n:'01',title:'Financial Accounting – Introduction',sub:'The accounting equation, recording transactions and the trial balance, followed step by step with Ahmed’s canteen.',chips:['Accounting equation','Transactions','Trial balance'],tags:'assets liabilities capital',body:()=>`
<div class="card"><h2>Why accounting comes first in a costing course</h2>
<p>Accounting is the process of recording, sorting and summarising the data that results from business transactions. Before a textile engineer can cost a yarn, a fabric or a garment, he must be able to read the records in which money, property and obligations are written down — and those records all rest on one identity:</p>
<div class="formula">Liabilities + Capital = Assets</div>
<dl class="def">
<dt>Property (assets)</dt><dd>Buildings, equipment, cash, supplies — everything the business owns.</dd>
<dt>Right to property</dt><dd>Who has a claim on the assets: the owners (capital) and the creditors (liabilities).</dd>
<dt>Business transaction</dt><dd>An event that transfers goods or renders services and must be recorded.</dd>
</dl></div>
<div class="card"><h2>Ahmed Inc. — nine transactions, one equation</h2>
<p>Ahmed starts a canteen. Each transaction below changes two or more items, yet the equation always balances. Edit any blue amount and watch the balances follow.</p>
${S({title:'Accounting equation worksheet (Rs)',cols:[40,230,90,90,90,90,90,90],rows:[
[{h:'#'},{h:'Transaction'},{h:'Cash'},{h:'Supplies'},{h:'Equipment'},{h:'Acc. Dep.'},{h:'Creditors'},{h:'Capital'}],
['a','Ahmed deposits capital in the bank',{in:'a',v:19000},null,null,null,null,{f:v=>v.a,fx:'=C2',fmt:'#,##0'}],
['b','Buys kitchen equipment for cash',{f:v=>-v.b,fx:'=-E3',fmt:'#,##0'},null,{in:'b',v:17400},null,null,null],
['c','Buys food supplies on credit',null,{in:'c',v:650},null,null,{f:v=>v.c,fx:'=D4',fmt:'#,##0'},null],
['d','Pays part of the creditors',{f:v=>v.d,fx:'=G5',fmt:'#,##0'},null,null,null,{in:'d',v:-300},null],
['e','Sales for the month (cash)',{in:'e',v:2000},null,null,null,null,{f:v=>v.e,fx:'=C6 (Sales)',fmt:'#,##0'}],
['f','Wages 550, rent 50, utilities 25, misc 75',{f:v=>-(v.wg+v.rt+v.ut+v.ms),fx:'=-SUM(C8:F8)',fmt:'#,##0'},null,null,null,null,{f:v=>-(v.wg+v.rt+v.ut+v.ms),fx:'= expenses reduce capital',fmt:'#,##0'}],
['','   wages / rent / utilities / misc',{in:'wg',v:550},{in:'rt',v:50},{in:'ut',v:25},{in:'ms',v:75},null,null],
['g','Supplies used (bought less left at month end)',null,{f:v=>-(v.c-v.sl),fx:'=-(D4-D10)',fmt:'#,##0'},null,null,null,{f:v=>-(v.c-v.sl),fx:'= supplies expense',fmt:'#,##0'}],
['','   supplies left at month end',null,{in:'sl',v:250},null,null,null,null],
['h','Depreciation of equipment',null,null,null,{in:'dp',v:-200},null,{f:v=>v.dp,fx:'=F11',fmt:'#,##0'}],
['i','Ahmed withdraws cash (drawings)',{in:'dw',v:-500},null,null,null,null,{f:v=>v.dw,fx:'=C12',fmt:'#,##0'}],
[{t:'',cls:''},{t:'<b>Balances</b>'},{f:v=>v.a-v.b+v.d+v.e-(v.wg+v.rt+v.ut+v.ms)+v.dw,n:'cash',fx:'=SUM(C2:C12)',fmt:'#,##0',tot:true},{f:v=>v.sl,n:'sup',fx:'=SUM(D2:D12)',fmt:'#,##0',tot:true},{f:v=>v.b,n:'eq',fx:'=SUM(E2:E12)',fmt:'#,##0',tot:true},{f:v=>v.dp,n:'ad',fx:'=SUM(F2:F12)',fmt:'#,##0',tot:true},{f:v=>v.c+v.d,n:'cr',fx:'=SUM(G2:G12)',fmt:'#,##0',tot:true},{f:v=>v.a+v.e-(v.wg+v.rt+v.ut+v.ms)-(v.c-v.sl)+v.dp+v.dw,n:'cap',fx:'=SUM(H2:H12)',fmt:'#,##0',tot:true}],
['', 'Assets = Cash + Supplies + Equipment − Acc. Dep.',{f:v=>v.cash+v.sup+v.eq+v.ad,fx:'=C13+D13+E13+F13',fmt:'#,##0',tot:true},null,null,null,{t:'Liabilities + Capital'},{f:v=>v.cr+v.cap,fx:'=G13+H13',fmt:'#,##0',tot:true}]
]})}
<div class="note">Notice how expenses, supplies used, depreciation and drawings all <em>reduce capital</em>, while sales increase it. That is the whole logic of the profit and loss account, which Lecture 2 builds from these same figures.</div></div>
<div class="card"><h2>Trial balance (basic form)</h2>
<p>At month end the balances are listed with assets on one side and the rights to property on the other. Both columns must agree — if they do not, a transaction was recorded on one side only.</p>
${S({title:'Trial Balance — Ahmed Inc.',cols:[200,100,40,200,100],rows:[
[{h:'Liabilities & capital accounts'},{h:'Rs'},null,{h:'Asset accounts'},{h:'Rs'}],
['Ahmed, Capital',{in:'cap',v:19000},null,'Cash',{in:'cash',v:2100}],
['Drawings',{in:'dr',v:-500},null,'Supplies',{in:'sup',v:250}],
['Trade Creditors',{in:'cr',v:350},null,'Equipment',{in:'eq',v:17400}],
['Sales',{in:'sa',v:2000},null,'Accumulated Depreciation',{in:'ad',v:-200}],
['Depreciation Expense',{in:'de',v:-200}],
['Supplies Expense',{in:'se',v:-400}],
['Wages Expense',{in:'we',v:-550}],
['Rent Expense',{in:'re',v:-50}],
['Utilities Expense',{in:'ue',v:-25}],
['Misc Expense',{in:'me',v:-75}],
[{t:'<b>Total</b>'},{f:v=>v.cap+v.dr+v.cr+v.sa+v.de+v.se+v.we+v.re+v.ue+v.me,fx:'=SUM(B2:B11)',fmt:'#,##0',tot:true},null,{t:'<b>Total</b>'},{f:v=>v.cash+v.sup+v.eq+v.ad,fx:'=SUM(E2:E5)',fmt:'#,##0',tot:true}]
]})}</div>
<div class="card"><h2>Course plan — Textile Costing (15 weeks)</h2>
<table class="plain"><tr><th>Week</th><th>1st lecture</th><th>2nd lecture</th></tr>
<tr><td>1</td><td>Financial Accounting – Introduction</td><td>Financial Statements</td></tr><tr><td>2</td><td>Current Assets &amp; Liabilities</td><td>Fixed Assets</td></tr><tr><td>3</td><td>Managerial Accounting – Introduction</td><td>Unit Costing</td></tr><tr><td>4</td><td>Cost-Volume-Profit Relationship</td><td>CVP in Textiles</td></tr><tr><td>5</td><td>Costing Systems I (Job costing)</td><td>Costing Systems II (Process costing)</td></tr><tr><td>6</td><td>Advanced Costing Systems (ABC)</td><td>ABC Uses in Textiles</td></tr><tr><td>7</td><td>Budgets &amp; Variances</td><td>Budgeting in Textiles</td></tr><tr><td>8</td><td>Mid Term</td><td>Review of Spinning Calculations</td></tr><tr><td>9</td><td>Simple Yarn Costing</td><td>Optimal Yarn Mix</td></tr><tr><td>10</td><td>Review of Weaving Calculations</td><td>Simple Fabric Costing</td></tr><tr><td>11</td><td>Costs in Dyeing</td><td>Concept of Routes</td></tr><tr><td>12</td><td>Simple Dyed Fabric Costing</td><td>Simple Printed Fabric Costing</td></tr><tr><td>13</td><td>Stitching Costing</td><td>Accounting Concepts</td></tr><tr><td>14</td><td>Cost Allocation I</td><td>Cost Allocation II</td></tr><tr><td>15</td><td>Spoilage, Rework &amp; Scrap</td><td>Overview</td></tr></table></div>`});

lecture({id:'tc02',course:'tc',n:'02',title:'Financial Statements',sub:'Balance sheet, profit & loss account, the rules of debit and credit, the journal, the ledger and the trial balance.',chips:['Balance sheet','P&L','Debit & credit','Journal & ledger'],body:()=>`
<div class="card"><h2>Two statements, two questions</h2>
<dl class="def"><dt>Profit &amp; Loss account</dt><dd>Shows the net profit or net loss resulting from transactions <em>during a period</em> — “how did we do this month?”</dd>
<dt>Balance sheet</dt><dd>Shows the financial position of the business <em>on a fixed date</em> — “what do we own and owe tonight?”</dd></dl>
<p>Both are built from the trial balance of Lecture 1. Each statement recalculates when its own blue figures change; the net profit of the first (700) is entered in the second as “add profit for the month”, and with the lecture’s figures both sides of the balance sheet total 19,550.</p>
<div class="grid2">
${S({title:'Ahmed Inc. — Profit & Loss for the month',cols:[190,90,90],rows:[
['Sales',null,{in:'sales',v:2000}],
[{t:'<b>Operating expenses</b>'}],
['   Wages expense',{in:'w',v:550}],
['   Supplies expense',{in:'s',v:400}],
['   Depreciation expense',{in:'d',v:200}],
['   Rent expense',{in:'r',v:50}],
['   Utilities expense',{in:'u',v:25}],
['   Misc expense',{in:'m',v:75},{f:v=>v.w+v.s+v.d+v.r+v.u+v.m,n:'exp',fx:'=SUM(B3:B8)',fmt:'#,##0'}],
[{t:'<b>Net profit</b>'},null,{f:v=>v.sales-v.exp,n:'np',fx:'=C1-C8',fmt:'#,##0',tot:true}]
]})}
${S({title:'Ahmed Inc. — Balance Sheet as at month end',cols:[200,90,90],rows:[
[{s:'Assets',span:3}],
['Cash',null,{in:'cash',v:2100}],
['Supplies',null,{in:'sup',v:250}],
['Equipment',{in:'eq',v:17400}],
['   less accumulated depreciation',{in:'ad',v:200},{f:v=>v.eq-v.ad,fx:'=B4-B5',fmt:'#,##0'}],
[{t:'<b>Total assets</b>'},null,{f:v=>v.cash+v.sup+v.eq-v.ad,n:'ta',fx:'=C2+C3+C5',fmt:'#,##0',tot:true}],
[{s:'Liabilities and capital',span:3}],
['Trade creditors',null,{in:'cr',v:350}],
['Capital, start of month',{in:'cap',v:19000}],
['   add profit for the month',{in:'np',v:700}],
['   less withdrawals',{in:'dr',v:500},{f:v=>v.cap+v.np-v.dr,fx:'=B9+B10-B11',fmt:'#,##0'}],
[{t:'<b>Total liabilities and capital</b>'},null,{f:v=>v.cr+v.cap+v.np-v.dr,fx:'=C8+C11',fmt:'#,##0',tot:true}]
]})}
</div></div>
<div class="card"><h2>Debit and credit — the only four rules you need</h2>
<table class="plain"><tr><th></th><th>Increase</th><th>Decrease</th></tr><tr><td>Property (assets)</td><td><b>Debit</b></td><td>Credit</td></tr><tr><td>Right to property (liabilities, capital — income increases it; expenses and drawings decrease it)</td><td>Credit</td><td><b>Debit</b></td></tr></table>
<p>Every entry has a debit and an equal credit. The <b>journal</b> records them in date order; the <b>ledger</b> collects them account by account (the “T-accounts”); the <b>trial balance</b> checks that total debits equal total credits.</p>
<h3>Journal of Ahmed Inc. (December)</h3>
<table class="plain"><tr><th>Date</th><th>Description</th><th class="r">Debit</th><th class="r">Credit</th></tr>
<tr><td>Dec 1</td><td>Cash<br>&nbsp;&nbsp;&nbsp;Ahmed, Capital</td><td class="r">19,000</td><td class="r">19,000</td></tr>
<tr><td>b</td><td>Equipment<br>&nbsp;&nbsp;&nbsp;Cash <i>(kitchen equipment)</i></td><td class="r">17,400</td><td class="r">17,400</td></tr>
<tr><td>c</td><td>Supplies<br>&nbsp;&nbsp;&nbsp;Trade Creditors <i>(bought food supplies on credit)</i></td><td class="r">650</td><td class="r">650</td></tr>
<tr><td>d</td><td>Trade Creditors<br>&nbsp;&nbsp;&nbsp;Cash</td><td class="r">300</td><td class="r">300</td></tr>
<tr><td>e</td><td>Cash<br>&nbsp;&nbsp;&nbsp;Sales</td><td class="r">2,000</td><td class="r">2,000</td></tr>
<tr><td>f</td><td>Wages 550 / Rent 50 / Utilities 25 / Misc 75<br>&nbsp;&nbsp;&nbsp;Cash</td><td class="r">700</td><td class="r">700</td></tr>
<tr><td>31</td><td>Supplies Expense<br>&nbsp;&nbsp;&nbsp;Supplies <i>(monthly stock taking)</i></td><td class="r">400</td><td class="r">400</td></tr>
<tr><td>31</td><td>Depreciation Expense<br>&nbsp;&nbsp;&nbsp;Accumulated Depreciation</td><td class="r">200</td><td class="r">200</td></tr>
<tr><td>31</td><td>Drawings<br>&nbsp;&nbsp;&nbsp;Cash</td><td class="r">500</td><td class="r">500</td></tr></table>
<h3>Ledger — the Cash T-account</h3>
<div class="grid2"><table class="plain"><tr><th colspan="2">Debit side</th></tr><tr><td>Dec 1 Ahmed, Capital</td><td class="r">19,000</td></tr><tr><td>e Sales</td><td class="r">2,000</td></tr><tr><td></td><td class="r"></td></tr><tr><td></td><td class="r"></td></tr><tr><td><b>Total</b></td><td class="r"><b>21,000</b></td></tr><tr><td>Jan 1 Balance b/d</td><td class="r">2,100</td></tr></table>
<table class="plain"><tr><th colspan="2">Credit side</th></tr><tr><td>b Equipment</td><td class="r">17,400</td></tr><tr><td>d Trade Creditors</td><td class="r">300</td></tr><tr><td>f Wages, rent, utilities, misc</td><td class="r">700</td></tr><tr><td>31 Drawings</td><td class="r">500</td></tr><tr><td>31 Balance c/d</td><td class="r">2,100</td></tr><tr><td><b>Total</b></td><td class="r"><b>21,000</b></td></tr></table></div>
<p>The same posting is done for every account. The resulting trial balance in debit/credit form: Cash 2,100, Equipment 17,400, Supplies 250, expenses 1,300 and Drawings 500 on the debit side (21,550); Capital 19,000, Creditors 350, Sales 2,000 and Accumulated Depreciation 200 on the credit side (21,550).</p></div>`});

lecture({id:'tc03',course:'tc',n:'03',title:'Current Assets & Liabilities',sub:'Debtors and creditors, deferrals and accruals, cost of goods sold, and why the way you value inventory changes the profit you report.',chips:['Deferrals & accruals','COGS','FIFO / LIFO','Lower of cost or NRV'],body:()=>`
<div class="card"><h2>Definitions</h2><dl class="def">
<dt>Debtors (property)</dt><dd>Trade debtors or accounts receivable (open-account sales, not evidenced by a written promise), bills receivable (written evidence of debt), advances and deposits with suppliers, short-term loans to employees. Long-term loans to associated organisations are classified as investments.</dd>
<dt>Creditors (right to property)</dt><dd>Trade creditors or accounts payable, bills payable, deposits or advances from customers, loans from banks or associated organisations.</dd>
<dt>Deferral</dt><dd>Postponing the recognition of an expense already paid whose benefit belongs to a later period, or of an income already received that is still unearned. Deferred expenses are <b>assets</b>; deferred incomes are <b>liabilities</b>.</dd>
<dt>Accrual</dt><dd>An expense or income that has gradually accumulated but not yet been paid or received. Accrued expenses are <b>liabilities</b>; accrued incomes are <b>assets</b>.</dd></dl>
<h3>Deferral example — rent paid a year in advance</h3>
<table class="plain"><tr><th>Date</th><th>Description</th><th class="r">Debit</th><th class="r">Credit</th></tr><tr><td>Jan 1</td><td>Prepaid Rent<br>&nbsp;&nbsp;&nbsp;Cash <i>(paid rent for 1 year in advance)</i></td><td class="r">600</td><td class="r">600</td></tr><tr><td>Jan 31</td><td>Rent Expense<br>&nbsp;&nbsp;&nbsp;Prepaid Rent <i>(one month used)</i></td><td class="r">50</td><td class="r">50</td></tr></table>
<p>After January the Prepaid Rent account still shows an asset of 550 — eleven months of rent that belong to future periods.</p></div>
<div class="card"><h2>Cost of goods sold</h2>
${S({title:'Cost of goods sold',cols:[260,110],rows:[
['Opening balance of supplies',{in:'o',v:10000}],
['Purchases during the period',{in:'p',v:40000}],
['Value of goods available for sale',{f:v=>v.o+v.p,n:'av',fx:'=B1+B2',fmt:'#,##0'}],
['Closing balance of supplies',{in:'c',v:13000}],
[{t:'<b>Cost of goods sold</b>'},{f:v=>v.av-v.c,fx:'=B3-B4',fmt:'#,##0',tot:true}]
]})}
<h3>The closing inventory sets the profit</h3>
<p>Sales, purchases and expenses are facts; the value put on the goods still on the shelf is a judgement. Move the closing inventory and see profit and capital move with it, rupee for rupee.</p>
${S({title:'Impact of inventory valuation on P&L and balance sheet',cols:[200,100,100,100],rows:[
[{h:''},{h:'Inventory at 10,000'},{h:'Inventory at 20,000'},{h:'Inventory at 30,000'}],
['Closing inventory stated at',{in:'i1',v:10000},{in:'i2',v:20000},{in:'i3',v:30000}],
['Net sales',{in:'ns',v:300000},{f:v=>v.ns,fx:'=B3',fmt:'#,##0'},{f:v=>v.ns,fx:'=B3',fmt:'#,##0'}],
['Goods available for sale (opening + purchases)',{in:'ga',v:140000},{f:v=>v.ga,fx:'=B4',fmt:'#,##0'},{f:v=>v.ga,fx:'=B4',fmt:'#,##0'}],
['Cost of goods sold',{f:v=>v.ga-v.i1,n:'c1',fx:'=B4-B2',fmt:'#,##0'},{f:v=>v.ga-v.i2,n:'c2',fx:'=C4-C2',fmt:'#,##0'},{f:v=>v.ga-v.i3,n:'c3',fx:'=D4-D2',fmt:'#,##0'}],
['Gross profit',{f:v=>v.ns-v.c1,n:'g1',fx:'=B3-B5',fmt:'#,##0'},{f:v=>v.ns-v.c2,n:'g2',fx:'=C3-C5',fmt:'#,##0'},{f:v=>v.ns-v.c3,n:'g3',fx:'=D3-D5',fmt:'#,##0'}],
['Expenses',{in:'ex',v:40000},{f:v=>v.ex,fx:'=B7',fmt:'#,##0'},{f:v=>v.ex,fx:'=B7',fmt:'#,##0'}],
[{t:'<b>Net profit</b>'},{f:v=>v.g1-v.ex,fx:'=B6-B7',fmt:'#,##0',tot:true},{f:v=>v.g2-v.ex,fx:'=C6-C7',fmt:'#,##0',tot:true},{f:v=>v.g3-v.ex,fx:'=D6-D7',fmt:'#,##0',tot:true}],
['Total assets (inventory + other assets 200,000)',{f:v=>v.i1+200000,fx:'=B2+200000',fmt:'#,##0'},{f:v=>v.i2+200000,fx:'=C2+200000',fmt:'#,##0'},{f:v=>v.i3+200000,fx:'=D2+200000',fmt:'#,##0'}],
['Capital (liabilities 30,000 fixed)',{f:v=>v.i1+170000,fx:'=B9-30000',fmt:'#,##0'},{f:v=>v.i2+170000,fx:'=C9-30000',fmt:'#,##0'},{f:v=>v.i3+170000,fx:'=D9-30000',fmt:'#,##0'}]
]})}</div>
<div class="card"><h2>FIFO, LIFO and weighted average</h2>
<p><b>FIFO</b> — merchandise is sold in the order of purchase (as with perishable items); the inventory left consists of the most recent purchases. <b>LIFO</b> — sold in reverse order (in harmony with inflation); the inventory left consists of the earliest purchases. The <b>weighted average</b> spreads the total cost over all units. Inventories are always valued at the <em>lower of cost or net realisable value</em>.</p>
${S({title:'Inventory valuation — 1,000 units available, 300 counted at year end',cols:[150,70,90,100],rows:[
[{h:'Lot'},{h:'Units'},{h:'Rs / unit'},{h:'Value'}],
['1 Jan — opening inventory',{in:'q1',v:300},{in:'p1',v:6},{f:v=>v.q1*v.p1,n:'v1',fx:'=B2*C2',fmt:'#,##0'}],
['10 Feb — purchase',{in:'q2',v:300},{in:'p2',v:7},{f:v=>v.q2*v.p2,n:'v2',fx:'=B3*C3',fmt:'#,##0'}],
['2 Oct — purchase',{in:'q3',v:300},{in:'p3',v:8},{f:v=>v.q3*v.p3,n:'v3',fx:'=B4*C4',fmt:'#,##0'}],
['20 Dec — purchase',{in:'q4',v:100},{in:'p4',v:9},{f:v=>v.q4*v.p4,n:'v4',fx:'=B5*C5',fmt:'#,##0'}],
[{t:'<b>Goods available for sale</b>'},{f:v=>v.q1+v.q2+v.q3+v.q4,n:'qa',fx:'=SUM(B2:B5)',fmt:'#,##0',tot:true},null,{f:v=>v.v1+v.v2+v.v3+v.v4,n:'va',fx:'=SUM(D2:D5)',fmt:'#,##0',tot:true}],
['Physical count on 31 Dec',{in:'cnt',v:300}],
[{s:'FIFO — closing stock = latest purchases',span:4}],
['Closing inventory value',null,null,{f:v=>{let n=v.cnt,t=0;for(const [q,p] of [[v.q4,v.p4],[v.q3,v.p3],[v.q2,v.p2],[v.q1,v.p1]]){const k=Math.min(n,q);t+=k*p;n-=k;}return t;},n:'fifo',fx:'= newest lots first (100@9 + 200@8)',fmt:'#,##0'}],
['Cost of goods sold',null,null,{f:v=>v.va-v.fifo,fx:'=D6-D9',fmt:'#,##0',tot:true}],
[{s:'LIFO — closing stock = earliest purchases',span:4}],
['Closing inventory value',null,null,{f:v=>{let n=v.cnt,t=0;for(const [q,p] of [[v.q1,v.p1],[v.q2,v.p2],[v.q3,v.p3],[v.q4,v.p4]]){const k=Math.min(n,q);t+=k*p;n-=k;}return t;},n:'lifo',fx:'= oldest lots first (300@6)',fmt:'#,##0'}],
['Cost of goods sold',null,null,{f:v=>v.va-v.lifo,fx:'=D6-D12',fmt:'#,##0',tot:true}],
[{s:'Weighted average',span:4}],
['Average cost per unit',null,{f:v=>v.va/v.qa,n:'avg',fx:'=D6/B6',fmt:'0.00'}],
['Closing inventory value',null,null,{f:v=>v.cnt*v.avg,n:'wav',fx:'=B7*C15',fmt:'#,##0'}],
['Cost of goods sold',null,null,{f:v=>v.va-v.wav,fx:'=D6-D16',fmt:'#,##0',tot:true}]
]})}
<div class="note">In the lecture’s example FIFO gave a cost of goods sold of 4,700, LIFO 5,400 and the average method 5,040 from the same purchases — three different profits from one physical reality. Rising prices make LIFO report the lowest profit (and the lowest tax).</div></div>`});

lecture({id:'tc04',course:'tc',n:'04',title:'Fixed Assets',sub:'What counts as the cost of a fixed asset, the concept of useful life, and three ways to depreciate — straight line, declining balance and double declining balance.',chips:['Initial cost','Straight line','Declining balance','Disposal'],body:()=>`
<div class="card"><h2>Fixed assets and their cost</h2>
<p>Fixed assets are capable of repeated use with an expected life of more than one year. When equipment is removed from service and held for sale it ceases to be a fixed asset. The <b>initial cost</b> includes every expenditure needed to get the asset in place and ready for use: import duty, sales tax, transportation, insurance in transit, special foundations and installation. For land it includes the negotiated price plus broker’s commission, registration and surveying fees.</p>
<p>With the passage of time all fixed assets except land lose their capacity to yield services. The decline in cost is charged to expense in a systematic manner — <b>depreciation</b>.</p></div>
<div class="card"><h2>Straight line — uniform usage</h2>
${S({title:'Straight-line depreciation',cols:[260,110],rows:[
['Cost',{in:'c',v:20000}],['Residual value',{in:'r',v:2000}],['Useful life (years)',{in:'n',v:5}],
[{t:'<b>Annual depreciation</b>'},{f:v=>(v.c-v.r)/v.n,n:'d',fx:'=(B1-B2)/B3',fmt:'#,##0',tot:true}],
['Written-down value at end of year 1',{f:v=>v.c-v.d,fx:'=B1-B4',fmt:'#,##0'}],
['Written-down value at end of final year',{f:v=>v.c-v.n*v.d,fx:'=B1-B3*B4',fmt:'#,##0'}]
]})}</div>
<div class="card"><h2>Declining balance — heavy early use</h2>
<p>A fixed rate is applied to the written-down value, ignoring the residual value — but depreciation should not take the book value below the expected residual. It suits assets whose productivity declines proportionately more in early years; the smaller later charges are offset by rising maintenance costs. <b>Double declining</b> simply uses twice the straight-line rate (40% for a 5-year life) and stops at the residual value.</p>
<div class="grid2">
${S({title:'Declining balance',cols:[40,70,90,90,90],rows:[
[{h:'Yr'},{h:'Rate'},{h:'Book value'},{h:'Depreciation'},{h:'End value'}],
['',{t:'Cost'},{in:'c',v:10000},{t:'Rate'},{in:'r',v:0.2,fmt:'0%'}],
['1',null,{f:v=>v.c,n:'b1',fx:'=C2',fmt:'#,##0'},{f:v=>v.b1*v.r,n:'d1',fx:'=C3*$E$2',fmt:'#,##0'},{f:v=>v.b1-v.d1,n:'e1',fx:'=C3-D3',fmt:'#,##0'}],
['2',null,{f:v=>v.e1,n:'b2',fx:'=E3',fmt:'#,##0'},{f:v=>v.b2*v.r,n:'d2',fx:'=C4*$E$2',fmt:'#,##0'},{f:v=>v.b2-v.d2,n:'e2',fx:'=C4-D4',fmt:'#,##0'}],
['3',null,{f:v=>v.e2,n:'b3',fx:'=E4',fmt:'#,##0'},{f:v=>v.b3*v.r,n:'d3',fx:'=C5*$E$2',fmt:'#,##0'},{f:v=>v.b3-v.d3,n:'e3',fx:'=C5-D5',fmt:'#,##0'}],
['4',null,{f:v=>v.e3,n:'b4',fx:'=E5',fmt:'#,##0'},{f:v=>v.b4*v.r,n:'d4',fx:'=C6*$E$2',fmt:'#,##0'},{f:v=>v.b4-v.d4,n:'e4',fx:'=C6-D6',fmt:'#,##0'}],
['5',null,{f:v=>v.e4,n:'b5',fx:'=E6',fmt:'#,##0'},{f:v=>v.b5*v.r,n:'d5',fx:'=C7*$E$2',fmt:'#,##0'},{f:v=>v.b5-v.d5,fx:'=C7-D7',fmt:'#,##0'}]
]})}
${S({title:'Double declining balance (floor at residual)',cols:[40,70,90,90,90],rows:[
[{h:'Yr'},{h:''},{h:'Book value'},{h:'Depreciation'},{h:'End value'}],
['',{t:'Cost'},{in:'c',v:10000},{t:'Residual'},{in:'res',v:2000}],
['',{t:'Rate'},{in:'r',v:0.4,fmt:'0%'}],
['1',null,{f:v=>v.c,n:'b1',fx:'=C2',fmt:'#,##0'},{f:v=>Math.min(v.b1*v.r,Math.max(v.b1-v.res,0)),n:'d1',fx:'=MIN(C4*rate, C4-residual)',fmt:'#,##0'},{f:v=>v.b1-v.d1,n:'e1',fx:'=C4-D4',fmt:'#,##0'}],
['2',null,{f:v=>v.e1,n:'b2',fx:'=E4',fmt:'#,##0'},{f:v=>Math.min(v.b2*v.r,Math.max(v.b2-v.res,0)),n:'d2',fx:'=MIN(C5*rate, C5-residual)',fmt:'#,##0'},{f:v=>v.b2-v.d2,n:'e2',fx:'=C5-D5',fmt:'#,##0'}],
['3',null,{f:v=>v.e2,n:'b3',fx:'=E5',fmt:'#,##0'},{f:v=>Math.min(v.b3*v.r,Math.max(v.b3-v.res,0)),n:'d3',fx:'=MIN(C6*rate, C6-residual)',fmt:'#,##0'},{f:v=>v.b3-v.d3,n:'e3',fx:'=C6-D6',fmt:'#,##0'}],
['4',null,{f:v=>v.e3,n:'b4',fx:'=E6',fmt:'#,##0'},{f:v=>Math.min(v.b4*v.r,Math.max(v.b4-v.res,0)),n:'d4',fx:'=MIN(C7*rate, C7-residual)',fmt:'#,##0'},{f:v=>v.b4-v.d4,n:'e4',fx:'=C7-D7',fmt:'#,##0'}],
['5',null,{f:v=>v.e4,n:'b5',fx:'=E7',fmt:'#,##0'},{f:v=>Math.min(v.b5*v.r,Math.max(v.b5-v.res,0)),n:'d5',fx:'=MIN(C8*rate, C8-residual)',fmt:'#,##0'},{f:v=>v.b5-v.d5,fx:'=C8-D8',fmt:'#,##0'}]
]})}</div></div>
<div class="card"><h2>Worked example — Map Furniture’s delivery trucks (2004–2006)</h2>
<p>A three-year sequence of purchase, repair, trade-in and sale. The key rules: major repairs that extend life are capitalised (13,300 added to cost); routine repairs are expensed; depreciation is recorded up to the date of disposal; the difference between book value and proceeds is the gain or loss on disposal.</p>
<table class="plain"><tr><th>Date</th><th>Event</th><th>Treatment</th></tr>
<tr><td>24 Feb 2004</td><td>Used truck bought for 124,000 cash; 26 Feb major repairs 13,300</td><td>Delivery Equipment 137,300 (life 3 yrs, trade-in 25,000, straight line)</td></tr>
<tr><td>21 Oct 2004</td><td>Garage bill 1,450</td><td>Truck Repair Expense</td></tr>
<tr><td>31 Dec 2004</td><td>Depreciation for 10 months</td><td>(137,300 − 25,000)/3 × 10/12 = 31,194</td></tr>
<tr><td>10 Sep 2005</td><td>Traded in on a new truck priced 497,000; allowance 50,000</td><td>Depreciation to date 24,956; disposal account closes with a loss of 31,150</td></tr>
<tr><td>31 Dec 2005</td><td>Depreciation on new truck (life 5 yrs, residual 80,000, DDB)</td><td>497,000 × 40% × 4/12 = 66,267</td></tr>
<tr><td>28 Aug 2006</td><td>Another new truck bought for 570,000</td><td>Delivery Equipment</td></tr>
<tr><td>29 Oct 2006</td><td>2005 truck sold for 260,000</td><td>Depreciation to date 152,413 (132,533 for 8 months + 19,880 for 2 months); book value 278,320 → loss 18,320</td></tr>
<tr><td>31 Dec 2006</td><td>Depreciation on remaining truck (life 4 yrs, residual 90,000, DDB)</td><td>570,000 × 50% × 4/12 = 95,000</td></tr></table>
${S({title:'Disposal of the 2005 truck — gain or loss',cols:[260,110],rows:[
['Cost of truck',{in:'c',v:497000}],['Accumulated depreciation to date of sale',{in:'ad',v:218680}],['Book value',{f:v=>v.c-v.ad,n:'bv',fx:'=B1-B2',fmt:'#,##0'}],['Cash received',{in:'p',v:260000}],[{t:'<b>Gain / (loss) on disposal</b>'},{f:v=>v.p-v.bv,fx:'=B4-B3',fmt:'#,##0',tot:true}]
]})}
<div class="warn"><b>Assignment 1 (lectures 1–4, 30 marks):</b> download the financial statements of a Pakistani company of your choice and write a note on its treatment of depreciation, inventory valuation, cost of goods sold and disposal of fixed assets.</div></div>`});

lecture({id:'tc05',course:'tc',n:'05',title:'Managerial Accounting – Introduction',sub:'Cost objects, cost accumulation and assignment, and the difference between direct and indirect cost.',chips:['Cost object','Direct cost','Indirect cost'],body:()=>`
<div class="card"><h2>From keeping records to making decisions</h2>
<p>Financial accounting looks backwards and outwards — it reports to owners, banks and the tax authority. Managerial accounting looks inwards: it measures the cost of the things managers decide about. Five terms carry the whole subject.</p>
<dl class="def">
<dt>Cost object</dt><dd>A product, machine, service or process for which a separate measurement of cost is desired — a lot of fabric, a loom, a dyeing route, a customer order.</dd>
<dt>Cost accumulation</dt><dd>Collecting cost data in some organised way (by department, by machine, by account).</dd>
<dt>Cost assignment</dt><dd>Tracing and allocating the accumulated cost to the cost object.</dd>
<dt>Direct cost</dt><dd>A cost related to the cost object that can be <em>traced</em> to it in an economically feasible way — the grey fabric in a dyeing lot, the yarn in a beam.</dd>
<dt>Indirect cost</dt><dd>A cost related to the cost object that cannot be traced economically and is therefore <em>allocated</em> — electricity, supervision, depreciation of the shed.</dd></dl>
<div class="note">The same cost can be direct for one object and indirect for another. The salary of a loom-shed supervisor is direct to the weaving department but indirect to any single order woven there. Whenever a figure looks “obvious”, ask: traced or allocated?</div>
<p>In class the concepts of the first four lectures were reviewed alongside these definitions; the next lecture puts them to work in unit costing.</p></div>
<div class="card"><h2>Classify these textile costs</h2>
<table class="plain"><tr><th>Cost</th><th>Cost object: one dyeing order</th><th>Cost object: the dyeing department</th></tr>
<tr><td>Grey fabric issued to the order</td><td>Direct</td><td>Direct</td></tr><tr><td>Dyes weighed for the shade</td><td>Direct</td><td>Direct</td></tr><tr><td>Steam for the whole plant</td><td>Indirect (allocated per metre)</td><td>Indirect (allocated per department)</td></tr><tr><td>Dyeing manager’s salary</td><td>Indirect</td><td>Direct</td></tr><tr><td>Depreciation of the pad-steam range</td><td>Indirect (allocated per machine-hour)</td><td>Direct</td></tr></table></div>`});

lecture({id:'tc06',course:'tc',n:'06',title:'Unit Costing',sub:'Variable and fixed cost, total and unit cost, work in process, and the cost of goods sold for a manufacturer.',chips:['Cost driver','Variable vs fixed','Cost of goods manufactured'],body:()=>`
<div class="card"><h2>Definitions</h2><dl class="def">
<dt>Cost driver</dt><dd>Any factor that affects total cost — a change in the level of the driver changes the total cost of the related cost object: units produced, machine set-ups, advertisements.</dd>
<dt>Variable cost</dt><dd>Changes in total in proportion to changes in a cost driver.</dd>
<dt>Fixed cost</dt><dd>Does not change in total despite changes in the cost driver.</dd>
<dt>Unit cost</dt><dd>Some total cost divided by some number of units — always ask which total and which units.</dd>
<dt>Work-in-process inventory</dt><dd>Goods partially worked on but not yet completed.</dd>
<dt>Finished goods inventory</dt><dd>Goods fully completed but not yet sold.</dd></dl>
<div class="grid2"><div><h3>Merchandising</h3><div class="formula">Beginning merchandise inventory<br>+ Purchases<br>− Ending merchandise inventory<br>= Cost of goods sold</div></div><div><h3>Manufacturing</h3><div class="formula">Beginning finished goods<br>+ Cost of goods manufactured<br>− Ending finished goods<br>= Cost of goods sold</div></div></div></div>
<div class="card"><h2>Cost of goods manufactured and sold</h2>
<p>The manufacturing statement flows from materials to work in process to finished goods. Edit any input; the totals chain through to the cost of goods sold.</p>
${S({title:'Schedule of cost of goods manufactured',cols:[300,100,100],rows:[
[{s:'Direct materials',span:3}],
['   Beginning inventory',{in:'dmb',v:11000}],
['   Purchases of direct materials',{in:'dmp',v:73000}],
['   Cost of direct materials available for use',{f:v=>v.dmb+v.dmp,n:'dma',fx:'=B2+B3',fmt:'#,##0'}],
['   Ending inventory',{in:'dme',v:8000}],
['Direct materials used',null,{f:v=>v.dma-v.dme,n:'dmu',fx:'=B4-B5',fmt:'#,##0'}],
['Direct manufacturing labour',null,{in:'dl',v:17750}],
[{s:'Indirect manufacturing cost',span:3}],
['   Indirect manufacturing labour',{in:'i1',v:4000}],['   Supplies',{in:'i2',v:1000}],['   Utilities',{in:'i3',v:1750}],['   Depreciation — plant building',{in:'i4',v:1500}],['   Depreciation — plant equipment',{in:'i5',v:2500}],
['   Miscellaneous',{in:'i6',v:500},{f:v=>v.i1+v.i2+v.i3+v.i4+v.i5+v.i6,n:'ind',fx:'=SUM(B9:B14)',fmt:'#,##0'}],
['Manufacturing costs incurred during the period',null,{f:v=>v.dmu+v.dl+v.ind,n:'mc',fx:'=C6+C7+C14',fmt:'#,##0'}],
['Add beginning work in process',null,{in:'wb',v:6000}],
['Total manufacturing costs to account for',null,{f:v=>v.mc+v.wb,n:'tm',fx:'=C15+C16',fmt:'#,##0'}],
['Subtract ending work in process',null,{in:'we',v:7000}],
[{t:'<b>Cost of goods manufactured</b>'},null,{f:v=>v.tm-v.we,n:'cgm',fx:'=C17-C18',fmt:'#,##0',tot:true}],
[{s:'Cost of goods sold',span:3}],
['Beginning finished goods inventory',null,{in:'fb',v:22000}],
['Cost of goods manufactured',null,{f:v=>v.cgm,fx:'=C19',fmt:'#,##0'}],
['Cost of goods available for sale',null,{f:v=>v.fb+v.cgm,n:'ga',fx:'=C21+C22',fmt:'#,##0'}],
['Ending finished goods inventory',null,{in:'fe',v:18000}],
[{t:'<b>Cost of goods sold</b>'},null,{f:v=>v.ga-v.fe,fx:'=C23-C24',fmt:'#,##0',tot:true}]
]})}</div>`});

lecture({id:'tc07',course:'tc',n:'07',title:'Cost-Volume-Profit Relationship',sub:'Contribution margin, gross margin, the break-even point and sensitivity analysis.',chips:['Contribution margin','Break-even','Sensitivity'],body:()=>`
<div class="card"><h2>The three ideas</h2><dl class="def">
<dt>Contribution margin</dt><dd>Revenues minus all costs that vary with the number of output units.</dd>
<dt>Unit contribution margin (UCM)</dt><dd>Unit sales price − unit variable cost.</dd>
<dt>Break-even point</dt><dd>The quantity of output where total revenues equal total costs.</dd></dl>
<div class="formula">TR = TVC + TFC &nbsp;→&nbsp; USP × Q = UVC × Q + TFC &nbsp;→&nbsp; Q<sub>BE</sub> = TFC / UCM</div>
<p><b>Example.</b> New Marketing sells orange juice at a university conference: bought at Rs 6.00, sold at Rs 10.00, unsold units returnable, stall cost Rs 5,000. Break-even = 5,000 / (10 − 6) = 1,250 units. To earn a target profit, add it to the fixed cost.</p>
${S({title:'Break-even and target-profit calculator',cols:[260,110],rows:[
['Unit selling price (USP)',{in:'p',v:10}],['Unit variable cost (UVC)',{in:'c',v:6}],['Total fixed cost (TFC)',{in:'f',v:5000}],['Target profit',{in:'t',v:0}],
['Unit contribution margin',{f:v=>v.p-v.c,n:'u',fx:'=B1-B2',fmt:'0.00'}],
[{t:'<b>Units to sell</b>'},{f:v=>(v.f+v.t)/v.u,fx:'=(B3+B4)/B5',fmt:'#,##0',tot:true}],
['Revenue at that volume',{f:v=>(v.f+v.t)/v.u*v.p,fx:'=B6*B1',fmt:'#,##0'}],
['Contribution margin ratio',{f:v=>v.u/v.p,fx:'=B5/B1',fmt:'0.0%'}]
]})}
${CH({w:600,h:280,xl:'Units sold',yl:'Rupees',xmax:2500,ymax:25000,series:[{pts:[[0,0],[2500,25000]],color:'#0f766e',label:'Revenue'},{pts:[[0,5000],[2500,20000]],color:'#b45309',label:'Total cost'},{pts:[[0,5000],[2500,5000]],color:'#9ca3af',label:'Fixed cost'}],marks:[{x:1250,y:12500,label:'Break-even 1,250'}]})}</div>
<div class="card"><h2>Sensitivity analysis — units needed for different fixed costs, variable costs and profit targets</h2>
<p>The lecture left blanks to fill in; here the whole table is live. Rows are combinations of fixed cost and unit variable cost at the selling price entered in row 2 (Rs 10 in the lecture).</p>
${S({title:'Units to be sold at the selling price in row 2',cols:[100,80,90,90,90,90],rows:[
[{h:'Fixed cost'},{h:'UVC'},{h:'Profit 0'},{h:'Profit 1,000'},{h:'Profit 1,500'},{h:'Profit 2,000'}],
['Selling price',{in:'p',v:10}],
...[[4000,5],[4000,6],[4000,7],[5000,5],[5000,6],[5000,7],[6000,5],[6000,6],[6000,7]].map(([f,c],i)=>[{in:'f'+i,v:f},{in:'c'+i,v:c},{f:v=>v['f'+i]/(v.p-v['c'+i]),fx:'=(A+0)/(price−B)',fmt:'#,##0'},{f:v=>(v['f'+i]+1000)/(v.p-v['c'+i]),fx:'=(A+1000)/(price−B)',fmt:'#,##0'},{f:v=>(v['f'+i]+1500)/(v.p-v['c'+i]),fx:'=(A+1500)/(price−B)',fmt:'#,##0'},{f:v=>(v['f'+i]+2000)/(v.p-v['c'+i]),fx:'=(A+2000)/(price−B)',fmt:'#,##0'}])
]})}</div>`});

lecture({id:'tc08',course:'tc',n:'08',title:'CVP in Textiles',sub:'Contribution margin and break-even applied to a spinning mill, a weaving shed and a dyeing plant.',chips:['Spinning','Weaving','Dyeing','Break-even'],body:()=>`
<div class="card"><h2>Spinning — 250 bags a day of Ne 20/1</h2>
${S({title:'Spinning mill — daily and monthly profitability',cols:[280,120,120],rows:[
['Daily production (bags of 100 lb)',{in:'bags',v:250}],
[{s:'Monthly fixed cost',span:3}],
['   Depreciation',{in:'f1',v:3500000}],['   Financial charges',{in:'f2',v:4500000}],['   Administration',{in:'f3',v:400000}],['   Miscellaneous',{in:'f4',v:3000000},{f:v=>v.f1+v.f2+v.f3+v.f4,n:'fm',fx:'=SUM(B3:B6)',fmt:'#,##0'}],
['Daily fixed cost (÷30)',null,{f:v=>v.fm/30,n:'fd',fx:'=C6/30',fmt:'#,##0'}],
[{s:'Profitability per lb',span:3}],
['Net cost of raw material per lb',{in:'rm',v:35}],['Yarn price per lb (Rs 510 per 10 lb)',{in:'yp',v:51}],
['Contribution per lb',{f:v=>v.yp-v.rm,n:'cl',fx:'=B10-B9',fmt:'0.00'}],
['Daily contribution (× bags × 100 lb)',null,{f:v=>v.cl*v.bags*100,n:'dc',fx:'=B11*B1*100',fmt:'#,##0'}],
[{t:'<b>Profit / (loss) per day</b>'},null,{f:v=>v.dc-v.fd,n:'pd',fx:'=C12-C7',fmt:'#,##0',tot:true}],
['Profit / (loss) per month',null,{f:v=>v.pd*30,fx:'=C13*30',fmt:'#,##0'}],
['Break-even bags per day',null,{f:v=>v.fd/(v.cl*100),fx:'=C7/(B11*100)',fmt:'0.0'}]
]})}</div>
<div class="card"><h2>Weaving — 120 air-jet looms on 20×16/128×60 63″</h2>
${S({title:'Weaving shed — per loom and per unit',cols:[280,120,120],rows:[
['Daily production per loom (m)',{in:'pl',v:500}],['Total looms',{in:'n',v:120}],['Daily production of the unit (m)',{f:v=>v.pl*v.n,n:'du',fx:'=B1*B2',fmt:'#,##0'}],
[{s:'Monthly fixed cost',span:3}],
['   Depreciation',{in:'f1',v:5600000}],['   Financial charges',{in:'f2',v:6500000}],['   Administration',{in:'f3',v:300000}],['   Miscellaneous',{in:'f4',v:2000000},{f:v=>v.f1+v.f2+v.f3+v.f4,n:'fm',fx:'=SUM(B5:B8)',fmt:'#,##0'}],
['Daily fixed cost',null,{f:v=>v.fm/30,n:'fd',fx:'=C8/30',fmt:'#,##0'}],
['Daily fixed cost per loom',null,{f:v=>v.fd/v.n,n:'fl',fx:'=C9/B2',fmt:'#,##0'}],
['Cost of yarn and other materials per metre',{in:'cm',v:50}],['Price per metre',{in:'pm',v:59}],
['Contribution per metre',{f:v=>v.pm-v.cm,n:'c',fx:'=B12-B11',fmt:'0.00'}],
['Daily contribution per loom',null,{f:v=>v.c*v.pl,n:'dcl',fx:'=B13*B1',fmt:'#,##0'}],
[{t:'<b>Profit / (loss) per day per loom</b>'},null,{f:v=>v.dcl-v.fl,n:'ppl',fx:'=C14-C10',fmt:'#,##0',tot:true}],
['Profit / (loss) per day',null,{f:v=>v.ppl*v.n,n:'pd',fx:'=C15*B2',fmt:'#,##0'}],
['Profit / (loss) per month',null,{f:v=>v.pd*30,fx:'=C16*30',fmt:'#,##0'}],
['Break-even metres per loom per day',null,{f:v=>v.fl/v.c,fx:'=C10/B13',fmt:'#,##0.0'}]
]})}</div>
<div class="card"><h2>Dyeing — commission finishing of 50,000 m a day (medium colours)</h2>
${S({title:'Dyeing plant — commission finishing',cols:[280,120,120],rows:[
['Production per day (m)',{in:'pd',v:50000}],
['Monthly fixed cost (dep 5.6M + fin 6.5M + admin 0.3M + misc 2.0M)',{in:'fm',v:14400000}],
['Daily fixed cost',null,{f:v=>v.fm/30,n:'fd',fx:'=B2/30',fmt:'#,##0'}],
['Fixed cost per metre',null,{f:v=>v.fd/v.pd,fx:'=C3/B1',fmt:'0.00'}],
['Cost of dyes and chemicals per metre',{in:'dc',v:5}],['Cost of utilities and misc per metre',{in:'ut',v:3}],['Charges per metre',{in:'ch',v:20}],
['Contribution per metre',{f:v=>v.ch-v.dc-v.ut,n:'c',fx:'=B7-B5-B6',fmt:'0.00'}],
['Daily contribution',null,{f:v=>v.c*v.pd,n:'dcn',fx:'=B8*B1',fmt:'#,##0'}],
[{t:'<b>Profit / (loss) per day</b>'},null,{f:v=>v.dcn-v.fd,n:'p',fx:'=C9-C3',fmt:'#,##0',tot:true}],
['Profit / (loss) per month',null,{f:v=>v.p*30,fx:'=C10*30',fmt:'#,##0'}],
['Break-even metres per day',null,{f:v=>v.fd/v.c,fx:'=C3/B8',fmt:'#,##0'}]
]})}
<div class="note">Exercise from the lecture: find the break-even point for each plant. The last row of each sheet now answers it — and shows how thin the margin is in weaving, where one rupee per metre on yarn price wipes out the shed’s entire profit (contribution 9 → 8 × 500 m = 4,000 = the daily fixed cost per loom).</div></div>`});

lecture({id:'tc09',course:'tc',n:'09',title:'Costing Systems I — Job Costing',sub:'Assigning costs to a distinct job, batch or lot: the six steps, with a 10,000 m printing job.',chips:['Job costing','Allocation base','Actual vs normal costing'],body:()=>`
<div class="card"><h2>When a job is the cost object</h2>
<p>In job costing, costs are assigned to a distinct unit, batch or lot of a product or service — something custom-made, such as printing a particular design on a particular fabric, or building a house. A job is a task for which resources are used to bring a distinct product or service to market.</p>
<ol class="steps">
<li><b>Identify the job</b> — a lot of fabric to be printed, 10,000 metres.</li>
<li><b>Identify the direct costs</b> — fabric consumed, colours and chemicals consumed.</li>
<li><b>Identify the indirect-cost pools</b> — utilities, depreciation and other overhead (monthly utilities 3,000,000; overhead 10,000,000).</li>
<li><b>Select the cost-allocation base</b> — here production in metres.</li>
<li><b>Develop the rate per unit of the base</b> — total pools ÷ monthly production.</li>
<li><b>Assign the costs</b> — direct costs plus the allocated indirect cost.</li></ol>
${S({title:'Job cost sheet — printing lot of 10,000 m',cols:[300,110,110],rows:[
['Job size (metres)',{in:'job',v:10000}],
['Grey fabric consumed (metres)',{in:'gm',v:11000}],['Grey fabric price per metre',{in:'gp',v:100}],
['Dyes and chemicals for the job',{in:'dc',v:120000}],
['Monthly utilities (indirect pool 1)',{in:'u',v:3000000}],['Monthly overhead (indirect pool 2)',{in:'o',v:10000000}],
['Total monthly production (allocation base, m)',{in:'tp',v:650000}],
['Indirect cost rate per metre',{f:v=>(v.u+v.o)/v.tp,n:'rate',fx:'=(B5+B6)/B7',fmt:'0.00'}],
[{s:'Cost of the job',span:3}],
['Fabric',null,{f:v=>v.gm*v.gp,n:'cf',fx:'=B2*B3',fmt:'#,##0'}],
['Dyes and chemicals',null,{f:v=>v.dc,n:'cd',fx:'=B4',fmt:'#,##0'}],
['Utilities and overhead allocated',null,{f:v=>v.rate*v.job,n:'ci',fx:'=B8*B1',fmt:'#,##0'}],
[{t:'<b>Total cost of job</b>'},null,{f:v=>v.cf+v.cd+v.ci,n:'tc',fx:'=SUM(C10:C12)',fmt:'#,##0',tot:true}],
['Cost per metre of printed fabric',null,{f:v=>v.tc/v.job,fx:'=C13/B1',fmt:'0.00'}]
]})}</div>
<div class="card"><h2>Actual, normal and budgeted costing</h2>
<dl class="def"><dt>Actual costing</dt><dd>As above — wait until the end of the period, find the exact indirect costs, then allocate them to the job.</dd>
<dt>Normal costing</dt><dd>Budgeted rather than actual costs are used to compute the indirect-cost rate, so a job can be costed the day it finishes. Direct costs are traced in the same way under both systems.</dd>
<dt>Budgeted costing</dt><dd>Budgeted rates are used even for direct costs.</dd>
<dt>Variance</dt><dd>The cost accounting department compares the standard rate with the actual rate. A favourable variance shows the department is operating efficiently; an unfavourable one alerts management that corrective action may be required. When a job is processed at the standard rate and a variance occurs, the variance is applied to the job orders processed and, if necessary, the shop rate is adjusted.</dd></dl></div>`});

lecture({id:'tc10',course:'tc',n:'10',title:'Costing Systems II — Process Costing',sub:'Averaging costs over masses of similar units, with and without work in process — the equivalent-units method at Sino-Pak Textiles.',chips:['Process costing','Equivalent units','WIP'],body:()=>`
<div class="card"><h2>Job costing versus process costing</h2>
<p>In process costing the cost of a product is obtained by using broad averages to assign costs to masses of similar units — identical items mass-produced for general sale, not for a specific customer. The principal difference from job costing is the <em>extent of averaging</em>: individual jobs use different quantities of resources, so it would be wrong to cost each at the same average; when like units are mass-produced, averaging over all units produced is exactly right.</p>
<p><b>Example.</b> Sino-Pak Textiles spins only Ne 20/1 for the moment. Assume one direct-cost category (direct materials); conversion costs include labour, indirect materials, energy, plant depreciation and so on.</p></div>
<div class="card"><h2>Case I — no beginning or ending work in process (January)</h2>
${S({title:'January — all units started and completed',cols:[300,110],rows:[
['Started and completed (bags)',{in:'q',v:6000}],['Direct materials cost added',{in:'dm',v:18000000}],['Conversion cost added',{in:'cc',v:12000000}],
['Total manufacturing cost',{f:v=>v.dm+v.cc,n:'t',fx:'=B2+B3',fmt:'#,##0'}],
['Direct materials cost per bag',{f:v=>v.dm/v.q,fx:'=B2/B1',fmt:'#,##0'}],['Conversion cost per bag',{f:v=>v.cc/v.q,fx:'=B3/B1',fmt:'#,##0'}],
[{t:'<b>Average cost per bag</b>'},{f:v=>v.t/v.q,fx:'=B4/B1',fmt:'#,##0',tot:true}]
]})}</div>
<div class="card"><h2>Case II — no beginning but an ending WIP (February)</h2>
<p>6,000 bags are started, 5,000 completed and 1,000 remain in process, on average 60% complete as to conversion (materials are added at the start, so they are 100% complete). Dividing 29,200,000 by 6,000 physical units would give 4,867 per bag — <em>wrong</em>, because the unfinished bags have not absorbed all their conversion cost. Equivalent units fix this.</p>
${S({title:'February — equivalent units',cols:[300,100,110,110],rows:[
[{h:'Flow of production'},{h:'Physical units'},{h:'Direct materials'},{h:'Conversion'}],
['Completed and transferred out',{in:'done',v:5000},{f:v=>v.done,fx:'=B2',fmt:'#,##0'},{f:v=>v.done,fx:'=B2',fmt:'#,##0'}],
['Work in process, ending',{in:'wip',v:1000},{f:v=>v.wip*v.pm,fx:'=B3×100%',fmt:'#,##0'},{f:v=>v.wip*v.pc,fx:'=B3×60%',fmt:'#,##0'}],
['   % complete: materials / conversion',null,{in:'pm',v:1,fmt:'0%'},{in:'pc',v:0.6,fmt:'0%'}],
[{t:'<b>Equivalent units of work done</b>'},{f:v=>v.done+v.wip,fx:'=B2+B3',fmt:'#,##0',tot:true},{f:v=>v.done+v.wip*v.pm,n:'em',fx:'=C2+C3',fmt:'#,##0',tot:true},{f:v=>v.done+v.wip*v.pc,n:'ec',fx:'=D2+D3',fmt:'#,##0',tot:true}],
['Costs added during February',null,{in:'dm',v:18000000},{in:'cc',v:11200000}],
[{t:'<b>Cost per equivalent unit</b>'},null,{f:v=>v.dm/v.em,n:'um',fx:'=C6/C5',fmt:'#,##0',tot:true},{f:v=>v.cc/v.ec,n:'uc',fx:'=D6/D5',fmt:'#,##0',tot:true}],
['Average cost per completed bag',{f:v=>v.um+v.uc,fx:'=C7+D7',fmt:'#,##0'}],
['Cost of bags transferred out',{f:v=>v.done*(v.um+v.uc),fx:'=B2*(C7+D7)',fmt:'#,##0'}],
['Cost of ending WIP',{f:v=>v.wip*v.pm*v.um+v.wip*v.pc*v.uc,fx:'=C3*C7+D3*D7',fmt:'#,##0'}]
]})}</div>
<div class="card"><h2>Case III — both beginning and ending WIP (March, weighted average)</h2>
<p>March opens with 1,000 bags in process (materials 100%, conversion 60%) carrying 3,000,000 of materials and 1,200,000 of conversion; 5,500 bags are started, 6,000 completed, 500 remain (materials 100%, conversion 50%). The weighted-average method pools the opening cost with the cost added.</p>
${S({title:'March — equivalent units and unit costs',cols:[300,100,110,110],rows:[
[{h:'Flow of production'},{h:'Physical units'},{h:'Direct materials'},{h:'Conversion'}],
['Work in process, beginning',{in:'wb',v:1000},{in:'bm',v:3000000},{in:'bc',v:1200000}],
['Started during March',{in:'st',v:5500}],
['Completed and transferred out',{in:'done',v:6000},{f:v=>v.done,fx:'=B4',fmt:'#,##0'},{f:v=>v.done,fx:'=B4',fmt:'#,##0'}],
['Work in process, ending',{f:v=>v.wb+v.st-v.done,n:'we',fx:'=B2+B3-B4',fmt:'#,##0'},{f:v=>v.we*v.pm,fx:'=B5×100%',fmt:'#,##0'},{f:v=>v.we*v.pc,fx:'=B5×50%',fmt:'#,##0'}],
['   % complete: materials / conversion',null,{in:'pm',v:1,fmt:'0%'},{in:'pc',v:0.5,fmt:'0%'}],
[{t:'<b>Equivalent units (weighted average)</b>'},null,{f:v=>v.done+v.we*v.pm,n:'em',fx:'=C4+C5',fmt:'#,##0',tot:true},{f:v=>v.done+v.we*v.pc,n:'ec',fx:'=D4+D5',fmt:'#,##0',tot:true}],
['Costs added during March',null,{in:'dm',v:16500000},{in:'cc',v:11300000}],
['Total cost to account for',{f:v=>v.bm+v.bc+v.dm+v.cc,fx:'=C2+D2+C8+D8',fmt:'#,##0'},{f:v=>v.bm+v.dm,n:'tm',fx:'=C2+C8',fmt:'#,##0'},{f:v=>v.bc+v.cc,n:'tcv',fx:'=D2+D8',fmt:'#,##0'}],
[{t:'<b>Cost per equivalent unit</b>'},null,{f:v=>v.tm/v.em,n:'um',fx:'=C9/C7',fmt:'#,##0',tot:true},{f:v=>v.tcv/v.ec,n:'uc',fx:'=D9/D7',fmt:'#,##0',tot:true}],
['Average cost per completed bag',{f:v=>v.um+v.uc,fx:'=C10+D10',fmt:'#,##0'}]
]})}
<div class="note">The lecture also shows the “work done in the current period only” view (FIFO): deduct the beginning WIP equivalents (1,000 materials, 600 conversion) to get 5,500 and 5,650 equivalent units for March’s own work — the same 3,000 and 2,000 per bag because costs were stable.</div></div>`});

lecture({id:'tc11',course:'tc',n:'11',title:'Advanced Costing Systems — Activity Based Costing',sub:'Why a volume-based allocation hides the true cost of small lots, and how tracing set-up cost per lot changes the picture.',chips:['ABC','Set-up cost','Volume distortion'],body:()=>`
<div class="card"><h2>The same four products, two costing systems</h2>
<p>Four products — small or big, low or high volume — each processed as one lot in the month. Material and labour are Rs 100 per kg each; every lot needs a Rs 50,000 set-up; other fixed cost is Rs 240,000. Conventional process costing spreads <em>all</em> fixed cost on kilograms consumed; ABC traces the set-up to the lot that caused it and spreads only the remaining fixed cost on kilograms.</p>
${S({title:'Conventional (volume-based) costing vs ABC',cols:[220,90,90,90,90],rows:[
['Material cost per kg',{in:'mc',v:100}],['Direct labour per kg',{in:'lc',v:100}],['Set-up cost per lot',{in:'su',v:50000}],['Lots processed in the month',{in:'lots',v:4}],['Other fixed cost',{in:'of',v:240000}],
['Total fixed cost',{f:v=>v.su*v.lots+v.of,n:'tf',fx:'=B3*B4+B5',fmt:'#,##0'}],
[{h:''},{h:'A: small, low vol.'},{h:'B: small, high vol.'},{h:'C: big, low vol.'},{h:'D: big, high vol.'}],
['Material per unit (kg)',{in:'ma',v:1},{in:'mb',v:1},{in:'mcc',v:3},{in:'md',v:3}],
['Units per lot',{in:'ua',v:100},{in:'ub',v:1000},{in:'uc',v:100},{in:'ud',v:1000}],
['Total material consumed (kg)',{f:v=>v.ma*v.ua,n:'ka',fx:'=B8*B9',fmt:'#,##0'},{f:v=>v.mb*v.ub,n:'kb',fx:'=C8*C9',fmt:'#,##0'},{f:v=>v.mcc*v.uc,n:'kc',fx:'=D8*D9',fmt:'#,##0'},{f:v=>v.md*v.ud,n:'kd',fx:'=E8*E9',fmt:'#,##0'}],
['Total kg (all products)',{f:v=>v.ka+v.kb+v.kc+v.kd,n:'kt',fx:'=SUM(B10:E10)',fmt:'#,##0'}],
[{s:'Conventional process costing',span:5}],
['Material + labour per lot',{f:v=>v.ka*(v.mc+v.lc),n:'pa',fx:'=B10*(mat+lab)',fmt:'#,##0'},{f:v=>v.kb*(v.mc+v.lc),n:'pb',fx:'=C10*(mat+lab)',fmt:'#,##0'},{f:v=>v.kc*(v.mc+v.lc),n:'pc',fx:'=D10*(mat+lab)',fmt:'#,##0'},{f:v=>v.kd*(v.mc+v.lc),n:'pd',fx:'=E10*(mat+lab)',fmt:'#,##0'}],
['Allocated fixed cost per lot (on kg)',{f:v=>v.tf/v.kt*v.ka,n:'fa',fx:'=B6/B11*B10',fmt:'#,##0'},{f:v=>v.tf/v.kt*v.kb,n:'fb',fx:'=B6/B11*C10',fmt:'#,##0'},{f:v=>v.tf/v.kt*v.kc,n:'fc',fx:'=B6/B11*D10',fmt:'#,##0'},{f:v=>v.tf/v.kt*v.kd,n:'fd',fx:'=B6/B11*E10',fmt:'#,##0'}],
['Total cost per unit',{f:v=>(v.pa+v.fa)/v.ua,n:'ca',fx:'=(B13+B14)/B9',fmt:'#,##0.00'},{f:v=>(v.pb+v.fb)/v.ub,n:'cb',fx:'=(C13+C14)/C9',fmt:'#,##0.00'},{f:v=>(v.pc+v.fc)/v.uc,n:'cc',fx:'=(D13+D14)/D9',fmt:'#,##0.00'},{f:v=>(v.pd+v.fd)/v.ud,n:'cd',fx:'=(E13+E14)/E9',fmt:'#,##0.00'}],
['Selling price (cost + 10%)',{f:v=>v.ca*1.1,n:'sa',fx:'=B15*1.1',fmt:'#,##0.00'},{f:v=>v.cb*1.1,n:'sb',fx:'=C15*1.1',fmt:'#,##0.00'},{f:v=>v.cc*1.1,n:'sc',fx:'=D15*1.1',fmt:'#,##0.00'},{f:v=>v.cd*1.1,n:'sd',fx:'=E15*1.1',fmt:'#,##0.00'}],
[{s:'Activity based costing',span:5}],
['Set-up cost per lot',{f:v=>v.su,fx:'=B3',fmt:'#,##0'},{f:v=>v.su,fx:'=B3',fmt:'#,##0'},{f:v=>v.su,fx:'=B3',fmt:'#,##0'},{f:v=>v.su,fx:'=B3',fmt:'#,##0'}],
['Other fixed cost per lot (on kg)',{f:v=>v.of/v.kt*v.ka,n:'oa',fx:'=B5/B11*B10',fmt:'#,##0'},{f:v=>v.of/v.kt*v.kb,n:'ob',fx:'=B5/B11*C10',fmt:'#,##0'},{f:v=>v.of/v.kt*v.kc,n:'oc',fx:'=B5/B11*D10',fmt:'#,##0'},{f:v=>v.of/v.kt*v.kd,n:'od',fx:'=B5/B11*E10',fmt:'#,##0'}],
['Total cost per unit (ABC)',{f:v=>(v.pa+v.su+v.oa)/v.ua,n:'xa',fx:'=(B13+B18+B19)/B9',fmt:'#,##0.00'},{f:v=>(v.pb+v.su+v.ob)/v.ub,n:'xb',fx:'=(C13+C18+C19)/C9',fmt:'#,##0.00'},{f:v=>(v.pc+v.su+v.oc)/v.uc,n:'xc',fx:'=(D13+D18+D19)/D9',fmt:'#,##0.00'},{f:v=>(v.pd+v.su+v.od)/v.ud,n:'xd',fx:'=(E13+E18+E19)/E9',fmt:'#,##0.00'}],
[{t:'<b>Profit per unit at the conventional price</b>'},{f:v=>v.sa-v.xa,fx:'=B16-B20',fmt:'0.00',tot:true},{f:v=>v.sb-v.xb,fx:'=C16-C20',fmt:'0.00',tot:true},{f:v=>v.sc-v.xc,fx:'=D16-D20',fmt:'0.00',tot:true},{f:v=>v.sd-v.xd,fx:'=E16-E20',fmt:'0.00',tot:true}]
]})}
<div class="note">Conventional costing says every product earns 10%. ABC shows the two low-volume lots (A and C, 100 units each) are sold far below cost and the large lots subsidise them. Marketing that quotes “cost plus 10%” from the conventional sheet is quietly losing money on every small order.</div></div>`});

lecture({id:'tc12',course:'tc',n:'12',title:'ABC Uses in Textiles',sub:'Set-up cost versus running cost in dyeing and printing, screen costs, colour wastage, and the true cost of short runs.',chips:['Set-up vs running','Screens','Colour wastage','Short runs'],body:()=>`
<div class="card"><h2>Two kinds of machine cost</h2>
<p>A machine has a <b>running cost</b> (workers on it, electricity, gas, depreciation) and a <b>set-up cost</b> — the cost of each changeover: wages of workers who set up or stand idle, the minimum chemicals needed to start, and so on. Suppose a processing department has a set-up cost of Rs 5,500 and a running cost of Rs 1 per metre, and marketing charges Rs 3 per metre. Two orders arrive: A for 1,000 m and B for 10,000 m.</p>
${S({title:'Conventional costing vs ABC — orders A and B',cols:[260,110,110],rows:[
['Running cost per metre',{in:'rc',v:1}],['Set-up cost per order',{in:'su',v:5500}],['Charge to customer per metre',{in:'pr',v:3}],
[{h:''},{h:'Order A'},{h:'Order B'}],
['Length (m)',{in:'la',v:1000},{in:'lb',v:10000}],
[{s:'Conventional: total cost ÷ total metres',span:3}],
['Average cost per metre',{f:v=>(v.rc*(v.la+v.lb)+2*v.su)/(v.la+v.lb),n:'avg',fx:'=(run×total m + 2×set-up)/total m',fmt:'0.00'}],
['Cost of order',{f:v=>v.avg*v.la,n:'ca',fx:'=B7*B5',fmt:'#,##0'},{f:v=>v.avg*v.lb,n:'cb',fx:'=B7*C5',fmt:'#,##0'}],
['Revenue',{f:v=>v.pr*v.la,n:'ra',fx:'=B3*B5',fmt:'#,##0'},{f:v=>v.pr*v.lb,n:'rb',fx:'=B3*C5',fmt:'#,##0'}],
['Profit',{f:v=>v.ra-v.ca,fx:'=B9-B8',fmt:'#,##0',tot:true},{f:v=>v.rb-v.cb,fx:'=C9-C8',fmt:'#,##0',tot:true}],
[{s:'Activity based: set-up traced to each order',span:3}],
['Cost of order',{f:v=>v.rc*v.la+v.su,n:'xa',fx:'=B1*B5+B2',fmt:'#,##0'},{f:v=>v.rc*v.lb+v.su,n:'xb',fx:'=B1*C5+B2',fmt:'#,##0'}],
['Profit / (loss)',{f:v=>v.ra-v.xa,fx:'=B9-B12',fmt:'#,##0',tot:true},{f:v=>v.rb-v.xb,fx:'=C9-C12',fmt:'#,##0',tot:true}]
]})}</div>
<div class="card"><h2>Dyeing and printing study of a textile factory</h2>
<p>Observations from a rotary printing department:</p>
<ul><li>A changeover means removing and washing screens, blades and the drum, changing the back cloth, and changing blades if the width changes.</li>
<li>100–200 m of testing wastage per design at rotary #4 arises from setting problems. Designs with fewer colours can be checked at slow speed (less wastage); more colours need high speed so colours become sharp enough to check, and have more setting problems.</li>
<li>At least 10–12 kg of colour is wasted at every changeover; on average 4–5 screens out of 12 give an unsatisfactory shade and are washed and readjusted, wasting 5–6 kg per screen; residual colour is left in the drum because the quantity is hard to estimate.</li>
<li>Colour costs about Rs 30/kg (light), 45 (medium), 100 (dark); making one colour takes 10–15 minutes, so 3 hours for 12 colours.</li>
<li>Vat dyes are costly and need two processes; dyeing has its own essential wastage of colour and cloth.</li></ul>
<h3>Screen cost</h3>
<table class="plain"><tr><th>Width (mm)</th><th>Filling</th><th>Engraving</th><th>Screen cost</th></tr><tr><td>1280</td><td>Rs 1,400</td><td>Rs 1,300</td><td>Rs 1,500 – 10,750</td></tr><tr><td>1850</td><td>Rs 1,400</td><td>Rs 1,400</td><td>Rs 7,200 – 15,500</td></tr><tr><td>2400</td><td>Rs 1,400</td><td>Rs 1,600</td><td>Rs 5,664 – 22,450</td></tr><tr><td>2800</td><td>Rs 1,400</td><td>Rs 1,900</td><td>Rs 12,200 – 25,000</td></tr></table>
<p>So one screen carries about Rs 3,000 of labour on average. If the screen cost for a design is 12,000, a 12-colour design needs Rs 180,000 of screens alone — Rs 180/m on a 1,000 m run — before electricity, wages, depreciation, rent, steam and the wastage of fabric and colour are counted.</p>
${S({title:'Colour wastage for a 12-colour design',cols:[300,110],rows:[
['Average colour cost (Rs/kg)',{in:'c',v:50}],['Number of colours',{in:'n',v:12}],
['Essential wastage at changeover (kg per colour)',{in:'e',v:11}],['Screens readjusted',{in:'s',v:5}],['Shade-out wastage per readjusted screen (kg)',{in:'sw',v:5}],['Residual in drum (kg per colour)',{in:'r',v:3}],
[{t:'<b>Colour wasted (Rs)</b>'},{f:v=>v.c*(v.n*v.e+v.s*v.sw+v.r*v.n),fx:'=B1×(B2×B3 + B4×B5 + B6×B2)',fmt:'#,##0',tot:true}]
]})}
<h3>Screen cost per metre by run length and number of colours</h3>
<p>The costing department gave an average screen cost of 6,249 for June. Dividing by the run length shows why 400 m jobs cannot be priced like 20,000 m jobs.</p>
${S({title:'Screen cost per metre (Rs)',cols:[90,90,90,90,90,90],rows:[
['Screen cost',{in:'sc',v:6249}],
[{h:'Colours \\ Metres'},{h:'400'},{h:'1,000'},{h:'2,000'},{h:'10,000'},{h:'20,000'}],
...[4,8,12].map(n=>[{t:String(n)},...[400,1000,2000,10000,20000].map(m=>({f:v=>v.sc*n/m,fx:'=screen×'+n+'/'+m,fmt:'0.00'}))])
]})}
<div class="note">The accounting department depreciates a screen over a life of 65,000 m. With real runs of 1,000–2,000 m, most screens never reach that life — the books fill with useless screen “inventory” while the orders that caused the cost look profitable.</div></div>`});

lecture({id:'tc13',course:'tc',n:'13',title:'Budgets & Variances',sub:'The budgeting cycle, static and flexible budgets, and Level 0 to Level 2 variance analysis for Webb Company.',chips:['Master budget','Static vs flexible','Level 2 analysis'],body:()=>`
<div class="card"><h2>Why budget</h2>
<p>Budgets are among the most widely used tools for planning and controlling organisations. A budget is a quantitative expression, for a set time period, of a proposed future plan of action. It turns managers’ perspectives forward — to exploit opportunities and to anticipate problems. The budgeting cycle: (1) plan the performance of the organisation and its sub-units; (2) provide a frame of reference against which actual results are compared; (3) investigate variations from plan and take corrective action; (4) plan again with the feedback. The <b>master budget</b> coordinates all the individual budgets — operating decisions on acquiring and using resources, financing decisions on how to pay for them.</p>
<p>A <b>variance</b> is the difference between an actual result and a budgeted amount. A <b>standard</b> is a carefully predetermined amount, usually per unit. A <b>static budget</b> is based on one level of output and is not altered afterwards; a <b>flexible budget</b> is adjusted to the actual output, which lets managers compute a richer set of variances. A variance is <b>favourable (F)</b> if it increases operating income relative to budget and <b>unfavourable (U)</b> if it decreases it.</p></div>
<div class="card"><h2>Webb Company — April 2007</h2>
<p>Webb makes a jacket sold to clothing stores. Budgeted selling price 180; budgeted variable cost 99 per jacket (materials 60, direct manufacturing labour 16, variable manufacturing overhead 12, direct marketing labour 6, variable marketing overhead 5); budgeted fixed costs 710,000 (276,000 manufacturing, 434,000 marketing). The static budget assumed 12,000 jackets; 10,000 were actually made and sold.</p>
${S({title:'Level 0, 1 and 2 variance analysis',cols:[180,100,110,100,110,100],note:'Variances: positive = F (favourable), negative = U (unfavourable)',rows:[
[{h:''},{h:'Actual results'},{h:'Flexible-budget variance'},{h:'Flexible budget'},{h:'Sales-volume variance'},{h:'Static budget'}],
['Units sold',{in:'au',v:10000},{f:v=>0,fx:'=B2-D2',fmt:'#,##0'},{f:v=>v.au,n:'fu',fx:'=B2 (actual volume)',fmt:'#,##0'},{f:v=>v.au-v.su,fx:'=D2-F2',fmt:'#,##0'},{in:'su',v:12000}],
[{t:''},{h:'Budgeted price'},{h:'Budgeted unit variable cost'},{h:'Budgeted fixed cost'}],
['Budget inputs',{in:'bp',v:180},{in:'bv',v:99},{in:'bf',v:710000}],
['Revenues',{in:'ar',v:1850000},{f:v=>v.ar-v.fu*v.bp,fx:'=B5-D5',fmt:'#,##0'},{f:v=>v.fu*v.bp,n:'fr',fx:'=D2*B4',fmt:'#,##0'},{f:v=>v.fu*v.bp-v.su*v.bp,fx:'=D5-F5',fmt:'#,##0'},{f:v=>v.su*v.bp,n:'sr',fx:'=F2*B4',fmt:'#,##0'}],
['Variable costs',{in:'av',v:1120000},{f:v=>v.fu*v.bv-v.av,fx:'=D6-B6 (cost: budget − actual)',fmt:'#,##0'},{f:v=>v.fu*v.bv,n:'fv',fx:'=D2*C4',fmt:'#,##0'},{f:v=>v.su*v.bv-v.fu*v.bv,fx:'=F6-D6 (cost: budget − flexible)',fmt:'#,##0'},{f:v=>v.su*v.bv,n:'sv',fx:'=F2*C4',fmt:'#,##0'}],
['Contribution margin',{f:v=>v.ar-v.av,n:'acm',fx:'=B5-B6',fmt:'#,##0'},{f:v=>v.acm-(v.fr-v.fv),fx:'=B7-D7',fmt:'#,##0'},{f:v=>v.fr-v.fv,n:'fcm',fx:'=D5-D6',fmt:'#,##0'},{f:v=>v.fcm-(v.sr-v.sv),fx:'=D7-F7',fmt:'#,##0'},{f:v=>v.sr-v.sv,n:'scm',fx:'=F5-F6',fmt:'#,##0'}],
['Fixed costs',{in:'af',v:705000},{f:v=>v.bf-v.af,fx:'=D8-B8 (cost: budget − actual)',fmt:'#,##0'},{f:v=>v.bf,fx:'=D4',fmt:'#,##0'},{f:v=>0,fx:'=F8-D8',fmt:'#,##0'},{f:v=>v.bf,fx:'=D4',fmt:'#,##0'}],
[{t:'<b>Operating income</b>'},{f:v=>v.acm-v.af,n:'aoi',fx:'=B7-B8',fmt:'#,##0',tot:true},{f:v=>v.aoi-(v.fcm-v.bf),fx:'=B9-D9 (flexible-budget variance)',fmt:'#,##0',tot:true},{f:v=>v.fcm-v.bf,n:'foi',fx:'=D7-D8',fmt:'#,##0',tot:true},{f:v=>v.foi-(v.scm-v.bf),fx:'=D9-F9 (sales-volume variance)',fmt:'#,##0',tot:true},{f:v=>v.scm-v.bf,n:'soi',fx:'=F7-F8',fmt:'#,##0',tot:true}],
['Static-budget variance (Level 0)',{f:v=>v.aoi-v.soi,fx:'=B9-F9',fmt:'#,##0'}]
]})}
${S({title:'Level 1 analysis — static-budget variance line by line',cols:[180,100,120,100],note:'Variances: positive = F (favourable), negative = U (unfavourable)',rows:[
[{h:''},{h:'Actual results'},{h:'Static-budget variance'},{h:'Static budget'}],
['Units sold',{in:'au',v:10000},{f:v=>v.au-v.su,fx:'=B2-D2',fmt:'#,##0'},{in:'su',v:12000}],
['Revenues',{in:'ar',v:1850000},{f:v=>v.ar-v.sr,fx:'=B3-D3',fmt:'#,##0'},{in:'sr',v:2160000}],
['Variable costs',{in:'av',v:1120000},{f:v=>v.sv-v.av,fx:'=D4-B4 (cost: budget − actual)',fmt:'#,##0'},{in:'sv',v:1188000}],
['Fixed costs',{in:'af',v:705000},{f:v=>v.sf-v.af,fx:'=D5-B5 (cost: budget − actual)',fmt:'#,##0'},{in:'sf',v:710000}],
[{t:'<b>Operating income</b>'},{f:v=>v.ar-v.av-v.af,n:'aoi',fx:'=B3-B4-B5',fmt:'#,##0',tot:true},{f:v=>v.aoi-(v.sr-v.sv-v.sf),fx:'=B6-D6',fmt:'#,##0',tot:true},{f:v=>v.sr-v.sv-v.sf,n:'soi',fx:'=D3-D4-D5',fmt:'#,##0',tot:true}]
]})}
<p>Reading the sheet: the static-budget variance of operating income is 237,000 U (Level 0). Level 1 splits it line by line against the static budget. Level 2 inserts the flexible budget at 10,000 units: the <b>sales-volume variance</b> (162,000 U) comes purely from selling 2,000 fewer jackets, while the <b>flexible-budget variance</b> (75,000 U) is what the operating managers can really be held to — revenue 50,000 F (price higher than budget), variable cost 130,000 U, fixed cost 5,000 F.</p>
<h3>The five steps of a flexible budget</h3>
<ol class="steps"><li>Determine the budgeted selling price, unit variable cost and fixed costs.</li><li>Determine the actual quantity of the revenue driver (10,000 jackets sold).</li><li>Flexible-budget revenue = budgeted price × actual quantity = 180 × 10,000 = 1,800,000.</li><li>Determine the actual quantity of the cost drivers (units produced and sold).</li><li>Flexible-budget costs = budgeted unit variable cost × actual quantity + budgeted fixed cost = 990,000 + 710,000.</li></ol></div>`});

lecture({id:'tc14',course:'tc',n:'14',title:'Budgeting in Textiles — Price & Efficiency Variances',sub:'Splitting Webb’s flexible-budget variances for materials and labour into a price part and an efficiency part.',chips:['Price variance','Efficiency variance','Standards'],body:()=>`
<div class="card"><h2>Standards and actuals</h2>
<p>Each jacket should use 2 yd of cloth at Rs 30, 0.8 h of manufacturing labour at Rs 20 and 0.25 h of marketing labour at Rs 24. April’s actuals: 22,200 yd of cloth costing 688,200; 9,000 manufacturing hours costing 198,000; 2,304 marketing hours costing 57,600, for 10,000 jackets.</p>
<div class="formula">Price variance = (actual price − budgeted price) × actual input<br>Efficiency variance = (actual input − budgeted input allowed for actual output) × budgeted price<br>Price + efficiency = flexible-budget variance</div>
${S({title:'Price and efficiency variances',cols:[220,110,110,110,110],rows:[
[{h:'Standards'},{h:'Input per unit'},{h:'Cost per input'},{h:'Std cost / unit'}],
['Direct materials (yd)',{in:'sm',v:2},{in:'pm',v:30},{f:v=>v.sm*v.pm,fx:'=B2*C2',fmt:'0.00'}],
['Direct manufacturing labour (h)',{in:'sl',v:0.8},{in:'pl',v:20},{f:v=>v.sl*v.pl,fx:'=B3*C3',fmt:'0.00'}],
['Direct marketing labour (h)',{in:'sk',v:0.25},{in:'pk',v:24},{f:v=>v.sk*v.pk,fx:'=B4*C4',fmt:'0.00'}],
['Actual units produced and sold',{in:'u',v:10000}],
[{h:'Actual results'},{h:'Total cost'},{h:'Input used'},{h:'Actual price'}],
['Direct materials',{in:'am',v:688200},{in:'qm',v:22200},{f:v=>v.am/v.qm,n:'apm',fx:'=B7/C7',fmt:'0.00'}],
['Direct manufacturing labour',{in:'al',v:198000},{in:'ql',v:9000},{f:v=>v.al/v.ql,n:'apl',fx:'=B8/C8',fmt:'0.00'}],
['Direct marketing labour',{in:'ak',v:57600},{in:'qk',v:2304},{f:v=>v.ak/v.qk,n:'apk',fx:'=B9/C9',fmt:'0.00'}],
[{h:'Variances (U = positive)'},{h:'Flexible budget'},{h:'Flexible-budget var.'},{h:'Price variance'},{h:'Efficiency variance'}],
['Direct materials',{f:v=>v.u*v.sm*v.pm,n:'fbm',fx:'=B5*B2*C2',fmt:'#,##0'},{f:v=>v.am-v.fbm,fx:'=B7-B11',fmt:'#,##0'},{f:v=>(v.apm-v.pm)*v.qm,fx:'=(D7-C2)*C7',fmt:'#,##0'},{f:v=>(v.qm-v.u*v.sm)*v.pm,fx:'=(C7-B5*B2)*C2',fmt:'#,##0'}],
['Direct manufacturing labour',{f:v=>v.u*v.sl*v.pl,n:'fbl',fx:'=B5*B3*C3',fmt:'#,##0'},{f:v=>v.al-v.fbl,fx:'=B8-B12',fmt:'#,##0'},{f:v=>(v.apl-v.pl)*v.ql,fx:'=(D8-C3)*C8',fmt:'#,##0'},{f:v=>(v.ql-v.u*v.sl)*v.pl,fx:'=(C8-B5*B3)*C3',fmt:'#,##0'}],
['Direct marketing labour',{f:v=>v.u*v.sk*v.pk,n:'fbk',fx:'=B5*B4*C4',fmt:'#,##0'},{f:v=>v.ak-v.fbk,fx:'=B9-B13',fmt:'#,##0'},{f:v=>(v.apk-v.pk)*v.qk,fx:'=(D9-C4)*C9',fmt:'#,##0'},{f:v=>(v.qk-v.u*v.sk)*v.pk,fx:'=(C9-B5*B4)*C4',fmt:'#,##0'}]
]})}
<div class="note">Materials: 88,200 U = 22,200 U price (paid Rs 31 instead of 30) + 66,000 U efficiency (used 2,200 yd more than the 20,000 allowed). Marketing labour shows the opposite pattern — paid more per hour but used fewer hours, so the net variance is 2,400 F. In a spinning mill the same split separates “cotton got dearer” from “we wasted more cotton”.</div></div>`});

lecture({id:'tc15',course:'tc',n:'15',title:'Review of Spinning Calculations',sub:'Count, ounces per spindle, bags per frame, cotton cost per lb and the adjusted cost of carded and combed yarn — the mid-term review.',chips:['OPS','Bags per frame','Yield','Combed vs carded'],body:()=>`
<div class="card"><h2>Production of a ring frame</h2>
<p>Spinning production is quoted as <b>OPS</b> — ounces per spindle per shift — which falls steeply as the count gets finer. A frame of 480 spindles at 1 OPS makes 480 oz a shift, 1,440 oz a day (three shifts), which is 0.9 bags of 100 lb. Multiply by the OPS of the count being spun to get bags per frame per day.</p>
${S({title:'Bags per frame per day',cols:[220,100,40,100,100],rows:[
[{h:''},{h:''},null,{h:'Count'},{h:'OPS'}],
['Spindles per frame',{in:'sp',v:480},null,{t:'6'},{t:'28.5'}],
['Shifts per day',{in:'sh',v:3},null,{t:'7'},{t:'28'}],
['Ounces per shift at 1 OPS',{f:v=>v.sp,fx:'=B2',fmt:'#,##0'},null,{t:'8'},{t:'27'}],
['Ounces per day at 1 OPS',{f:v=>v.sp*v.sh,n:'od',fx:'=B4*B3',fmt:'#,##0'},null,{t:'10'},{t:'22'}],
['Bags per frame at 1 OPS (÷16 oz ÷100 lb)',{f:v=>v.od/16/100,n:'b1',fx:'=B5/16/100',fmt:'0.00'},null,{t:'12'},{t:'17'}],
['OPS for the count spun',{in:'ops',v:28},null,{t:'14'},{t:'14.5'}],
[{t:'<b>Bags per frame per day</b>'},{f:v=>v.ops*v.b1,fx:'=B7*B6',fmt:'0.00',tot:true},null,{t:'16'},{t:'13.3'}],
[null,null,null,{t:'18'},{t:'11'}],[null,null,null,{t:'20'},{t:'10.3'}],[null,null,null,{t:'20 CM'},{t:'10.5'}],[null,null,null,{t:'24'},{t:'8'}],[null,null,null,{t:'26'},{t:'7.5'}],[null,null,null,{t:'30'},{t:'5.5'}],[null,null,null,{t:'40 CM'},{t:'4.15'}],[null,null,null,{t:'50 CM'},{t:'3.5'}],[null,null,null,{t:'60 CM'},{t:'2.6'}],[null,null,null,{t:'80 CM'},{t:'1.7'}],[null,null,null,{t:'100 CM'},{t:'1.1'}],[null,null,null,{t:'120 CM'},{t:'0.9'}]
],note:'OPS table on the right (CM = combed).'})}</div>
<div class="card"><h2>Cotton cost per lb of yarn</h2>
<p>Cotton is bought per maund (37.34 kg). Only part of it becomes yarn — the <b>yield</b> — and the waste is sold for a fraction of the cotton price. Combed yarn gives up a further 8% as noil, which sells well.</p>
${S({title:'Adjusted cotton cost per lb of yarn',cols:[280,110],rows:[
['Cotton price per maund (Rs)',{in:'pm',v:2800}],['kg per maund',{in:'kg',v:37.34}],
['Cotton cost per lb',{f:v=>v.pm/v.kg/2.204,n:'cl',fx:'=B1/B2/2.204',fmt:'0.000'}],
[{s:'Carded yarn',span:2}],
['Yield',{in:'y1',v:0.82,fmt:'0%'}],['Cotton cost per lb of yarn (before waste credit)',{f:v=>v.cl/v.y1,n:'a1',fx:'=B3/B5',fmt:'0.000'}],
['Proceeds on waste (fraction of cotton price)',{in:'w1',v:0.15,fmt:'0%'}],['Rupee value of waste per lb of yarn',{f:v=>v.cl*(1-v.y1)*v.w1,n:'r1',fx:'=B3*(1-B5)*B7',fmt:'0.000'}],
[{t:'<b>Adjusted cotton cost — carded</b>'},{f:v=>v.a1-v.r1,fx:'=B6-B8',fmt:'0.000',tot:true}],
[{s:'Combed yarn',span:2}],
['Yield',{in:'y2',v:0.74,fmt:'0%'}],['Cotton cost per lb of yarn',{f:v=>v.cl/v.y2,n:'a2',fx:'=B3/B11',fmt:'0.000'}],
['Waste %',{in:'wp',v:0.18,fmt:'0%'}],['Proceeds on waste',{in:'w2',v:0.15,fmt:'0%'}],['Rupee value of waste',{f:v=>v.wp*v.cl*v.w2,n:'r2',fx:'=B13*B3*B14',fmt:'0.000'}],
['Noil % (1 − yield − waste)',{f:v=>1-v.y2-v.wp,n:'np',fx:'=1-B11-B13',fmt:'0.0%'}],['Proceeds on noil',{in:'pn',v:0.7,fmt:'0%'}],['Rupee value of noil',{f:v=>v.cl*v.np*v.pn,n:'r3',fx:'=B3*B16*B17',fmt:'0.000'}],
[{t:'<b>Adjusted cotton cost — combed</b>'},{f:v=>v.a2-v.r2-v.r3,fx:'=B12-B15-B18',fmt:'0.000',tot:true}]
]})}
<div class="warn">A subtle point in the original worksheet: the carded formula credits waste on (1 − yield) while the combed formula separates waste and noil, because noil is worth far more than ordinary waste. Always ask what each by-product sells for.</div></div>`});

lecture({id:'tc16',course:'tc',n:'16',title:'Simple Yarn Costing',sub:'Raw material, variable production and export costs, contribution per bag and per frame for an export yarn order.',chips:['Export costs','Contribution per bag','Profit per frame'],body:()=>`
<div class="card"><h2>From a dollar price to a profit per frame</h2>
<p>A spinning mill sells Ne 20 at US$ 2 per kg. One container carries 400 bags. Every cost that is incurred <em>because</em> the bag is sold is variable; the frame cost (depreciation, finance, labour) is fixed per frame and compared with the contribution a frame earns in a day.</p>
${S({title:'Yarn export costing — per container and per bag',cols:[280,100,110,110],rows:[
[{h:''},{h:'Basis'},{h:'Per container'},{h:'Per bag'}],
['Bags per container',{in:'bags',v:400}],['Price (US$/kg)',{in:'px',v:2}],['Rs per US$',{in:'fx',v:60}],
['Price: Rs/kg (Basis) and per bag of 100 lb',{f:v=>v.px*v.fx,fx:'=B3*B4 (Rs/kg)',fmt:'0.00'},null,{f:v=>v.px*v.fx/2.204*100,n:'pb',fx:'=B5/2.204*100',fmt:'#,##0.00'}],
['Local freight',null,{in:'lf',v:15000},{f:v=>v.lf/v.bags,n:'c1',fx:'=C6/B2',fmt:'0.00'}],
['Export development surcharge',{in:'eds',v:0.0025,fmt:'0.00%'},null,{f:v=>v.eds*v.pb,n:'c2',fx:'=B7*D5',fmt:'0.00'}],
['Foreign bank charges (US$)',{in:'fb',v:250},{f:v=>v.fb*v.fx,n:'fbr',fx:'=B8*B4',fmt:'#,##0'},{f:v=>v.fbr/v.bags,n:'c3',fx:'=C8/B2',fmt:'0.00'}],
['Local bank charges',null,{in:'lb',v:1800},{f:v=>v.lb/v.bags,n:'c4',fx:'=C9/B2',fmt:'0.00'}],
['Postage',null,{in:'po',v:1000},{f:v=>v.po/v.bags,n:'c5',fx:'=C10/B2',fmt:'0.00'}],
['Ocean freight (US$)',{in:'of',v:500},{f:v=>v.of*v.fx,n:'ofr',fx:'=B11*B4',fmt:'#,##0'},{f:v=>v.ofr/v.bags,n:'c6',fx:'=C11/B2',fmt:'0.00'}],
['Packing per bag',null,null,{in:'pk',v:100}],
['Raw material per bag (adjusted cotton cost × 100 lb)',{in:'cc',v:40.5728,fmt:'0.000'},null,{f:v=>v.cc*100,n:'rm',fx:'=B13*100',fmt:'#,##0.00'}],
['Total variable cost per bag',null,null,{f:v=>v.c1+v.c2+v.c3+v.c4+v.c5+v.c6+v.pk+v.rm,n:'tv',fx:'=SUM(D6:D13)',fmt:'#,##0.00'}],
[{t:'<b>Contribution margin per bag</b>'},null,null,{f:v=>v.pb-v.tv,n:'cm',fx:'=D5-D14',fmt:'#,##0.00',tot:true}],
[{s:'Per frame',span:4}],
['Bags per frame per day (Ne 20 → OPS 10.3 × 0.9)',{in:'bf',v:9.27}],
['Contribution per frame per day',{f:v=>v.cm*v.bf,n:'cf',fx:'=D15*B17',fmt:'#,##0'}],
['Fixed cost per frame per day',{in:'ff',v:14000}],
[{t:'<b>Profit / (loss) per frame per day</b>'},{f:v=>v.cf-v.ff,n:'pf',fx:'=B18-B19',fmt:'#,##0',tot:true}],
['Total frames',{in:'nf',v:46}],['Profit / (loss) per day for the mill',{f:v=>v.pf*v.nf,fx:'=B20*B21',fmt:'#,##0'}],
['Break-even price per bag (Rs)',{f:v=>(v.tv-v.c2+v.ff/v.bf)/(1-v.eds),fx:'=(D14-D7+B19/B17)/(1-B7)',fmt:'#,##0'}],
['Break-even price (US$/kg)',{f:v=>(v.tv-v.c2+v.ff/v.bf)/(1-v.eds)/100*2.204/v.fx,fx:'=B23/100*2.204/B4',fmt:'0.000'}]
]})}
<div class="note">At US$ 2 the Ne 20 frame loses about Rs 3,650 a day: the contribution of Rs 1,117 per bag × 9.27 bags does not cover the Rs 14,000 frame cost. Raise the price, the exchange rate or the OPS and watch the break-even line — this is the daily conversation in every spinning mill’s marketing office.</div></div>`});

lecture({id:'tc17',course:'tc',n:'17',title:'Optimal Yarn Mix',sub:'Allocating 46 frames among six counts to maximise contribution, within the limit of 780 bags of daily shipment.',chips:['Product mix','Constraints','Contribution per frame'],body:()=>`
<div class="card"><h2>The decision</h2>
<p>A mill has 46 frames and can ship at most 780 bags a day. Coarser counts earn less per bag but produce many more bags per frame; finer counts the reverse. The frame — the scarce resource — must be given to the count that earns the most <em>per frame</em>, subject to the shipping limit. Change the frames allotted to each count (row 2) and watch the totals; compare the frame and bag totals in the last column with their limits (46 frames, 780 bags) to see if the plan is feasible.</p>
${S({title:'Yarn mix — contribution per frame per day',cols:[200,80,80,80,80,80,80,100],rows:[
[{h:'Count (Ne)'},{h:'6'},{h:'8'},{h:'10'},{h:'12'},{h:'16'},{h:'20'},{h:'Total / limit'}],
['Frames allotted',{in:'f0',v:6},{in:'f1',v:6},{in:'f2',v:6},{in:'f3',v:6},{in:'f4',v:6},{in:'f5',v:6},{f:v=>v.f0+v.f1+v.f2+v.f3+v.f4+v.f5,n:'ft',fx:'=SUM(B2:G2)  ≤ 46',fmt:'0'}],
['Price (US$/kg)',{in:'p0',v:2},{in:'p1',v:2.05},{in:'p2',v:2.1},{in:'p3',v:2.15},{in:'p4',v:2.2},{in:'p5',v:2.3},{t:'Rs/$'}],
['Price per bag (Rs)',...[0,1,2,3,4,5].map(i=>({f:v=>v['p'+i]*v.fx/2.204*100,n:'pb'+i,fx:'=price×fx/2.204×100',fmt:'#,##0'})),{in:'fx',v:60}],
['OPS',{in:'o0',v:28.5},{in:'o1',v:26},{in:'o2',v:22},{in:'o3',v:17},{in:'o4',v:13.3},{in:'o5',v:10.3},{t:'bags/frame @1 OPS'}],
['Bags per frame per day',...[0,1,2,3,4,5].map(i=>({f:v=>v['o'+i]*v.b1,n:'bf'+i,fx:'=OPS×0.9',fmt:'0.00'})),{in:'b1',v:0.9}],
['Total bags per day',...[0,1,2,3,4,5].map(i=>({f:v=>v['bf'+i]*v['f'+i],n:'tb'+i,fx:'=bags/frame×frames',fmt:'0.0'})),{f:v=>v.tb0+v.tb1+v.tb2+v.tb3+v.tb4+v.tb5,fx:'=SUM(B7:G7)  ≤ 780',fmt:'0.0'}],
['Variable cost per bag excl. EDS (Rs)',...[0,1,2,3,4,5].map(i=>({f:v=>v.vc,fx:'=H8',fmt:'#,##0'})),{in:'vc',v:4551.78}],
['Export development surcharge 0.25%',...[0,1,2,3,4,5].map(i=>({f:v=>0.0025*v['pb'+i],fx:'=0.25%×price/bag',fmt:'0.00'}))],
['Contribution per bag',...[0,1,2,3,4,5].map(i=>({f:v=>v['pb'+i]-v.vc-0.0025*v['pb'+i],n:'cb'+i,fx:'=B4-B8-B9',fmt:'#,##0'}))],
['Contribution per frame per day',...[0,1,2,3,4,5].map(i=>({f:v=>v['cb'+i]*v['bf'+i],n:'cf'+i,fx:'=B10×B6',fmt:'#,##0'}))],
['Total contribution per day',...[0,1,2,3,4,5].map(i=>({f:v=>v['cf'+i]*v['f'+i],n:'tc'+i,fx:'=B11×B2',fmt:'#,##0'})),{f:v=>v.tc0+v.tc1+v.tc2+v.tc3+v.tc4+v.tc5,n:'tct',fx:'=SUM(B12:G12)',fmt:'#,##0',tot:true}],
['Fixed cost per day (46 frames × 14,000)',null,null,null,null,null,{in:'ffr',v:14000},{f:v=>v.ffr*46,n:'fc',fx:'=G13×46',fmt:'#,##0'}],
[{t:'<b>Profit per day</b>'},null,null,null,null,null,null,{f:v=>v.tct-v.fc,n:'pd',fx:'=H12-H13',fmt:'#,##0',tot:true}],
['Profit per month',null,null,null,null,null,null,{f:v=>v.pd*30,fx:'=H14×30',fmt:'#,##0'}]
]})}
<div class="note">With six frames on every count only 36 of the 46 frames run and the mill earns about Rs 85,000 a day. Ne 8 gives the highest contribution per frame (≈23,750), but running all 46 frames on coarse counts would ship far more than 780 bags, so the shipping limit binds: the best plan puts about 33.6 frames on Ne 10 and 12.4 on Ne 20, using all 46 frames and exactly 780 bags, for a contribution of about Rs 960,000 and a profit of about Rs 316,000 a day. Try it: the sheet is a hand-driven linear programme.</div></div>`});

lecture({id:'tc18',course:'tc',n:'18',title:'Review of Weaving Calculations I',sub:'Denier, fabric weight and the yarn cost per yard and per metre of grey fabric, including contraction, wastage and B-grade.',chips:['Warp & weft weight','Wastage','Yarn cost per metre'],body:()=>`
<div class="card"><h2>How much yarn is in a metre of fabric?</h2>
<p>For a construction written warp × weft / ends × picks, width: the warp weight per yard is the number of ends × (1 + crimp + wastage) ÷ (840 × Ne); the weft weight per yard is picks per inch × 36 × width (yd) × (1 + crimp + wastage) ÷ (840 × Ne). Both are grossed up for the B-grade fabric that must still be paid for (÷ (1 − B-grade)). Multiply by the yarn price and you have the biggest single cost of the fabric.</p>
${S({title:'Yarn weight and cost per linear yard / metre — 20×20/60×60, 63″',cols:[300,110,60,110,110],rows:[
['Warp count (Ne)',{in:'wp',v:20},null,{t:'Warp price (Rs/10 lb)'},{in:'pw',v:500}],
['Weft count (Ne)',{in:'wf',v:20},null,{t:'Weft price (Rs/10 lb)'},{in:'pf',v:500}],
['Ends per inch',{in:'epi',v:60}],['Picks per inch',{in:'ppi',v:60}],
['Width (in)',{in:'w',v:63},{u:'in'}],['Width (yd)',{f:v=>v.w/36,n:'wy',fx:'=B5/36',fmt:'0.00'},{u:'yd'}],
['Warp contraction',{in:'cw',v:0.1,fmt:'0.0%'}],['Weft contraction',{in:'cf',v:0.05,fmt:'0.0%'}],['Warp wastage',{in:'ww',v:0.03,fmt:'0.0%'}],['Weft wastage',{in:'wfw',v:0.056,fmt:'0.0%'}],['B-grade',{in:'bg',v:0.01,fmt:'0.0%'}],
[{s:'Warp',span:5}],
['Total ends',{f:v=>v.epi*v.w,n:'te',fx:'=B3*B5',fmt:'#,##0'}],
['Length of 1 lb of warp (yd)',{f:v=>v.wp*840,n:'lw',fx:'=B1*840',fmt:'#,##0'}],
['Weight of 1 yard of all ends (lb)',{f:v=>v.te/v.lw,n:'wa',fx:'=B13/B14',fmt:'0.0000'}],
['Warp weight per yard of fabric (lb)',{f:v=>v.wa*(1+v.cw+v.ww)/(1-v.bg),n:'wyd',fx:'=B15*(1+B7+B9)/(1-B11)',fmt:'0.0000'}],
[{s:'Weft',span:5}],
['Length of 1 lb of weft (yd)',{f:v=>v.wf*840,n:'lf',fx:'=B2*840',fmt:'#,##0'}],
['Weight of one pick, adjusted (lb)',{f:v=>v.wy/v.lf*(1+v.cf+v.wfw)/(1-v.bg),n:'wpk',fx:'=B6/B18*(1+B8+B10)/(1-B11)',fmt:'0.00000'}],
['Weft weight per yard of fabric (lb)',{f:v=>v.wpk*v.ppi*36,n:'fyd',fx:'=B19*B4*36',fmt:'0.0000'}],
[{s:'Cost',span:5},],
[{h:''},{h:'Per yard'},null,{h:'Per metre'}],
['Warp cost',{f:v=>v.pw*v.wyd/10,n:'cwy',fx:'=E1*B16/10',fmt:'0.00'},null,{f:v=>v.cwy*1.0936,n:'cwm',fx:'=B23*1.0936',fmt:'0.00'}],
['Weft cost',{f:v=>v.pf*v.fyd/10,n:'cfy',fx:'=E2*B20/10',fmt:'0.00'},null,{f:v=>v.cfy*1.0936,n:'cfm',fx:'=B24*1.0936',fmt:'0.00'}],
[{t:'<b>Yarn cost of fabric</b>'},{f:v=>v.cwy+v.cfy,fx:'=B23+B24',fmt:'0.00',tot:true},null,{f:v=>v.cwm+v.cfm,fx:'=D23+D24',fmt:'0.00',tot:true}]
]})}
<p>Denier, used for filament yarns, converts as denier = 5,315 / Ne (so Ne 30 ≈ 177 denier) — see Weaving Calculations Lecture 1 for all the count systems.</p></div>`});

lecture({id:'tc19',course:'tc',n:'19',title:'Review of Weaving Calculations II',sub:'Loom production per day, B-grade adjustment, sizing and packing cost — the variable production cost of one metre of grey fabric.',chips:['Loom production','B-grade','Sizing cost','Variable cost per metre'],body:()=>`
<div class="card"><h2>Production of a loom</h2>
<p>An air-jet loom at 800 rpm inserting 60 picks per inch at 90% efficiency makes 12 inches a minute: 800 × 0.9 ÷ 60. Per day that is 480 yd; 1% of it is B-grade, so 475 yd of A-grade — 435 m. Sizing is paid per kg of sized warp; packing per metre; B-grade fetches a lower price that comes back as a small credit.</p>
${S({title:'Loom production and variable cost per metre',cols:[300,110,60],rows:[
['RPM',{in:'rpm',v:800}],['Efficiency',{in:'eff',v:0.9,fmt:'0%'}],['Picks per inch',{in:'ppi',v:60}],
['Production per minute (in)',{f:v=>v.rpm*v.eff/v.ppi,n:'pm',fx:'=B1*B2/B3',fmt:'0.00'},{u:'in'}],
['Production per day (yd)',{f:v=>v.pm/36*60*24,n:'pd',fx:'=B4/36*60*24',fmt:'0.0'},{u:'yd'}],
['B-grade',{in:'bg',v:0.01,fmt:'0.0%'}],
['A-grade production per day (yd)',{f:v=>v.pd*(1-v.bg),n:'pa',fx:'=B5*(1-B6)',fmt:'0.0'},{u:'yd'}],
['A-grade production per day (m)',{f:v=>v.pa/1.0936,n:'pam',fx:'=B7/1.0936',fmt:'0.0'},{u:'m'}],
[{s:'Variable production cost per metre',span:3}],
['Yarn cost per metre (from Lecture 18)',{in:'yc',v:27.79}],
['Warp weight per yard before wastage (lb)',{in:'wa',v:0.225,fmt:'0.000'}],['Warp contraction',{in:'cw',v:0.1,fmt:'0%'}],
['Sized warp per metre (kg) — all wastage assumed in warping',{f:v=>v.wa*1.0936*(1+v.cw)/(1-v.bg)/2.204,n:'sk',fx:'=B11*1.0936*(1+B12)/(1-B6)/2.204',fmt:'0.000'},{u:'kg'}],
['Sizing cost per kg',{in:'sc',v:10}],
['Sizing cost per metre',{f:v=>v.sc*v.sk,n:'sm',fx:'=B14*B13',fmt:'0.00'}],
['Packing cost per metre',{in:'pk',v:0.5}],
['B-grade price per metre',{in:'bp',v:21}],
['B-grade proceeds per metre (credit)',{f:v=>-v.bp*v.bg,n:'bc',fx:'=-B17*B6',fmt:'0.00'}],
[{t:'<b>Total variable production cost per metre</b>'},{f:v=>v.yc+v.sm+v.pk+v.bc,fx:'=B10+B15+B16+B18',fmt:'0.00',tot:true}]
]})}</div>`});

lecture({id:'tc20',course:'tc',n:'20',title:'Simple Fabric Costing',sub:'Container loading, export costs per metre, sale proceeds and the contribution per metre and per loom per day for an export grey fabric.',chips:['FCL','Export cost/m','Contribution per loom'],body:()=>`
<div class="card"><h2>How many metres fit in a container?</h2>
<p>A 40 ft container carries 57,000 lb. Divide by the yarn weight of one metre (warp + weft, with contraction) and you know the metres per container — and therefore how the fixed export charges (transport to port, forwarding, freight, bank charges) spread over each metre.</p>
${S({title:'Export fabric costing — 20×20/60×60, 63″, 40 ft container',cols:[300,110,110],rows:[
[{s:'Yarn in one unit of fabric',span:3}],
['Ends / picks per inch',{in:'epi',v:60},{in:'ppi',v:60}],['Warp / weft count (Ne)',{in:'wp',v:20},{in:'wf',v:20}],['Width (in)',{in:'w',v:63}],['Warp / weft contraction',{in:'cw',v:0.1,fmt:'0%'},{in:'cf',v:0.05,fmt:'0%'}],
[{h:''},{h:'per yard'},{h:'per metre'}],
['Warp (lb)',{f:v=>v.epi*v.w*(1+v.cw)/(v.wp*840),n:'wpy',fx:'=B2*B4*(1+B5)/(B3*840)',fmt:'0.0000'},{f:v=>v.wpy*1.0936,n:'wpm',fx:'=B7*1.0936',fmt:'0.0000'}],
['Weft (lb)',{f:v=>v.ppi*v.w*(1+v.cf)/(v.wf*840),n:'wfy',fx:'=C2*B4*(1+C5)/(C3*840)',fmt:'0.0000'},{f:v=>v.wfy*1.0936,n:'wfm',fx:'=B8*1.0936',fmt:'0.0000'}],
['Total (lb)',{f:v=>v.wpy+v.wfy,fx:'=B7+B8',fmt:'0.0000'},{f:v=>v.wpm+v.wfm,n:'lbm',fx:'=C7+C8',fmt:'0.0000'}],
['Container payload (lb) — 40 ft',{in:'pl',v:57000}],
['Quantity per container (m)',null,{f:v=>v.pl/v.lbm,n:'qm',fx:'=B10/C9',fmt:'#,##0'}],
[{s:'Variable export cost per metre',span:3}],
['Transport to port (Rs per container)',{in:'tr',v:15000},{f:v=>v.tr/v.qm,n:'e1',fx:'=B13/C11',fmt:'0.000'}],
['Ocean freight (US$)',{in:'of',v:500},{f:v=>v.of*v.fx/v.qm,n:'e2',fx:'=B14*B19/C11',fmt:'0.000'}],
['Forwarding charges (Rs)',{in:'fw',v:3500},{f:v=>v.fw/v.qm,n:'e3',fx:'=B15/C11',fmt:'0.000'}],
['Foreign bank charges (US$)',{in:'fb',v:200},{f:v=>v.fb*v.fx/v.qm,n:'e4',fx:'=B16*B19/C11',fmt:'0.000'}],
['Local bank charges (Rs)',{in:'lb',v:3000},{f:v=>v.lb/v.qm,n:'e5',fx:'=B17/C11',fmt:'0.000'}],
['Price (US$/m)',{in:'px',v:0.7}],
['Exchange rate',{in:'fx',v:60}],
['Export surcharge 0.25% of proceeds',null,{f:v=>0.0025*v.px*v.fx,n:'e6',fx:'=0.25%×B18×B19',fmt:'0.000'}],
['Commission (1% of proceeds)',{in:'cm',v:0.01,fmt:'0%'},{f:v=>v.cm*v.px*v.fx,n:'e7',fx:'=B21×B18×B19',fmt:'0.000'}],
['Total export cost per metre',null,{f:v=>v.e1+v.e2+v.e3+v.e4+v.e5+v.e6+v.e7,n:'ex',fx:'=SUM(C13:C21)',fmt:'0.000'}],
[{s:'Contribution',span:3}],
['Sale proceeds per metre (Rs)',null,{f:v=>v.px*v.fx,n:'sp',fx:'=B18*B19',fmt:'0.00'}],
['Variable production cost per metre (Lecture 19)',null,{in:'vp',v:29.21}],
['Total variable cost per metre',null,{f:v=>v.vp+v.ex,n:'tv',fx:'=C25+C22',fmt:'0.00'}],
[{t:'<b>Contribution margin per metre</b>'},null,{f:v=>v.sp-v.tv,n:'cmm',fx:'=C24-C26',fmt:'0.00',tot:true}],
['Loom production per day (m)',null,{in:'lp',v:434.5}],
[{t:'<b>Contribution per loom per day</b>'},null,{f:v=>v.cmm*v.lp,fx:'=C27*C28',fmt:'#,##0',tot:true}]
]})}
<div class="note">Compare the Rs 5,073 contribution per loom per day with the loom’s daily fixed cost (about Rs 4,000 in Lecture 8) and the order is worth taking — but only just. A one-cent drop in the dollar price removes Rs 0.60 of proceeds per metre (about Rs 0.59 after commission and surcharge), roughly a twentieth of the Rs 11.67 margin.</div></div>`});

lecture({id:'tc21',course:'tc',n:'21',title:'Simple Dyed Fabric Costing',sub:'From local grey price through wastage, dyeing charges and export costs to the US-dollar price a dyed fabric must fetch.',chips:['Gross grey price','B-grade','Required price'],body:()=>`
<div class="card"><h2>Working back from cost to the quotation</h2>
<p>An exporter who buys grey fabric locally and has it dyed starts from the local grey price, grosses it up for the wastage and shrinkage of processing, credits the B-grade that can still be sold, adds the dyeing charge and transport, then the variable export cost, a margin on cost, and finally commission and the export surcharge — which are percentages of the <em>proceeds</em> and must therefore be divided out, not added.</p>
${S({title:'Dyed fabric costing — 40 ft container of 20×20/60×60',cols:[320,100,110],rows:[
['Local grey price (Rs/m)',null,{in:'gp',v:100}],
['Wastage + shrinkage in processing',{in:'ws',v:0.1,fmt:'0%'}],
['Gross grey price per finished metre',null,{f:v=>v.gp/(1-v.ws),n:'gg',fx:'=C1/(1-B2)',fmt:'0.00'}],
['B-grade available (half of wastage)',{f:v=>v.ws/2,n:'ba',fx:'=B2/2',fmt:'0.0%'}],
['B-grade price as fraction of grey',{in:'bp',v:0.4,fmt:'0%'}],
['B-grade proceeds (credit)',null,{f:v=>-v.gp*v.ba*v.bp/(1-v.ws),n:'bc',fx:'=-C1*B4*B5/(1-B2)',fmt:'0.00'}],
['Dyeing charges',null,{in:'dc',v:40}],['Local transportation',null,{in:'lt',v:0.1}],
['Total processing cost per metre',null,{f:v=>v.gg+v.bc+v.dc+v.lt,n:'tp',fx:'=C3+C6+C7+C8',fmt:'0.00'}],
[{s:'Variable export cost per metre (less EDS & commission)',span:3}],
['Metres per 40 ft container',null,{in:'qm',v:107745}],
['Transportation 15,000 / container',null,{f:v=>15000/v.qm,n:'x1',fx:'=15000/C11',fmt:'0.000'}],
['Freight US$ 500 × exchange rate',null,{f:v=>500*v.fx/v.qm,n:'x2',fx:'=500×B17/C11',fmt:'0.000'}],
['Forwarding 3,500',null,{f:v=>3500/v.qm,n:'x3',fx:'=3500/C11',fmt:'0.000'}],
['Foreign bank US$ 200 × exchange rate',null,{f:v=>200*v.fx/v.qm,n:'x4',fx:'=200×B17/C11',fmt:'0.000'}],
['Local bank 3,000',null,{f:v=>3000/v.qm,n:'x5',fx:'=3000/C11',fmt:'0.000'}],
['Exchange rate (Rs/US$)',{in:'fx',v:60}],
['Export cost per metre',null,{f:v=>v.x1+v.x2+v.x3+v.x4+v.x5,n:'xc',fx:'=SUM(C12:C16)',fmt:'0.000'}],
['Total cost per metre',null,{f:v=>v.tp+v.xc,n:'tc',fx:'=C9+C18',fmt:'0.00'}],
['Margin on cost',{in:'mg',v:0.05,fmt:'0%'}],
['Proceeds required',null,{f:v=>v.tc*(1+v.mg),n:'pr',fx:'=C19*(1+B20)',fmt:'0.00'}],
['Commission / EDS (on proceeds)',{in:'cm',v:0.01,fmt:'0.00%'},{in:'eds',v:0.0025,fmt:'0.00%'}],
['Proceeds including commission and EDS',null,{f:v=>v.pr/(1-v.cm-v.eds),n:'pf',fx:'=C21/(1-B22-C22)',fmt:'0.00'}],
[{t:'<b>Required sales price (US$/m)</b>'},null,{f:v=>v.pf/v.fx,n:'usd',fx:'=C23/B17',fmt:'0.0000',tot:true}],
['Required sales price (US$/yd)',null,{f:v=>v.usd/1.0936,fx:'=C24/1.0936',fmt:'0.0000'}]
]})}</div>`});

lecture({id:'tc22',course:'tc',n:'22',title:'Concept of Routes',sub:'Different process routes for the same dyed fabric cost very different amounts; building the per-metre cost of one process from machine depreciation and utilities.',chips:['Process routes','Cost per metre','Bleaching cost build-up'],body:()=>`
<div class="card"><h2>Five ways to dye a fabric</h2>
<p>A dyed fabric can reach the same shade through different sequences of machines. Each process has a cost per metre; the route cost is the sum. Choose a route in the sheet to see its cost, and edit the process costs to reflect your own plant.</p>
${S({title:'Process costs and route totals (Rs per metre)',cols:[300,110],rows:[
[{s:'Cost per metre by process',span:2}],
['Bleaching',{in:'bl',v:3.05}],['Cold pad batch dyeing',{in:'cpb',v:6}],['Mercerizing',{in:'me',v:14}],['Pad steam dyeing',{in:'ps',v:12}],['Stenter',{in:'st',v:5}],['Stenter dyeing',{in:'sd',v:8}],['Thermosol',{in:'th',v:12}],['Washing',{in:'wa',v:4}],
[{s:'Routes',span:2}],
['1. Bleaching → Mercerizing → Pad steam dyeing → Stenter',{f:v=>v.bl+v.me+v.ps+v.st,fx:'=B2+B4+B5+B6',fmt:'0.00'}],
['2. Bleaching → Mercerizing → Thermosol → Washing → Stenter',{f:v=>v.bl+v.me+v.th+v.wa+v.st,fx:'=B2+B4+B8+B9+B6',fmt:'0.00'}],
['3. Bleaching → Pad steam dyeing → Stenter',{f:v=>v.bl+v.ps+v.st,fx:'=B2+B5+B6',fmt:'0.00'}],
['4. Bleaching → Cold pad batch dyeing → Washing',{f:v=>v.bl+v.cpb+v.wa,fx:'=B2+B3+B9',fmt:'0.00'}],
['5. Bleaching → Mercerizing → Stenter dyeing',{f:v=>v.bl+v.me+v.sd,fx:'=B2+B4+B7',fmt:'0.00'}],
['Selected route',{in:'r',v:'1',opts:['1','2','3','4','5']}],
[{t:'<b>Cost per metre of selected route</b>'},{f:v=>({1:v.bl+v.me+v.ps+v.st,2:v.bl+v.me+v.th+v.wa+v.st,3:v.bl+v.ps+v.st,4:v.bl+v.cpb+v.wa,5:v.bl+v.me+v.sd})[v.r],fx:'=VLOOKUP(route, routes table)',fmt:'0.00',tot:true}]
]})}
<div class="note">Route 4 (cold pad batch) costs a third of route 2, but it is slower, ties up fabric for batching time and suits reactive dyes only. Routing is a cost decision <em>and</em> a quality and delivery decision — the costing sheet gives the price of each choice.</div></div>
<div class="card"><h2>Where the Rs 3.05 for bleaching comes from</h2>
<p>A continuous bleaching range costing €2.5 million is depreciated over ten years with 10% a year of financial cost on top. Spread the yearly amount over the hours of the year, convert to rupees, divide by the metres the machine actually processes in an hour, and add chemicals and the utilities it consumes per hour.</p>
${S({title:'Bleaching — cost per metre build-up',cols:[300,110,70],rows:[
['Machine cost',{in:'mc',v:2500000},{u:'€'}],['Depreciation period (years)',{in:'yr',v:10}],['Financial cost (10% of machine cost per year)',{f:v=>v.mc*0.1,n:'fin',fx:'=B1*10%',fmt:'#,##0'},{u:'€'}],
['Depreciation per year',{f:v=>v.mc/v.yr,n:'dep',fx:'=B1/B2',fmt:'#,##0'},{u:'€'}],
['Total capital cost per year',{f:v=>v.dep+v.fin,n:'tcy',fx:'=B4+B3',fmt:'#,##0'},{u:'€'}],
['Per hour',{f:v=>v.tcy/365/24,n:'ph',fx:'=B5/365/24',fmt:'0.00'},{u:'€'}],
['Exchange rate (Rs/€)',{in:'fx',v:71.238}],
['Capital cost per hour (Rs)',{f:v=>v.ph*v.fx,n:'phr',fx:'=B6*B7',fmt:'#,##0'}],
['Speed (m/min)',{in:'sp',v:130}],['Cloth processed per hour (m)',{f:v=>v.sp*60,n:'mh',fx:'=B9*60',fmt:'#,##0'}],['Efficiency',{in:'ef',v:0.8,fmt:'0%'}],['Fraction of fabric undergoing this process',{in:'fr',v:1}],
['Effective cloth per hour (m)',{f:v=>v.mh*v.ef/v.fr,n:'eh',fx:'=B10*B11/B12',fmt:'#,##0'}],
['Capital cost per metre',{f:v=>v.phr/v.eh,n:'c1',fx:'=B8/B13',fmt:'0.0000'}],
['Chemical cost per metre',{in:'ch',v:1}],
['Water: litres/hour × Rs/litre',{in:'wl',v:4125},{in:'wr',v:1}],['Water cost per metre',{f:v=>v.wl*v.wr/v.mh,n:'c2',fx:'=B16*C16/B10',fmt:'0.0000'}],
['Air: m³/hour × Rs/m³',{in:'al',v:21},{in:'ar',v:50}],['Air cost per metre',{f:v=>v.al*v.ar/v.mh,n:'c3',fx:'=B18*C18/B10',fmt:'0.0000'}],
['Steam: kg/hour × Rs/kg (2030+560+2820 kg)',{in:'sl',v:5410},{in:'sr',v:0.5}],['Steam cost per metre',{f:v=>v.sl*v.sr/v.mh,n:'c4',fx:'=B20*C20/B10',fmt:'0.0000'}],
['Power: kW × Rs/kWh',{in:'pw',v:375},{in:'pr',v:8}],['Power cost per metre',{f:v=>v.pw*v.pr/v.mh,n:'c5',fx:'=B22*C22/B10',fmt:'0.0000'}],
[{t:'<b>Total bleaching cost per metre</b>'},{f:v=>v.c1+v.ch+v.c2+v.c3+v.c4+v.c5,fx:'=B14+B15+B17+B19+B21+B23',fmt:'0.0000',tot:true}]
]})}</div>`});

lecture({id:'tc23',course:'tc',n:'23',title:'Plant Machinery Analysis',sub:'Capacity of each machine in a finishing plant: speed, set-up time, efficiency, double passes and the share of fabric that visits it.',chips:['Capacity','Set-up & efficiency','Bottleneck'],body:()=>`
<div class="card"><h2>Capacity is speed × time × efficiency — and efficiency hides the set-ups</h2>
<p>For a continuous machine the run of 10,000 m at 50 m/min takes 200 min, but each run also needs cleaning (30 min) and preparation and matching (60 min). The calculated efficiency is run time ÷ (run + set-up); subtract another 10% for miscellaneous losses. A machine that passes the fabric twice (double thermosol, dye + wash) has its capacity halved for that fabric. The plant’s overall capacity is set by its bottleneck machine.</p>
${S({title:'Thermosol dyeing range — capacity for a 10,000 m run',cols:[300,110,70],rows:[
['Proposed run size (m)',{in:'run',v:10000}],['Speed (m/min)',{in:'sp',v:50}],
['Production time for one run (min)',{f:v=>v.run/v.sp,n:'pt',fx:'=B1/B2',fmt:'0.0'}],
['Average cleaning (min)',{in:'cl',v:30}],['Average preparation and matching (min)',{in:'pm',v:60}],
['Set-up time per run',{f:v=>v.cl+v.pm,n:'su',fx:'=B4+B5',fmt:'0'}],
['Calculated efficiency',{f:v=>v.pt/(v.pt+v.su),n:'ce',fx:'=B3/(B3+B6)',fmt:'0.0%'}],
['Miscellaneous efficiency losses',{in:'ml',v:0.1,fmt:'0%'}],
['Net efficiency',{f:v=>v.ce-v.ml,n:'ne',fx:'=B7-B8',fmt:'0.0%'}],
['Machines',{in:'n',v:1}],
['Capacity of machine (m/day)',{f:v=>v.sp*v.n*24*60*v.ne,n:'cap',fx:'=B2*B10*24*60*B9',fmt:'#,##0'}],
['Share of fabric needing a double pass',{in:'dp',v:0.25,fmt:'0%'}],
['Capacity adjusted for double pass (m/day)',{f:v=>v.cap/(1+v.dp),fx:'=B11/(1+B12)',fmt:'#,##0',tot:true}]
]})}
<h3>The whole plant</h3>
<table class="plain"><tr><th>Machine</th><th class="r">Speed m/min</th><th class="r">Efficiency</th><th class="r">Capacity m/day</th><th>Notes</th></tr>
<tr><td>Singeing, desizing, scouring &amp; bleaching</td><td class="r">120</td><td class="r">80%</td><td class="r">138,240</td><td>one machine or split in two; long bleaching runs</td></tr>
<tr><td>Mercerizing</td><td class="r">50</td><td class="r">80%</td><td class="r">57,600 (155,520 overall)</td><td>only 50/135 of the fabric is mercerized</td></tr>
<tr><td>Thermosol dyeing</td><td class="r">50</td><td class="r">59%</td><td class="r">42,455 → 34,000</td><td>3,000 yd minimum run; double passes</td></tr>
<tr><td>Pad steam (dyeing + washing)</td><td class="r">70</td><td class="r">57%</td><td class="r">57,571 → 46,000</td><td>set-up 70 min</td></tr>
<tr><td>Stenter for dyeing</td><td class="r">50</td><td class="r">59%</td><td class="r">42,455 → 34,000</td><td></td></tr>
<tr><td>Stenters for setting &amp; finishing (2)</td><td class="r">90</td><td class="r">80%</td><td class="r">207,360 ÷ 2.25 = 92,160</td><td>double pass for all non-stenter-dyed fabric, sometimes after mercerizing</td></tr>
<tr><td>Printing</td><td class="r">50</td><td class="r">67%</td><td class="r">48,185</td><td>set-up 60 min; less for colour change, more for design change</td></tr>
<tr><td>Calendering</td><td class="r">70</td><td class="r">80%</td><td class="r">80,640 (201,600 overall)</td><td>40% of fabric</td></tr>
<tr><td>Sanforizing</td><td class="r">70</td><td class="r">80%</td><td class="r">80,640 (161,280 overall)</td><td>50% of fabric</td></tr></table>
<p><b>Overall:</b> dyeing and printing capacity = continuous 34,000 + batch 10,000 + stenter-dyed 34,000 + printing 48,185 ≈ 126,000 m/day; finishing = 34,000 + 92,160 ≈ 126,000 m/day. The plant is balanced at about 126,000 m a day; the thermosol and stenter-dyeing ranges, at 34,000 each, are the lines to watch.</p></div>`});

lecture({id:'tc24',course:'tc',n:'24',title:'Final Dyeing Costing',sub:'Fixed cost, utilities and dyes per metre for every process, assembled for an order of a given size and shade depth, and summed by route.',chips:['Per-minute costs','Order size','Shade depth','Route cost'],body:()=>`
<div class="card"><h2>Costs per minute, applied to an order</h2>
<p>Every machine has a fixed cost per minute (depreciation, finance, labour) and a utilities cost per minute. An order of L metres occupies the machine for L ÷ speed minutes of running plus the set-up minutes; fixed cost applies to both, utilities only to running. Dyes and chemicals depend on the shade: Rs 3, 8, 15 or 25 per metre run for light, medium, dark and extra dark, plus a set-up quantity of colour worth 300 m (Rs 900, 2,400, 4,500 or 7,500).</p>
${S({title:'Dyeing cost per metre by process — order size and shade',cols:[160,70,70,70,80,80,80,90,90],rows:[
['Order size (m)',{in:'L',v:10000},null,{t:'Shade'},{in:'sh',v:'Extra Dark',opts:['Light','Medium','Dark','Extra Dark']}],
['Dyes running Rs/m by shade: light / medium / dark / extra dark',{in:'d1',v:3},{in:'d2',v:8},{in:'d3',v:15},{in:'d4',v:25},{t:'set-up = 300 m worth'}],
[{h:'Process'},{h:'Speed'},{h:'Set-up min'},{h:'Run min'},{h:'Fixed Rs/min'},{h:'Util Rs/min'},{h:'Fixed /m'},{h:'Util /m'},{h:'Total Rs/m'}],
...[['Bleaching',120,0,114.31,100.71,false],['Mercerizing',60,0,87.07,25.37,false],['Thermosol',50,90,84.76,52.53,true],['Pad steam',70,70,93.93,58.69,true],['Stenter dyeing',80,90,96.27,52.04,true],['Stenter finishing',60,30,44.84,44.92,'fin'],['Calender',50,0,30.75,12.37,false],['Sanforizing',70,0,21.53,8.83,false],['Washing',70,60,93.93,58.69,false]].map(([name,sp,su,fm,um,dye],i)=>{
  const k='p'+i;
  return [name,{in:k+'s',v:sp},{in:k+'u',v:su},{f:v=>v.L/v[k+'s'],n:k+'r',fx:'=order/speed',fmt:'0.0'},{in:k+'f',v:fm},{in:k+'m',v:um},
  {f:v=>(v[k+'r']+v[k+'u'])*v[k+'f']/v.L,n:k+'fx',fx:'=(run+setup)×fixed/min ÷ order',fmt:'0.000'},
  {f:v=>v[k+'r']*v[k+'m']/v.L,n:k+'ux',fx:'=run×util/min ÷ order',fmt:'0.000'},
  {f:v=>{let dyes=0;if(dye===true){const r={Light:v.d1,Medium:v.d2,Dark:v.d3,'Extra Dark':v.d4}[v.sh];dyes=r+r*300/v.L;}else if(dye==='fin'){dyes=2+600/v.L;}return v[k+'fx']+v[k+'ux']+dyes;},n:k+'t',fx:'=fixed/m + util/m + dyes & chemicals/m',fmt:'0.00',tot:true}];}),
[{s:'Route totals (Rs per metre)',span:9}],
['1. Bleach → Merc → Pad steam → Stenter fin.',null,null,null,null,null,null,null,{f:v=>v.p0t+v.p1t+v.p3t+v.p5t,fx:'=sum of processes',fmt:'0.00',tot:true}],
['2. Bleach → Merc → Thermosol → Wash → Stenter fin.',null,null,null,null,null,null,null,{f:v=>v.p0t+v.p1t+v.p2t+v.p8t+v.p5t,fx:'=sum of processes',fmt:'0.00',tot:true}],
['3. Bleach → Pad steam → Stenter fin.',null,null,null,null,null,null,null,{f:v=>v.p0t+v.p3t+v.p5t,fx:'=sum of processes',fmt:'0.00',tot:true}],
['4. Bleach → Stenter dyeing',null,null,null,null,null,null,null,{f:v=>v.p0t+v.p4t,fx:'=sum of processes',fmt:'0.00',tot:true}],
['5. Bleach → Merc → Stenter dyeing',null,null,null,null,null,null,null,{f:v=>v.p0t+v.p1t+v.p4t,fx:'=sum of processes',fmt:'0.00',tot:true}]
]})}
<div class="note">Change the order size to 2,000 m: the set-up minutes and the 300 m of set-up colour are now spread over a fifth of the length and the dyeing processes jump by several rupees a metre. This sheet is the ABC lesson of Lecture 12 turned into a quotation tool.</div></div>`});

lecture({id:'tc25',course:'tc',n:'25',title:'Stitching Costing I — Linear Rating',sub:'How many metres of fabric does one sheet, fitted sheet or pillow case consume? Cut lengths, hems, margins and wastage.',chips:['Cut length','Linear rating','Wastage'],body:()=>`
<div class="card"><h2>From a finished size to a cut length</h2>
<p>A finished flat sheet of 178 × 260 cm is cut larger: hems top and bottom, margins on the sides. If the fabric is wide enough the sheet is cut <em>across</em> the width (“inverted”), so the cut length along the roll is the finished width plus side margins; otherwise it runs along the roll. The <b>linear rating</b> is the cut length in metres, and a wastage allowance is added to give the final rating used in costing.</p>
${S({title:'Flat sheets — linear rating (inches unless stated)',cols:[150,90,90,70,70,70,70,70,70,90,90,90],rows:[
[{h:'Item'},{h:'Finished size cm'},{h:'Width in'},{h:'Length in'},{h:'Top hem'},{h:'Bottom hem'},{h:'Side margin'},{h:'Inverted?'},{h:'Cut length in'},{h:'Linear rating m'},{h:'Wastage'},{h:'Final rating'}],
...[['Single','178x260',12,0.25,0.5,1],['Double','228x260',12,0.25,0.5,0],['5 feet','275x275',12,0.25,0.5,0],['6 feet','310x270',12,0.25,0.5,0]].map((r,i)=>{const k='f'+i;const [wcm,lcm]=r[1].split('x').map(Number);
 return [r[0],{t:r[1]},{in:k+'w',v:+(wcm/2.54).toFixed(2)},{in:k+'l',v:+(lcm/2.54).toFixed(2)},{in:k+'t',v:r[2]},{in:k+'b',v:r[3]},{in:k+'s',v:r[4]},{in:k+'i',v:r[5]},
 {f:v=>v[k+'i']?v[k+'w']+2*v[k+'s']:v[k+'l']+v[k+'t']+v[k+'b'],n:k+'c',fx:'=IF(inverted, width+2×side, length+hems)',fmt:'0.00'},
 {f:v=>Math.ceil(v[k+'c']/39.37*100)/100,n:k+'r',fx:'=ROUNDUP(cut/39.37,2)',fmt:'0.00'},{in:k+'x',v:0.05,fmt:'0%'},{f:v=>v[k+'r']*(1+v[k+'x']),fx:'=rating×(1+wastage)',fmt:'0.000',tot:true}];})
]})}
${S({title:'Fitted sheets and pillow cases',cols:[170,90,90,70,80,70,70,80,90,90,90],rows:[
[{h:'Item'},{h:'Finished size cm'},{h:'Width in'},{h:'Length in'},{h:'Pocket / flap'},{h:'Hem each end'},{h:'Side margin'},{h:'Cut length in'},{h:'Linear rating m'},{h:'Wastage'},{h:'Final rating'}],
...[['Single fitted','91x190',10,1,0.5],['Double fitted','137x190',10,1,0.5],['5 ft fitted','152x200',10,1,0.5],['6 ft fitted','183x200',10,1,0.5]].map((r,i)=>{const k='g'+i;const [wcm,lcm]=r[1].split('x').map(Number);
 return [r[0],{t:r[1]},{in:k+'w',v:+(wcm/2.54).toFixed(2)},{in:k+'l',v:+(lcm/2.54).toFixed(2)},{in:k+'p',v:r[2]},{in:k+'h',v:r[3]},{in:k+'s',v:r[4]},
 {f:v=>v[k+'w']+2*v[k+'p']+2*v[k+'s'],n:k+'c',fx:'=width+2×pocket+2×side (cut across width)',fmt:'0.00'},{f:v=>Math.ceil(v[k+'c']/39.37*100)/100,n:k+'r',fx:'=ROUNDUP(cut/39.37,2)',fmt:'0.00'},{in:k+'x',v:0.05,fmt:'0%'},{f:v=>v[k+'r']*(1+v[k+'x']),fx:'=rating×(1+wastage)',fmt:'0.000',tot:true}];}),
['Standard pillow case (3 across, U-shape)',{t:'76x48'},{in:'pw',v:29.92},{in:'pl',v:18.9},{in:'pf',v:0},{in:'ph',v:12},{in:'ps',v:12},{f:v=>v.pf+2*v.ph+1+2*v.pl,n:'pc',fx:'=flap+top hem+1″ top margin+bottom 12″+2×length (folded U)',fmt:'0.00'},{f:v=>Math.ceil(v.pc/39.37*100)/100/3,n:'pr',fx:'=ROUNDUP(cut/39.37,2)/3 pieces',fmt:'0.000'},{in:'px',v:0.05,fmt:'0%'},{f:v=>v.pr*(1+v.px),fx:'=rating×(1+wastage)',fmt:'0.000',tot:true}]
]})}
<div class="note">The original worksheet chooses between four cutting layouts with nested IF formulas (inverted or not, selvedge allowance or not). The rule of thumb survives every layout: linear rating = cut length along the roll ÷ 39.37, rounded up to the next centimetre (two decimals of a metre), plus wastage.</div></div>`});

lecture({id:'tc26',course:'tc',n:'26',title:'Stitching Costing II — Order Costing',sub:'A made-up order from fabric consumption to profit: linear rating, B-grade and rag proceeds, accessories, labour, loading and allocated fixed cost.',chips:['Fabric cost','Accessories','Direct labour','Profitability'],body:()=>`
<div class="card"><h2>One line of a stitching order</h2>
<p>Each row of the mill’s costing sheet is one item: pieces made, fabric consumed (A-grade pieces × linear rating, plus the B-grade pieces and rags), fabric cost at the rate per linear metre, credits for B-grade and rag proceeds, then accessories, direct labour and loading, with fixed cost allocated as 3.2 × direct labour. Edit the inputs to cost any item.</p>
${S({title:'Stitching order costing — pillow case 20×32, 40×40/110×100',cols:[320,110,110],rows:[
['A-grade pieces',{in:'a',v:1776}],['B-grade pieces',{in:'b',v:10}],['Linear rating (m per piece)',{in:'lr',v:0.43}],
['Fabric in A-grade pieces (m)',{f:v=>v.a*v.lr,n:'fa',fx:'=B1*B3',fmt:'0.00'}],['Fabric in B-grade pieces (m)',{f:v=>v.b*v.lr,n:'fb',fx:'=B2*B3',fmt:'0.00'}],['Rags (m)',{in:'rg',v:25}],
['Fabric consumed (m)',{f:v=>v.fa+v.fb+v.rg,n:'fc',fx:'=B4+B5+B6',fmt:'0.00'}],
['Yield (A-grade share) / wastage',{f:v=>v.fa/v.fc,fx:'=B4/B7',fmt:'0.0%'},{f:v=>1-v.fa/v.fc,fx:'=1-B8',fmt:'0.0%'}],
['Fabric rate (Rs per linear metre)',{in:'rt',v:167}],
['Fabric cost',{f:v=>v.fc*v.rt,n:'cf',fx:'=B7*B9',fmt:'#,##0.00'},{f:v=>v.cf/v.a,fx:'per A-grade piece',fmt:'0.00'}],
['B-grade proceeds (Rs per piece)',{in:'bp',v:15},{f:v=>v.b*v.bp,n:'bpr',fx:'=B2*B11',fmt:'#,##0.00'}],
['Rag proceeds (15% of fabric rate)',{f:v=>0.15,fx:'15%',fmt:'0%'},{f:v=>v.rg*0.15*v.rt,n:'rpr',fx:'=B6*15%*B9',fmt:'#,##0.00'}],
['Accessories per piece',{in:'ac',v:10},{f:v=>v.ac*v.a,n:'act',fx:'=B13*B1',fmt:'#,##0.00'}],
['Direct labour per piece',{in:'dl',v:1.2},{f:v=>v.dl*v.a,n:'dlt',fx:'=B14*B1',fmt:'#,##0.00'}],
['Loading cost (total)',null,{in:'ld',v:167}],
['Total variable manufacturing cost',{f:v=>(v.cf-v.bpr-v.rpr+v.act+v.dlt+v.ld)/v.a,fx:'per piece',fmt:'0.00'},{f:v=>v.cf-v.bpr-v.rpr+v.act+v.dlt+v.ld,n:'tv',fx:'=C10-C11-C12+C13+C14+C15',fmt:'#,##0.00'}],
['Fixed cost allocated (3.2 × direct labour)',{f:v=>v.dlt*v.fxm/v.a,fx:'per piece',fmt:'0.00'},{f:v=>v.dlt*v.fxm,n:'fxt',fx:'=C14×3.2',fmt:'#,##0.00'}],
['   multiplier',{in:'fxm',v:3.2}],
[{t:'<b>Total cost</b>'},{f:v=>(v.tv+v.fxt)/v.a,n:'cpp',fx:'per piece',fmt:'0.00',tot:true},{f:v=>v.tv+v.fxt,fx:'=C16+C17',fmt:'#,##0.00',tot:true}],
['Sales price per piece',{in:'sp',v:80}],
[{t:'<b>Profit / (loss) per piece</b>'},{f:v=>v.sp-v.cpp,n:'pp',fx:'=B20-B19',fmt:'0.00',tot:true},{f:v=>(v.sp-v.cpp)*v.a,fx:'=B21*B1',fmt:'#,##0.00',tot:true}]
]})}
<h3>The full order sheet (eight items, two order codes)</h3>
<table class="plain"><tr><th>#</th><th>Item</th><th>Size</th><th>Shade</th><th>Construction</th><th class="r">Pieces</th><th class="r">Rating</th><th class="r">Cost / pc</th><th class="r">Price</th><th class="r">Profit / pc</th><th class="r">Total</th></tr>
<tr><td>1</td><td>Pillow case 20×32</td><td>Queen</td><td>White</td><td>40×40/110×100</td><td class="r">1,776</td><td class="r">0.43</td><td class="r">89.26</td><td class="r">80</td><td class="r">(9.26)</td><td class="r">(16,449)</td></tr>
<tr><td>2</td><td>Comforter shell 91×107</td><td>King</td><td>Black</td><td>60×60/200×100</td><td class="r">210</td><td class="r">5.49</td><td class="r">922.64</td><td class="r">900</td><td class="r">(22.64)</td><td class="r">(4,755)</td></tr>
<tr><td>3</td><td>Comforter shell flat 91×91</td><td>Queen</td><td>Black</td><td>60×60/200×100</td><td class="r">1,000</td><td class="r">4.67</td><td class="r">800.09</td><td class="r">900</td><td class="r">99.91</td><td class="r">99,913</td></tr>
<tr><td>4</td><td>Comforter shell flat 91×91</td><td>Queen</td><td>Stone</td><td>60×60/200×100</td><td class="r">1,000</td><td class="r">4.67</td><td class="r">730.14</td><td class="r">900</td><td class="r">169.86</td><td class="r">169,865</td></tr>
<tr><td>5</td><td>Comforter shell 91×107</td><td>King</td><td>Stone</td><td>60×60/200×100</td><td class="r">210</td><td class="r">5.49</td><td class="r">870.47</td><td class="r">900</td><td class="r">29.53</td><td class="r">6,200</td></tr>
<tr><td>6</td><td>Pillow sham 20×26</td><td>Standard</td><td>Stone</td><td>60×60/200×100</td><td class="r">2,208</td><td class="r">0.48</td><td class="r">91.25</td><td class="r">90</td><td class="r">(1.25)</td><td class="r">(2,754)</td></tr>
<tr><td>7</td><td>Pillow sham 20×36</td><td>King</td><td>Stone</td><td>60×60/200×100</td><td class="r">432</td><td class="r">0.54</td><td class="r">100.50</td><td class="r">90</td><td class="r">(10.50)</td><td class="r">(4,535)</td></tr>
<tr><td>8</td><td>Pillow sham 20×36</td><td>King</td><td>Black</td><td>60×60/200×100</td><td class="r">2,016</td><td class="r">0.48</td><td class="r">93.37</td><td class="r">90</td><td class="r">(3.37)</td><td class="r">(6,792)</td></tr>
<tr><th colspan="5">Grand total</th><th class="r">8,852</th><th></th><th></th><th></th><th></th><th class="r">240,693</th></tr></table>
<div class="note">The order as a whole is profitable only because of the two large comforter lines; every pillow item loses money. Because fixed cost is absorbed at 3.2 × direct labour, small labour-heavy pieces carry a heavy share of overhead — Activity Based Costing would test whether that share is fair, and a stitching unit must price pillow cases on their own cost, not on an average.</div></div>`});

/* ===================== WEAVING CALCULATIONS ===================== */
const RUE=x=>Math.ceil(x/2)*2; // round up to even
const TEXC=590.67; // tex × Ne constant
lecture({id:'wc00',course:'wc',n:'00',title:'Course Outline – Weaving Calculations (TX-416)',sub:'What the course covers, how it is graded and where each lecture sits in the 15-week plan.',chips:['Outline','Grading','15-week plan'],tags:'syllabus outline plan',body:()=>`
<div class="card"><h2>Description</h2>
<p>This course concentrates on the calculations that a weaving engineer performs every day: converting and combining yarn counts, estimating the weight and cover of a fabric, sizing the warping, sizing and beaming operations for an order, predicting loom production, planning deliveries, and finally judging the feasibility of a whole weaving plant.</p>
<div class="grid3">
<div class="card" style="margin:0"><h3>Outcomes</h3><p>Productivity calculations of weaving machines; planning a weaving factory to meet customer orders; fabric weight and cover calculations.</p></div>
<div class="card" style="margin:0"><h3>Grading</h3><div class="kv"><b>Participation</b><span>10</span><b>Assignments</b><span>10</span><b>Quizzes</b><span>25</span><b>Mid term</b><span>25</span><b>Final</b><span>30</span></div></div>
<div class="card" style="margin:0"><h3>Rule</h3><p>Attendance below 80% means an F grade — the calculations build on one another week by week.</p></div>
</div></div>
<div class="card"><h2>Lecture plan</h2>
<table class="plain"><tr><th>Week</th><th>1st lecture</th><th>2nd lecture</th></tr>
<tr><td>1</td><td><a data-go="wc01">Counting Systems</a></td><td><a data-go="wc02">Multiple Counts I</a> — two or three counts together or twisted</td></tr>
<tr><td>2</td><td><a data-go="wc03">Multiple Counts II</a> — proportions</td><td><a data-go="wc04">Multiple Counts III</a> — proportions and cost</td></tr>
<tr><td>3</td><td><a data-go="wc05">Weight of Fabric</a> — GSM, oz/yd², linear</td><td><a data-go="wc06">Sett Calculations</a> — beams, warping production</td></tr>
<tr><td>4</td><td><a data-go="wc07">Beam Calculations</a></td><td><a data-go="wc08">Breakages – Sized Count</a></td></tr>
<tr><td>5</td><td><a data-go="wc09">Cone Size</a></td><td><a data-go="wc10">Warping Speed</a></td></tr>
<tr><td>6</td><td><a data-go="wc11">Reed Calculations</a></td><td><a data-go="wc12">Cover Factor I</a></td></tr>
<tr><td>7</td><td><a data-go="wc12">Cover Factor II</a> — weavability on airjet</td><td><a data-go="wc13">Fabric Production</a></td></tr>
<tr><td>8</td><td>Mid term</td><td><a data-go="wc14">Crimp I</a> — same count</td></tr>
<tr><td>9</td><td><a data-go="wc14">Crimp II</a> — different counts</td><td><a data-go="wc17">Blended Fabrics</a></td></tr>
<tr><td>10</td><td><a data-go="wc18">Sizing Cost Analysis</a></td><td><a data-go="wc19">Planning I</a> — orders</td></tr>
<tr><td>11</td><td><a data-go="wc19">Planning II</a> — loom changeovers</td><td><a data-go="wc19">Planning III</a> — yarns for looms</td></tr>
<tr><td>12</td><td><a data-go="wc22">Planning IV</a> — production over months</td><td><a data-go="wc25">Set Size Planning</a></td></tr>
<tr><td>13</td><td><a data-go="wc27">Feasibility I</a> — costing, profits</td><td><a data-go="wc27">Feasibility II</a> — new plant</td></tr>
<tr><td>14</td><td>Shed Planning</td><td>Design Calculations I — ripstop sizes</td></tr>
<tr><td>15</td><td>Design Calculations II — density vs appearance</td><td>Overview</td></tr></table>
<div class="note">Lectures without a link (Shed Planning, Design Calculations, Overview) had no worksheet in the course folder, so they are not reproduced here.</div></div>`});

lecture({id:'wc01',course:'wc',n:'01',title:'Counting Systems',sub:'Direct and indirect yarn numbering — Ne, Nm, tex, dtex and denier — and the single constant that links them.',chips:['Ne','Tex','Denier','Nm'],tags:'count conversion yarn number',body:()=>`
<div class="card"><h2>Two families of yarn numbers</h2>
<p>A yarn count tells us how fine a yarn is. <b>Indirect</b> systems measure <em>length per unit weight</em>: the finer the yarn, the higher the number. <b>Direct</b> systems measure <em>weight per unit length</em>: the finer the yarn, the lower the number.</p>
<table class="plain"><tr><th>System</th><th>Definition</th><th>Type</th><th>Used for</th></tr>
<tr><td>English cotton count, Ne</td><td>number of 840-yard hanks per pound</td><td>indirect</td><td>cotton and cotton blends</td></tr>
<tr><td>Metric count, Nm</td><td>metres per gram (km per kg)</td><td>indirect</td><td>wool, worsted, Europe</td></tr>
<tr><td>Tex</td><td>grams per 1000 m</td><td>direct</td><td>universal (ISO)</td></tr>
<tr><td>Decitex, dtex (grex)</td><td>grams per 10,000 m</td><td>direct</td><td>filament yarns</td></tr>
<tr><td>Denier</td><td>grams per 9000 m</td><td>direct</td><td>silk, filament, Lycra</td></tr></table></div>
<div class="card"><h2>Deriving the constant 590.67</h2>
<ol class="steps">
<li>1 Ne means 840 yd weigh 1 lb, i.e. <b>1 lb per 840 yd</b>.</li>
<li>1 lb = 453.6 g and 840 yd = 840 × 0.9144 m = 768.1 m, so 1 Ne = 453.6 g / 768.1 m.</li>
<li>Per 1000 m that is 453.6 × 1000 / 768.1 = <b>590.67 g → 590.67 tex</b>.</li>
<li>Denier is tex × 9, so 1 Ne = 5316 denier; and Nm = 1000 / tex = 1.693.</li></ol>
<div class="formula">Ne × tex = 590.67 &nbsp;&nbsp;·&nbsp;&nbsp; denier = 9 × tex &nbsp;&nbsp;·&nbsp;&nbsp; dtex = 10 × tex &nbsp;&nbsp;·&nbsp;&nbsp; Nm = 1000 / tex</div>
<div class="warn">The original worksheet divided by the denier figure in cell C15 (1458) when converting to Ne, which only happened to give the right answer for the first row. The converter below uses the correct constant 590.67.</div></div>
<div class="card"><h2>Universal count converter</h2>
<p>Pick the system you know, type the value, and every other system is worked out through tex.</p>
${S({title:'Count conversion',cols:[200,120,60,200,120],rows:[
[{h:'Known system'},{h:'Value'},null,{h:'Result'},{h:''}],
['System',{in:'sys',v:'Ne',opts:['Ne','Tex','Denier','Nm','Dtex']},null,'Tex (g / 1000 m)',{f:v=>{const x=v.val;return v.sys==='Ne'?TEXC/x:v.sys==='Tex'?x:v.sys==='Denier'?x/9:v.sys==='Nm'?1000/x:x/10;},n:'tex',fx:'= to tex first',fmt:'#,##0.00'}],
['Value',{in:'val',v:30},null,'Ne (hanks / lb)',{f:v=>TEXC/v.tex,fx:'=590.67/tex',fmt:'#,##0.00'}],
[null,null,null,'Denier (g / 9000 m)',{f:v=>v.tex*9,fx:'=tex*9',fmt:'#,##0.00'}],
[null,null,null,'Nm (m / g)',{f:v=>1000/v.tex,fx:'=1000/tex',fmt:'#,##0.00'}],
[null,null,null,'Dtex (g / 10,000 m)',{f:v=>v.tex*10,fx:'=tex*10',fmt:'#,##0.00'}]
]})}
<h3>Worked examples from the lecture</h3>
<table class="plain"><tr><th>Given</th><th class="r">Tex</th><th class="r">Ne</th><th class="r">Denier</th><th class="r">Nm</th><th class="r">Dtex</th></tr>
<tr><td>162 tex</td><td class="r">162</td><td class="r">3.65</td><td class="r">1458</td><td class="r">6.17</td><td class="r">1620</td></tr>
<tr><td>Ne 30</td><td class="r">19.69</td><td class="r">30</td><td class="r">177.2</td><td class="r">50.79</td><td class="r">196.9</td></tr>
<tr><td>150 denier</td><td class="r">16.67</td><td class="r">35.44</td><td class="r">150</td><td class="r">60</td><td class="r">166.7</td></tr>
<tr><td>Nm 25</td><td class="r">40</td><td class="r">14.77</td><td class="r">360</td><td class="r">25</td><td class="r">400</td></tr></table>
<div class="note">Rule of thumb: Ne 20 ≈ 30 tex ≈ 266 denier; Ne 40 ≈ 15 tex. Lycra of 40 denier is 4.4 tex — about one-seventh of an Ne 20 yarn.</div></div>`});

lecture({id:'wc02',course:'wc',n:'02',title:'Multiple Counts I – Yarns Together or Twisted',sub:'Resultant count and price of two or three yarns run together or plied, using the price of one hank.',chips:['Resultant count','Hank price','Plied yarn'],tags:'harmonic mean plied doubled',body:()=>`
<div class="card"><h2>The idea: add weights, not counts</h2>
<p>When two yarns of different counts run side by side (or are twisted together) their weights per unit length add: the plied yarn is <em>heavier</em> than either, while the mean count of the yarns run together lies between the two counts. Counts cannot be averaged directly because Ne is an indirect number; what adds up is the weight of one hank of each yarn.</p>
<div class="formula">Mean count of n yarns together = n / ( 1/N₁ + 1/N₂ + … + 1/Nₙ ) &nbsp;&nbsp;·&nbsp;&nbsp; Twisted (plied) count = mean count / n</div>
<p>Prices are handled the same way: convert the price of 10 lb of each yarn into the <b>price of one hank</b> (840 yd), average the hank prices, then multiply back by the mean count.</p>
<div class="formula">Hank price = price per 10 lb ÷ 10 ÷ Ne &nbsp;&nbsp;·&nbsp;&nbsp; Price of mix per 10 lb = mean hank price × mean count × 10</div></div>
<div class="card"><h2>Two yarns</h2>
${S({title:'Two counts together / twisted',cols:[220,110,110,120],rows:[
[{h:''},{h:'Yarn 1'},{h:'Yarn 2'},{h:'Together'}],
['Count (Ne)',{in:'n1',v:7},{in:'n2',v:10},{f:v=>2/(1/v.n1+1/v.n2),n:'mean',fx:'=2/(1/B2+1/C2)',fmt:'0.00'}],
['Price per 10 lb (Rs)',{in:'p1',v:397},{in:'p2',v:700},{f:v=>(v.p1/10/v.n1+v.p2/10/v.n2)/2*v.mean*10,n:'pm',fx:'=D4*D2*10',fmt:'0.00'}],
['Price per hank (Rs)',{f:v=>v.p1/10/v.n1,n:'h1',fx:'=B3/10/B2',fmt:'0.000'},{f:v=>v.p2/10/v.n2,n:'h2',fx:'=C3/10/C2',fmt:'0.000'},{f:v=>(v.h1+v.h2)/2,n:'hp',fx:'=(B4+C4)/2',fmt:'0.000'}],
[{s:'If the two yarns are twisted into one plied yarn',span:4}],
['Resultant (plied) count',null,null,{f:v=>v.mean/2,fx:'=D2/2',fmt:'0.00'}],
['Price of plied yarn per 10 lb (Rs)',null,null,{f:v=>v.pm,fx:'=D3 (same weight, same cost)',fmt:'0.00'}]
]})}
<div class="note">Ne 7 and Ne 10 together behave like Ne 8.24, and the plied yarn is Ne 4.12 — not the “average” 8.5 and 4.25. The difference grows as the counts move apart.</div></div>
<div class="card"><h2>Three yarns</h2>
${S({title:'Three counts together / twisted',cols:[220,100,100,100,120],rows:[
[{h:''},{h:'Yarn 1'},{h:'Yarn 2'},{h:'Yarn 3'},{h:'Together'}],
['Count (Ne)',{in:'a',v:20},{in:'b',v:30},{in:'c',v:10},{f:v=>3/(1/v.a+1/v.b+1/v.c),n:'m3',fx:'=3/(1/B2+1/C2+1/D2)',fmt:'0.00'}],
['Price per 10 lb (Rs)',{in:'pa',v:710},{in:'pb',v:710},{in:'pc',v:540},{f:v=>(v.pa/10/v.a+v.pb/10/v.b+v.pc/10/v.c)/3*v.m3*10,fx:'=E4*E2*10',fmt:'0.00'}],
['Price per hank (Rs)',{f:v=>v.pa/10/v.a,n:'ha',fx:'=B3/10/B2',fmt:'0.000'},{f:v=>v.pb/10/v.b,n:'hb',fx:'=C3/10/C2',fmt:'0.000'},{f:v=>v.pc/10/v.c,n:'hc',fx:'=D3/10/D2',fmt:'0.000'},{f:v=>(v.ha+v.hb+v.hc)/3,n:'h3',fx:'=AVERAGE(B4:D4)',fmt:'0.000'}],
['Plied count (3-ply)',null,null,null,{f:v=>v.m3/3,fx:'=E2/3',fmt:'0.00'}]
]})}</div>`});

lecture({id:'wc03',course:'wc',n:'03',title:'Multiple Counts II – Yarns in Proportion',sub:'When the yarns are not present in equal numbers: weighting by the number of threads of each count.',chips:['Weighted mean','Threads per count'],tags:'proportion mean count reciprocal',body:()=>`
<div class="card"><h2>From equal shares to proportions</h2>
<p>Lecture 2 assumed one thread of each yarn. In a real warp a fabric may use 56 threads of one count for every 4.35 threads of another (a stripe, a selvedge, a cord). The rule is the same — add weights — but each yarn is weighted by its number of threads:</p>
<div class="formula">Mean Ne = Σ threads ÷ Σ ( threads / Ne )</div>
<p>“threads ÷ Ne” is proportional to the weight of those threads per unit length, so the denominator is the total weight and the numerator the total length.</p></div>
<div class="card"><h2>Proportion worksheet</h2>
<p>Four slots are provided; leave the threads of an unused slot at 0.</p>
${S({title:'Mean count of yarns in proportion',cols:[120,110,110,130],rows:[
[{h:'Yarn'},{h:'Count Ne'},{h:'Threads'},{h:'Threads ÷ Ne'}],
['A',{in:'na',v:30},{in:'ta',v:56},{f:v=>v.ta/v.na,n:'ra',fx:'=C2/B2',fmt:'0.0000'}],
['B',{in:'nb',v:30},{in:'tb',v:4.35},{f:v=>v.tb/v.nb,n:'rb',fx:'=C3/B3',fmt:'0.0000'}],
['C',{in:'nc',v:20},{in:'tc',v:0},{f:v=>v.tc?v.tc/v.nc:0,n:'rc',fx:'=C4/B4',fmt:'0.0000'}],
['D',{in:'nd',v:40},{in:'td',v:0},{f:v=>v.td?v.td/v.nd:0,n:'rd',fx:'=C5/B5',fmt:'0.0000'}],
[{t:'<b>Totals</b>'},null,{f:v=>v.ta+v.tb+v.tc+v.td,n:'tt',fx:'=SUM(C2:C5)',fmt:'0.00',tot:true},{f:v=>v.ra+v.rb+v.rc+v.rd,n:'rt',fx:'=SUM(D2:D5)',fmt:'0.0000',tot:true}],
[{t:'<b>Mean count Ne</b>'},null,null,{f:v=>v.tt/v.rt,fx:'=C6/D6',fmt:'0.00',tot:true}]
]})}
<div class="note">Try A = Ne 30 × 56 threads and B = Ne 10 × 4 threads: the mean drops to about Ne 26.5 even though only 7% of the threads are coarse. Each coarse thread weighs three times as much as a fine one, so those 7% of the threads carry about 18% of the weight and pull the mean down.</div></div>`});

lecture({id:'wc04',course:'wc',n:'04',title:'Multiple Counts III – Proportions and Cost',sub:'Adding prices to the proportion method: the mean hank price and the price of the mixed yarn per 10 lb.',chips:['SUMPRODUCT','Mean hank price','Cost of mix'],tags:'price cost proportion sumproduct',body:()=>`
<div class="card"><h2>Costing a yarn mixture</h2>
<ol class="steps">
<li>Convert each price per 10 lb into a <b>hank price</b>: price ÷ 10 ÷ Ne.</li>
<li>Weight the hank prices by the number of threads: mean hank price = Σ(threads × hank price) ÷ Σ threads — Excel’s SUMPRODUCT.</li>
<li>Find the mean count exactly as in Lecture 3.</li>
<li>Price of the mixture per 10 lb = mean hank price × mean count × 10.</li></ol>
${S({title:'Proportions with cost',cols:[80,90,100,110,110,130],rows:[
[{h:'Yarn'},{h:'Count Ne'},{h:'Threads'},{h:'Price / 10 lb'},{h:'Hank price'},{h:'Threads × hank'}],
['A',{in:'na',v:30},{in:'ta',v:56},{in:'pa',v:515},{f:v=>v.pa/10/v.na,n:'ha',fx:'=D2/10/B2',fmt:'0.0000'},{f:v=>v.ta*v.ha,n:'xa',fx:'=C2*E2',fmt:'0.00'}],
['B',{in:'nb',v:30},{in:'tb',v:4.35},{in:'pb',v:460},{f:v=>v.pb/10/v.nb,n:'hb',fx:'=D3/10/B3',fmt:'0.0000'},{f:v=>v.tb*v.hb,n:'xb',fx:'=C3*E3',fmt:'0.00'}],
['C',{in:'nc',v:20},{in:'tc',v:0},{in:'pc',v:430},{f:v=>v.pc/10/v.nc,n:'hc',fx:'=D4/10/B4',fmt:'0.0000'},{f:v=>v.tc*v.hc,n:'xc',fx:'=C4*E4',fmt:'0.00'}],
[{t:'<b>Totals</b>'},null,{f:v=>v.ta+v.tb+v.tc,n:'tt',fx:'=SUM(C2:C4)',fmt:'0.00',tot:true},null,null,{f:v=>v.xa+v.xb+v.xc,n:'xt',fx:'=SUMPRODUCT(C2:C4,E2:E4)',fmt:'0.00',tot:true}],
['Mean count',null,null,null,null,{f:v=>v.tt/(v.ta/v.na+v.tb/v.nb+(v.tc?v.tc/v.nc:0)),n:'mn',fx:'=C5/SUM(threads/Ne)',fmt:'0.00'}],
['Mean hank price',null,null,null,null,{f:v=>v.xt/v.tt,n:'mh',fx:'=F5/C5',fmt:'0.0000'}],
[{t:'<b>Price of mix per 10 lb (Rs)</b>'},null,null,null,null,{f:v=>v.mh*v.mn*10,fx:'=F7*F6*10',fmt:'0.00',tot:true}]
]})}
<div class="note">With both yarns at Ne 30, the mean count stays 30 and the price (511.04) is simply the thread-weighted average of 515 and 460. Change yarn C to 10 threads of Ne 20 at Rs 430 to see count and price move together.</div></div>`});

lecture({id:'wc05',course:'wc',n:'05',title:'Weight of Fabric',sub:'From construction to ounces per square yard and grams per square metre — the calculation every merchandiser asks for first.',chips:['GSM','oz/yd²','Contraction','lb/yd'],tags:'weight gsm ounces linear',body:()=>`
<div class="card"><h2>Reading a construction</h2>
<p>A woven construction is written <b>warp count × weft count / ends per inch × picks per inch, width, weave</b>: for example <b>20 × 20 / 60 × 60, 63", 1/1</b>. Two corrections turn these numbers into yarn weight: <b>warp contraction</b> (the warp is longer than the fabric because it bends over the picks, about 10%) and <b>weft contraction</b> (the pick is longer than the fabric width, about 5%).</p>
<ol class="steps">
<li>Total ends = EPI × width. One yard of one end weighs 1 ÷ (840 × Ne) lb.</li>
<li>Warp weight per yard of fabric = ends × (1 + warp contraction) ÷ (840 × Ne<sub>warp</sub>).</li>
<li>One pick is width (in yards) × (1 + weft contraction) long; there are PPI × 36 picks in a yard.</li>
<li>Add the two, ×16 for ounces per linear yard, ÷ width in yards for oz/yd².</li>
<li>Metric: lb/yd × 1.0936 = lb/m; ÷ 2.2046 = kg/m; ÷ width in metres × 1000 = GSM.</li></ol></div>
<div class="card"><h2>Fabric weight calculator</h2>
${S({title:'Weight of fabric — two constructions side by side',cols:[260,120,120],rows:[
[{h:'Input'},{h:'Fabric A'},{h:'Fabric B'}],
['Warp count Ne',{in:'wa',v:20},{in:'wb',v:20}],
['Weft count Ne',{in:'fa',v:20},{in:'fb',v:16}],
['Ends per inch',{in:'ea',v:60},{in:'eb',v:128}],
['Picks per inch',{in:'pa',v:60},{in:'pb',v:60}],
['Width (inches)',{in:'da',v:63},{in:'db',v:63}],
['Warp contraction',{in:'ca',v:0.10,fmt:'0%'},{in:'cb',v:0.10,fmt:'0%'}],
['Weft contraction',{in:'ka',v:0.05,fmt:'0%'},{in:'kb',v:0.05,fmt:'0%'}],
[{s:'Warp',span:3}],
['Total ends',{f:v=>v.ea*v.da,n:'ta',fx:'=B4*B6',fmt:'#,##0'},{f:v=>v.eb*v.db,n:'tb',fx:'=C4*C6',fmt:'#,##0'}],
['Weight of 1 yd of one end (lb)',{f:v=>1/(840*v.wa),fx:'=1/(840*B2)',fmt:'0.000000'},{f:v=>1/(840*v.wb),fx:'=1/(840*C2)',fmt:'0.000000'}],
['Warp weight per yd of fabric (lb)',{f:v=>v.ta*(1+v.ca)/(840*v.wa),n:'wwa',fx:'=B10*(1+B7)/(840*B2)',fmt:'0.0000'},{f:v=>v.tb*(1+v.cb)/(840*v.wb),n:'wwb',fx:'=C10*(1+C7)/(840*C2)',fmt:'0.0000'}],
[{s:'Weft',span:3}],
['Length of one pick (yd)',{f:v=>v.da/36*(1+v.ka),n:'lpa',fx:'=B6/36*(1+B8)',fmt:'0.0000'},{f:v=>v.db/36*(1+v.kb),n:'lpb',fx:'=C6/36*(1+C8)',fmt:'0.0000'}],
['Picks per yard',{f:v=>v.pa*36,n:'pya',fx:'=B5*36',fmt:'#,##0'},{f:v=>v.pb*36,n:'pyb',fx:'=C5*36',fmt:'#,##0'}],
['Weft weight per yd of fabric (lb)',{f:v=>v.lpa*v.pya/(840*v.fa),n:'fwa',fx:'=B14*B15/(840*B3)',fmt:'0.0000'},{f:v=>v.lpb*v.pyb/(840*v.fb),n:'fwb',fx:'=C14*C15/(840*C3)',fmt:'0.0000'}],
[{s:'Results',span:3}],
['Yarn per linear yard (lb)',{f:v=>v.wwa+v.fwa,n:'ya',fx:'=B12+B16',fmt:'0.0000',tot:true},{f:v=>v.wwb+v.fwb,n:'yb',fx:'=C12+C16',fmt:'0.0000',tot:true}],
['Ounces per linear yard',{f:v=>v.ya*16,fx:'=B18*16',fmt:'0.00'},{f:v=>v.yb*16,fx:'=C18*16',fmt:'0.00'}],
['Ounces per square yard',{f:v=>v.ya*16/(v.da/36),fx:'=B19/(B6/36)',fmt:'0.00',tot:true},{f:v=>v.yb*16/(v.db/36),fx:'=C19/(C6/36)',fmt:'0.00',tot:true}],
['Yarn per linear metre (kg)',{f:v=>v.ya*1.0936/2.2046,n:'ma',fx:'=B18*1.0936/2.2046',fmt:'0.0000'},{f:v=>v.yb*1.0936/2.2046,n:'mb',fx:'=C18*1.0936/2.2046',fmt:'0.0000'}],
['GSM (g / m²)',{f:v=>v.ma/(v.da*0.0254)*1000,fx:'=B21/(B6*0.0254)*1000',fmt:'0.00',tot:true},{f:v=>v.mb/(v.db*0.0254)*1000,fx:'=C21/(C6*0.0254)*1000',fmt:'0.00',tot:true}]
]})}
<div class="note">Fabric A (20×20/60×60) comes out at 4.42 oz/yd² ≈ 150 GSM, a typical sheeting; fabric B (20×16/128×60, 3/1 twill) at 7.53 oz/yd² ≈ 255 GSM, a drill. A quick check: oz/yd² × 33.9 = GSM.</div></div>
<div class="card"><h2>Rough estimate used on the shop floor</h2>
<p>Fabric Design Lecture 2 gives a quick rule for Ne-count cotton fabrics: <span class="formula">GSM ≈ ( EPI ÷ Ne<sub>warp</sub> + PPI ÷ Ne<sub>weft</sub> ) × 25</span>. For fabric A that is (3 + 3) × 25 = 150; for B (6.4 + 3.75) × 25 = 254. It ignores contraction and width, which is why the exact method above is preferred for quotations.</p></div>`});

lecture({id:'wc06',course:'wc',n:'06',title:'Sett Calculations – Beams and Warping Production',sub:'How many warper’s beams an order needs, how many ends go on each, and how long the warper will take.',chips:['Creel capacity','Beams','Warping production','Order time'],tags:'sett warping creel beams',body:()=>`
<div class="card"><h2>From total ends to beams</h2>
<p>A sized weaver’s beam is made from several <b>warper’s beams</b> run together on the sizing machine. The warper’s creel holds a limited number of cones (here 840), so the total ends — including selvedge ends — are divided over an <b>even</b> number of beams (beams are paired on the sizing creel).</p>
<div class="formula">beams = round-up-to-even( total ends ÷ creel capacity ) &nbsp;&nbsp;·&nbsp;&nbsp; ends per beam = total ends ÷ beams</div>
${S({title:'Number of beams',cols:[260,120,120],rows:[
[{h:''},{h:'Fabric A'},{h:'Fabric B'}],
['Ends per inch',{in:'ea',v:60},{in:'eb',v:128}],
['Width (in)',{in:'da',v:63},{in:'db',v:63}],
['Extra selvedge ends',{in:'sa',v:40},{in:'sb',v:40}],
['Creel capacity (cones)',{in:'cra',v:840},{in:'crb',v:840}],
['Total ends incl. selvedge',{f:v=>v.ea*v.da+v.sa,n:'ta',fx:'=B2*B3+B4',fmt:'#,##0'},{f:v=>v.eb*v.db+v.sb,n:'tb',fx:'=C2*C3+C4',fmt:'#,##0'}],
['Beams calculated',{f:v=>v.ta/v.cra,fx:'=B6/B5',fmt:'0.00'},{f:v=>v.tb/v.crb,fx:'=C6/C5',fmt:'0.00'}],
['Beams used (round up to even)',{f:v=>RUE(v.ta/v.cra),n:'ba',fx:'=CEILING(B7,2)',fmt:'0'},{f:v=>RUE(v.tb/v.crb),n:'bb',fx:'=CEILING(C7,2)',fmt:'0'}],
['Ends per beam (average)',{f:v=>v.ta/v.ba,n:'pba',fx:'=B6/B8',fmt:'0.00'},{f:v=>v.tb/v.bb,n:'pbb',fx:'=C6/C8',fmt:'0.00'}],
['… in practice',{f:v=>{const q=Math.floor(v.ta/v.ba),r=v.ta-q*v.ba;return r?`${v.ba-r} beams × ${q} + ${r} beams × ${q+1}`:`${v.ba} beams × ${q}`;},fx:'whole ends only',fmt:'txt'},{f:v=>{const q=Math.floor(v.tb/v.bb),r=v.tb-q*v.bb;return r?`${v.bb-r} beams × ${q} + ${r} beams × ${q+1}`:`${v.bb} beams × ${q}`;},fx:'whole ends only',fmt:'txt'}]
]})}</div>
<div class="card"><h2>Warping production and time for an order</h2>
${S({title:'Warping production (fabric A)',cols:[300,140],rows:[
[{h:'Warper'},{h:''}],
['Warping speed (yd/min)',{in:'sp',v:800}],
['Efficiency',{in:'ef',v:0.70,fmt:'0%'}],
['Shift (hours)',{in:'sh',v:8}],
['Ends per beam',{in:'epb',v:636.67}],
['Warp count Ne',{in:'ne',v:20}],
['Yards warped per shift',{f:v=>v.sp*60*v.sh*v.ef,n:'yps',fx:'=B2*60*B4*B3',fmt:'#,##0'}],
['Weight warped per shift (lb)',{f:v=>v.yps*v.epb/(840*v.ne),n:'wps',fx:'=B7*B5/(840*B6)',fmt:'#,##0'}],
['Weight warped per hour (lb)',{f:v=>v.wps/v.sh,n:'wph',fx:'=B8/B4',fmt:'#,##0'}],
[{s:'Order',span:2}],
['Fabric ordered (m)',{in:'om',v:20000}],
['Warp contraction',{in:'wc',v:0.10,fmt:'0%'}],
['Total ends in fabric',{in:'te',v:3780}],
['Fabric (yd)',{f:v=>v.om*1.0936,n:'oy',fx:'=B11*1.0936',fmt:'#,##0'}],
['Warp length required (yd)',{f:v=>v.oy*(1+v.wc),n:'wl',fx:'=B14*(1+B12)',fmt:'#,##0'}],
['Warp weight required (lb)',{f:v=>v.wl*v.te/(840*v.ne),n:'ww',fx:'=B15*B13/(840*B6)',fmt:'#,##0',tot:true}],
['Warping time (hours)',{f:v=>v.ww/v.wph,fx:'=B16/B9',fmt:'0.0',tot:true}]
]})}
<div class="note">A 20,000 m order of fabric A needs 5,413 lb of warp and keeps the warper busy for only about 4.3 hours. For a whole loom shed the picture changes: Lecture 10 shows 200 looms need more than one warper.</div></div>`});

lecture({id:'wc07',course:'wc',n:'07',title:'Beam Calculations',sub:'How much yarn fits on a beam — volume of the yarn annulus, packing density, weight, length and the fabric one beam will weave.',chips:['Beam volume','Packing density','Length per beam'],tags:'beam barrel flange volume density',body:()=>`
<div class="card"><h2>Yarn on a beam is a hollow cylinder</h2>
<div class="grid2"><div>
<p>A beam full of yarn is a cylinder of diameter D (the diameter of the beam with yarn) with the barrel of diameter d removed, over the length L between the flanges:</p>
<div class="formula">Yarn volume = π/4 × ( D² − d² ) × L</div>
<p>Yarn packs at a known <b>density</b> — about 56 in³ per lb for a warped (unsized) beam and 60 in³/lb for a sized beam, which is bulkier because of the size film. Weight = volume ÷ density, and then the familiar count relation gives length:</p>
<div class="formula">Length on beam (yd) = weight × 840 × Ne ÷ ends on the beam</div>
</div><div style="text-align:center">
<svg viewBox="0 0 300 200" width="300" height="200"><defs><linearGradient id="bm" x1="0" x2="1"><stop offset="0" stop-color="#d6d3d1"/><stop offset=".5" stop-color="#f5f5f4"/><stop offset="1" stop-color="#a8a29e"/></linearGradient></defs>
<rect x="40" y="30" width="220" height="140" rx="6" fill="url(#bm)" stroke="#78716c"/><rect x="20" y="20" width="20" height="160" fill="#57534e"/><rect x="260" y="20" width="20" height="160" fill="#57534e"/>
<rect x="40" y="85" width="220" height="30" fill="#44403c" opacity=".55"/>
<line x1="150" y1="30" x2="150" y2="170" stroke="#b45309" stroke-width="1.5" stroke-dasharray="4 3"/><text x="156" y="45" font-size="12" fill="#b45309">D = 36"</text><text x="156" y="100" font-size="12" fill="#fff">d = 18"</text>
<line x1="40" y1="188" x2="260" y2="188" stroke="#b45309" stroke-width="1.5"/><text x="150" y="199" font-size="12" text-anchor="middle" fill="#b45309">L = 66" between flanges</text></svg>
</div></div></div>
<div class="card"><h2>Beam worksheet</h2>
${S({title:'Yarn on a beam',cols:[300,120,120],rows:[
[{h:''},{h:'Warper’s beam'},{h:'Sized beam'}],
['Diameter with yarn, D (in)',{in:'D1',v:36},{in:'D2',v:36}],
['Barrel diameter, d (in)',{in:'d1',v:18},{in:'d2',v:18}],
['Length between flanges, L (in)',{in:'L1',v:66},{in:'L2',v:66}],
['Packing density (in³ per lb)',{in:'k1',v:56},{in:'k2',v:60}],
['Ends on the beam',{in:'e1',v:636.67},{in:'e2',v:3820}],
['Count Ne',{in:'n1',v:20},{in:'n2',v:20}],
['Warp contraction (for fabric length)',null,{in:'wc',v:0.10,fmt:'0%'}],
['Volume of full beam (in³)',{f:v=>Math.PI/4*v.D1*v.D1*v.L1,n:'vf1',fx:'=PI()/4*B2^2*B4',fmt:'#,##0'},{f:v=>Math.PI/4*v.D2*v.D2*v.L2,n:'vf2',fx:'=PI()/4*C2^2*C4',fmt:'#,##0'}],
['Volume of barrel (in³)',{f:v=>Math.PI/4*v.d1*v.d1*v.L1,n:'vb1',fx:'=PI()/4*B3^2*B4',fmt:'#,##0'},{f:v=>Math.PI/4*v.d2*v.d2*v.L2,n:'vb2',fx:'=PI()/4*C3^2*C4',fmt:'#,##0'}],
['Volume of yarn (in³)',{f:v=>v.vf1-v.vb1,n:'vy1',fx:'=B9-B10',fmt:'#,##0'},{f:v=>v.vf2-v.vb2,n:'vy2',fx:'=C9-C10',fmt:'#,##0'}],
['Weight of yarn on beam (lb)',{f:v=>v.vy1/v.k1,n:'w1',fx:'=B11/B5',fmt:'#,##0.0',tot:true},{f:v=>v.vy2/v.k2,n:'w2',fx:'=C11/C5',fmt:'#,##0.0',tot:true}],
['Length of yarn on beam (yd)',{f:v=>v.w1*840*v.n1/v.e1,n:'l1',fx:'=B12*840*B7/B6',fmt:'#,##0',tot:true},{f:v=>v.w2*840*v.n2/v.e2,n:'l2',fx:'=C12*840*C7/C6',fmt:'#,##0',tot:true}],
['Fabric from one sized beam (yd)',null,{f:v=>v.l2/(1+v.wc),n:'fy',fx:'=C13/(1+C8)',fmt:'#,##0'}],
['Fabric from one sized beam (m)',null,{f:v=>v.fy/1.0936,fx:'=C14/1.0936',fmt:'#,##0',tot:true}]
]})}
<div class="note">The same beam holds 23,700 yd of a 637-end warper’s beam but only 3,700 yd once all 3,820 ends are sized onto it — about 3,070 m of fabric A per weaver’s beam. The 20,000 m order of Lecture 6 therefore needs about 7 sized beams.</div></div>`});

lecture({id:'wc08',course:'wc',n:'08',title:'Breakages and Sized Count',sub:'Expressing warp breaks per unit length so mills can be compared, and finding the count of yarn after sizing.',chips:['Breaks per 10⁷ m','Sized count','Size add-on'],tags:'breakage breaks sizing count',body:()=>`
<div class="card"><h2>Breaks per 10 million metres</h2>
<p>A warper or sizer reports “one break every 51 lb” — but 51 lb of Ne 21 is a very different length from 51 lb of Ne 10. Convert poundage to yardage with the count and the comparison becomes fair:</p>
<div class="formula">yards per break = Ne × lb per break × 840 &nbsp;&nbsp;·&nbsp;&nbsp; metres = yards ÷ 1.0936 &nbsp;&nbsp;·&nbsp;&nbsp; breaks per 10 million m = 10⁷ ÷ metres per break</div>
${S({title:'Breakage rate',cols:[90,130,140,140,160],rows:[
[{h:'Count Ne'},{h:'lb per break'},{h:'yd per break'},{h:'m per break'},{h:'Breaks / 10 million m'}],
[{in:'a1',v:21},{in:'b1',v:51.14},{f:v=>v.a1*v.b1*840,n:'y1',fx:'=A2*B2*840',fmt:'#,##0'},{f:v=>v.y1/1.0936,n:'m1',fx:'=C2/1.0936',fmt:'#,##0'},{f:v=>1e7/v.m1,fx:'=10000000/D2',fmt:'0.00',tot:true}],
[{in:'a2',v:10},{in:'b2',v:143},{f:v=>v.a2*v.b2*840,n:'y2',fx:'=A3*B3*840',fmt:'#,##0'},{f:v=>v.y2/1.0936,n:'m2',fx:'=C3/1.0936',fmt:'#,##0'},{f:v=>1e7/v.m2,fx:'=10000000/D3',fmt:'0.00',tot:true}],
[{in:'a3',v:20},{in:'b3',v:66},{f:v=>v.a3*v.b3*840,n:'y3',fx:'=A4*B4*840',fmt:'#,##0'},{f:v=>v.y3/1.0936,n:'m3',fx:'=C4/1.0936',fmt:'#,##0'},{f:v=>1e7/v.m3,fx:'=10000000/D4',fmt:'0.00',tot:true}],
[{in:'a4',v:20},{in:'b4',v:84},{f:v=>v.a4*v.b4*840,n:'y4',fx:'=A5*B5*840',fmt:'#,##0'},{f:v=>v.y4/1.0936,n:'m4',fx:'=C5/1.0936',fmt:'#,##0'},{f:v=>1e7/v.m4,fx:'=10000000/D5',fmt:'0.00',tot:true}],
[{in:'a5',v:60},{in:'b5',v:27},{f:v=>v.a5*v.b5*840,n:'y5',fx:'=A6*B6*840',fmt:'#,##0'},{f:v=>v.y5/1.0936,n:'m5',fx:'=C6/1.0936',fmt:'#,##0'},{f:v=>1e7/v.m5,fx:'=10000000/D6',fmt:'0.00',tot:true}]
]})}
<div class="note">The Ne 60 warp breaking every 27 lb (8 breaks per 10 million m) is actually performing <em>better</em> than the Ne 21 warp breaking every 51 lb (12 breaks). Poundage flatters coarse yarns.</div></div>
<div class="card"><h2>Count of sized yarn</h2>
<p>Size adds weight but no length, so the yarn becomes “coarser”. The sized count is needed for loom-side yarn stock calculations and for weight-based selling of fabric.</p>
${S({title:'Sized count',cols:[300,140],rows:[
['Warp count Ne (unsized)',{in:'ne',v:20}],
['Ends on beam',{in:'e',v:8100}],
['Length on beam (yd)',{in:'l',v:3000}],
['Size add-on',{in:'s',v:0.125,fmt:'0.0%'}],
['Unsized warp weight (lb)',{f:v=>v.e*v.l/(840*v.ne),n:'w',fx:'=B2*B3/(840*B1)',fmt:'#,##0.0'}],
['Sized warp weight (lb)',{f:v=>v.w*(1+v.s),n:'ws',fx:'=B5*(1+B4)',fmt:'#,##0.0'}],
['Count of sized warp Ne',{f:v=>v.e*v.l/(840*v.ws),fx:'=B2*B3/(840*B6)',fmt:'0.00',tot:true}]
]})}
<div class="formula">Sized count = Ne ÷ (1 + size add-on) &nbsp;→&nbsp; 20 ÷ 1.125 = 17.8</div></div>`});

lecture({id:'wc09',course:'wc',n:'09',title:'Cone Size',sub:'Matching cone weight to creel capacity: how many bags of yarn one creel can use, and how small a cone a short sample warp needs.',chips:['Creels','Cones per bag','Sample warp'],tags:'cone creel bags sample',body:()=>`
<div class="card"><h2>How many bags can the creel take?</h2>
<p>Yarn arrives in 100 lb bags. A full creel is one set of cones; the number of complete creels you can fill decides how much of the available yarn can be used at once.</p>
${S({title:'Bags per creel',cols:[300,140],rows:[
['Warp count Ne',{in:'ne',v:20}],
['Ends per inch',{in:'epi',v:60}],
['Width (in)',{in:'w',v:63}],
['Selvedge ends',{in:'sel',v:60}],
['Creel capacity',{in:'cr',v:840}],
['Cone size (lb)',{in:'cs',v:4.17}],
['Bags available (100 lb each)',{in:'bags',v:100}],
['Total ends',{f:v=>v.epi*v.w+v.sel,n:'te',fx:'=B2*B3+B4',fmt:'#,##0'}],
['Beams (round up to even)',{f:v=>RUE(v.te/v.cr),n:'bm',fx:'=CEILING(B8/B5,2)',fmt:'0'}],
['Cones per creel (ends per beam)',{f:v=>v.te/v.bm,n:'cpc',fx:'=B8/B9',fmt:'0.0'}],
['Cones available',{f:v=>v.bags*100/v.cs,n:'ca',fx:'=B7*100/B6',fmt:'#,##0'}],
['Complete creels possible',{f:v=>Math.floor(v.ca/v.cpc),n:'cc',fx:'=ROUNDDOWN(B11/B10,0)',fmt:'0',tot:true}],
['Bags actually used',{f:v=>v.cc*v.cpc*v.cs/100,fx:'=B12*B10*B6/100',fmt:'0.0',tot:true}]
]})}
<div class="note">100 bags give 2,398 cones, enough for only 3 full creels of 640 — so 80 bags are used and 20 bags wait for the next lot. Ordering yarn in multiples of the creel requirement avoids these left-overs.</div></div>
<div class="card"><h2>Cone size for a sample warp</h2>
<p>For a short sample the problem is reversed: the cone must carry just enough yarn for the sample length, otherwise most of the cone is wasted.</p>
${S({title:'Sample warp cone size',cols:[300,140],rows:[
['Sample length required (m)',{in:'sm',v:300}],
['Wastage',{in:'wa',v:0.20,fmt:'0%'}],
['Warp contraction',{in:'wc',v:0.10,fmt:'0%'}],
['Beams (creels) to be run',{in:'b',v:6}],
['Warp count Ne',{in:'ne',v:20}],
['Warp length to be warped (m)',{f:v=>v.sm*(1+v.wa)*(1+v.wc),n:'wl',fx:'=B1*(1+B2)*(1+B3)',fmt:'#,##0'}],
['Metres of yarn per lb at this count',{f:v=>v.ne*768.1,n:'mpl',fx:'=B5*768.1  (840 yd = 768.1 m)',fmt:'#,##0'}],
['Cone size needed (lb)',{f:v=>v.wl*v.b/v.mpl,fx:'=B6*B4/B7',fmt:'0.000',tot:true}]
]})}
<p>Each cone must feed one end on every one of the 6 beams, hence the multiplication by the number of beams. The answer (0.15 lb ≈ 70 g) is a tiny cone — sample warps are usually made on a sectional or sample warper for exactly this reason.</p></div>`});

lecture({id:'wc10',course:'wc',n:'10',title:'Warping Speed and Preparatory Capacity',sub:'From drum rpm to yards per shift, the time and weight to fill a warper’s beam, and how many warpers and sizers a loom shed needs.',chips:['Drum speed','Yards per shift','Sizing capacity','Warpers needed'],tags:'warping speed drum capacity sizing',body:()=>`
<div class="card"><h2>Speed of a warping drum</h2>
${S({title:'Warping drum',cols:[300,140],rows:[
['Drum speed (rpm)',{in:'rpm',v:300}],
['Drum diameter (in)',{in:'dia',v:30}],
['Shift (hours)',{in:'sh',v:8}],
['Efficiency',{in:'ef',v:0.80,fmt:'0%'}],
['Revolutions per hour',{f:v=>v.rpm*60,n:'rph',fx:'=B1*60',fmt:'#,##0'}],
['Circumference (in)',{f:v=>Math.PI*v.dia,n:'cir',fx:'=PI()*B2',fmt:'0.00'}],
['Inches per hour',{f:v=>v.rph*v.cir,n:'iph',fx:'=B5*B6',fmt:'#,##0'}],
['Yards per hour',{f:v=>v.iph/36,n:'yph',fx:'=B7/36',fmt:'#,##0'}],
['Yards per shift (100%)',{f:v=>v.yph*v.sh,n:'yps',fx:'=B8*B3',fmt:'#,##0'}],
['Yards per shift at efficiency',{f:v=>v.yps*v.ef,fx:'=B9*B4',fmt:'#,##0',tot:true}]
]})}</div>
<div class="card"><h2>Problem 1 — time to fill a beam</h2>
${S({title:'Beam of 20,500 yd',cols:[300,140],rows:[
['Warping speed (m/min)',{in:'sp',v:900}],
['Efficiency',{in:'ef',v:0.64,fmt:'0%'}],
['Beam length (yd)',{in:'bl',v:20500}],
['Ends on beam',{in:'e',v:800}],
['Count Ne',{in:'ne',v:30}],
['Speed (yd/min)',{f:v=>v.sp*1.0936,n:'spy',fx:'=B1*1.0936',fmt:'#,##0'}],
['Time to fill (min)',{f:v=>v.bl/v.spy/v.ef,fx:'=B3/B6/B2',fmt:'0.0',tot:true}],
['Yarn on beam (yd)',{f:v=>v.bl*v.e,n:'yy',fx:'=B3*B4',fmt:'#,##0'}],
['Weight on beam (lb)',{f:v=>v.yy/(840*v.ne),fx:'=B8/(840*B5)',fmt:'#,##0',tot:true}]
]})}</div>
<div class="card"><h2>Problem 2 — preparatory machines for 200 airjet looms</h2>
<p>200 looms × 500 m/day of 20×16/128×60, 63" is 100,000 m of fabric a day. How many sizing machines and warpers keep them fed?</p>
${S({title:'Warping & sizing capacity',cols:[320,140],rows:[
['Looms',{in:'lm',v:200}],
['Fabric per loom per day (m)',{in:'fpl',v:500}],
['Warp contraction',{in:'wc',v:0.10,fmt:'0%'}],
['Ends per inch',{in:'epi',v:128}],
['Width (in)',{in:'w',v:63}],
['Warper creel capacity',{in:'cr',v:840}],
['Sizing speed (m/min)',{in:'ss',v:100}],
['Sizing efficiency',{in:'se',v:0.75,fmt:'0%'}],
['Warping speed (m/min)',{in:'ws',v:800}],
['Warping efficiency',{in:'we',v:0.75,fmt:'0%'}],
[{s:'Sizing',span:2}],
['Fabric per day (m)',{f:v=>v.lm*v.fpl,n:'fd',fx:'=B1*B2',fmt:'#,##0'}],
['Sized warp needed per day (m)',{f:v=>v.fd*(1+v.wc),n:'sw',fx:'=B12*(1+B3)',fmt:'#,##0'}],
['One sizing machine per day (m)',{f:v=>v.ss*60*24*v.se,n:'sc',fx:'=B7*60*24*B8',fmt:'#,##0'}],
['Sizing machines required',{f:v=>v.sw/v.sc,fx:'=B13/B14',fmt:'0.00',tot:true}],
[{s:'Warping',span:2}],
['Total ends',{f:v=>v.epi*v.w,n:'te',fx:'=B4*B5',fmt:'#,##0'}],
['Warper’s beams per set',{f:v=>RUE(v.te/v.cr),n:'bm',fx:'=CEILING(B17/B6,2)',fmt:'0'}],
['Yarn to be warped per day (m of beam)',{f:v=>v.bm*v.sw,n:'wd',fx:'=B18*B13',fmt:'#,##0'}],
['One warper per day (m)',{f:v=>v.ws*60*24*v.we,n:'wcap',fx:'=B9*60*24*B10',fmt:'#,##0'}],
['Warpers required',{f:v=>v.wd/v.wcap,fx:'=B19/B20',fmt:'0.00',tot:true}]
]})}
<div class="note">One sizing machine almost copes (1.02), but the warper must run 10 beam-lengths for every sized beam, so 1.27 warpers are needed — two warpers, or one warper with a larger creel (fewer beams per set, see Lecture 11).</div></div>`});

lecture({id:'wc11',course:'wc',n:'11',title:'Reed Calculations',sub:'Reed count, dents per inch, the Stockport sett, ends per dent for each weave and the maximum width a creel pair can produce.',chips:['Dents / m','Stockport sett','Ends per dent','Max EPI'],tags:'reed dent sett stockport',body:()=>`
<div class="card"><h2>Reed numbering</h2>
<p>Reeds are numbered by <b>dents per metre</b> (e.g. 1230) or, in the old Stockport system, by dents per two inches — the <b>Stockport sett</b>. With 2 ends in each dent the Stockport number is also the ends per inch in the reed, which is why it survived so long.</p>
<div class="formula">dents per inch = dents/m ÷ 39.37 &nbsp;&nbsp;·&nbsp;&nbsp; Stockport sett = dents per inch × 2 &nbsp;&nbsp;·&nbsp;&nbsp; EPI in fabric = dents/in × ends per dent × (1 + weft contraction)</div>
${S({title:'Reed and sett',cols:[300,130],rows:[
['Reed (dents per metre)',{in:'dpm',v:1230}],
['Weft contraction (width shrinkage on loom)',{in:'wc',v:0.03,fmt:'0.0%'}],
['Fabric width (in)',{in:'fw',v:63}],
['Dents per inch',{f:v=>v.dpm/39.37,n:'dpi',fx:'=B1/39.37',fmt:'0.00'}],
['Stockport sett',{f:v=>v.dpi*2,fx:'=B4*2',fmt:'0.0'}],
['Reed width to be filled (in)',{f:v=>v.fw*(1+v.wc),fx:'=B3*(1+B2)',fmt:'0.00',tot:true}],
[{s:'Ends per inch in fabric by weave',span:2}],
['Plain 1/1 — 2 ends per dent',{f:v=>v.dpi*2*(1+v.wc),fx:'=B4*2*(1+B2)',fmt:'0.0'}],
['Twill 2/1 — 3 ends per dent',{f:v=>v.dpi*3*(1+v.wc),fx:'=B4*3*(1+B2)',fmt:'0.0'}],
['Twill 3/1 — 4 ends per dent',{f:v=>v.dpi*4*(1+v.wc),fx:'=B4*4*(1+B2)',fmt:'0.0'}],
['Satin 4/1 — 2.5 ends per dent (2,3,2,3…)',{f:v=>v.dpi*2.5*(1+v.wc),fx:'=B4*2.5*(1+B2)',fmt:'0.0'}]
]})}
<p>The denting rule is “one repeat (or a simple fraction of it) per dent”: plain weave 2, 2/1 twill 3, 3/1 twill 4. Five-end satins dent alternately 2 and 3. Fewer ends per dent give a cleaner fabric; more ends per dent let a coarse reed weave a dense fabric.</p></div>
<div class="card"><h2>Maximum ends a preparatory pair can handle</h2>
<p>A warper creel of 1,024 cones feeding a sizing creel of 28 beams gives the largest warp the plant can make: 1,024 × 28 = 28,672 ends. That caps either the width or the density:</p>
${S({title:'Maximum width / density',cols:[300,130],rows:[
['Warper creel (cones)',{in:'wcr',v:1024}],
['Sizing creel (beams)',{in:'scr',v:28}],
['Maximum ends',{f:v=>v.wcr*v.scr,n:'me',fx:'=B1*B2',fmt:'#,##0',tot:true}],
['At EPI',{in:'epi',v:200}],
['→ maximum width (in)',{f:v=>v.me/v.epi,fx:'=B3/B4',fmt:'0.0'}],
['At width (in)',{in:'w',v:110}],
['→ maximum EPI',{f:v=>v.me/v.w,fx:'=B3/B6',fmt:'0.0'}]
]})}</div>`});

/* ---- Weaving Calculations, part 2 ---- */
const WDIV=[['Plain 1/1',1],['Filling rib 2/2',1.5],['Warp rib 2/2',1.26],['Panama (hopsack) 2/2',1.4],['Drill 2/1',1.22],['Drill 3/1',1.3],['Twill 2/2',1.34],['Drill 4/1',1.34],['5/1',1.4],['6/1',1.44],['7/1',1.45],['Satin 1/4',1.41],['Satin 1/5',1.51],['Satin 1/6',1.59],['Satin 1/7',1.67],['Satin 1/8',1.73]];
function crimpSVG(d1,d2,title){ // cross-section along the warp: weft circles (d2) spaced p2, warp path wraps them
  const D=d1+d2,th1=Math.acos(1-d2/D),p2=D*Math.sin(th1),h2=D*Math.cos(th1);
  const sc=28/D*2.2,n=5,W=p2*sc*(n-1)+D*sc*1.6,H=(D+h2)*sc+30,ox=D*sc*0.8,oy=H/2;
  let s=`<svg viewBox="0 0 ${W} ${H}" width="${Math.min(W,520)}" style="max-width:100%"><text x="${W/2}" y="14" font-size="12" text-anchor="middle" fill="#374151">${title}</text>`;
  const cs=[];for(let i=0;i<n;i++)cs.push([ox+i*p2*sc,oy+(i%2?1:-1)*h2*sc/2]);
  cs.forEach(c=>s+=`<circle cx="${c[0]}" cy="${c[1]}" r="${d2*sc/2}" fill="#fde68a" stroke="#b45309"/>`);
  // warp path: arcs of radius D/2 about each centre, tangent points at midpoints between centres
  let pts=[];for(let i=0;i<n;i++){const c=cs[i];const pv=i?[(cs[i-1][0]+c[0])/2,(cs[i-1][1]+c[1])/2]:[c[0]-p2*sc/2,c[1]+(i%2?-1:1)*h2*sc/2];const nx=i<n-1?[(cs[i+1][0]+c[0])/2,(cs[i+1][1]+c[1])/2]:[c[0]+p2*sc/2,c[1]+(i%2?-1:1)*h2*sc/2];
    let a0=Math.atan2(pv[1]-c[1],pv[0]-c[0]),a1=Math.atan2(nx[1]-c[1],nx[0]-c[0]);let da=a1-a0;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
    for(let k=0;k<=12;k++){const a=a0+da*k/12;pts.push([c[0]+Math.cos(a)*D*sc/2,c[1]+Math.sin(a)*D*sc/2]);}}
  s+=`<path d="M${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join('L')}" fill="none" stroke="#1e3a8a" stroke-width="${d1*sc}" stroke-linecap="round" opacity=".85"/>`;
  s+=`<line x1="${cs[1][0]}" x2="${cs[2][0]}" y1="${H-8}" y2="${H-8}" stroke="#374151"/><text x="${(cs[1][0]+cs[2][0])/2}" y="${H-12}" font-size="11" text-anchor="middle" fill="#374151">p₂ = ${(p2/d1).toFixed(3)} d₁</text></svg>`;
  return s;
}
lecture({id:'wc12',course:'wc',n:'12–13',title:'Cover Factor I & II',sub:'How much of the cloth area the yarns actually cover, the Ne cover factor used in mills, and the airjet weavability limits with weave corrections.',chips:['Relative cover','K = n√tex','Ne cover factor','Weavability'],tags:'cover factor weavability airjet density',body:()=>`
<div class="card"><h2>Relative cover</h2>
<p>The fraction of the cloth area covered by the threads of one set is <b>d / p</b> — yarn diameter over thread spacing. If the diameter is derived from the count (Lecture FD-12: d in mm = √tex ÷ 26.7, assuming a packed specific volume of 1.1 cm³/g), relative cover can be written entirely in terms of count and density:</p>
<div class="formula">cover = d/p = ( n / 100 mm ) × √tex ÷ 2670 &nbsp;&nbsp;⇒&nbsp;&nbsp; K = n √tex, maximum 2670 (threads touching)</div>
<p>Example from the lecture: 25 tex at 267 threads/100 mm gives K = 1335, relative cover 0.50; 36 tex at 334/100 mm gives K = 2004, cover 0.75. Cloth cover combines the two sets: C = C₁ + C₂ − C₁C₂ = 0.50 + 0.75 − 0.375 = 0.875 ≈ 0.88.</p></div>
<div class="card"><h2>The mill version: K(Ne) = EPI/√Ne<sub>warp</sub> + PPI/√Ne<sub>weft</sub></h2>
<p>With English counts the same idea becomes threads per inch divided by √Ne (the diameter in inches is about 1/(28√Ne)). The maximum for one set is about 28 — at that value the threads of that set touch side by side (relative cover 1).</p>
${S({title:'Cover factor (Ne)',cols:[260,120,120],rows:[
[{h:''},{h:'Warp'},{h:'Weft'}],
['Count Ne',{in:'nw',v:20},{in:'nf',v:20}],
['Threads per inch',{in:'e',v:108},{in:'p',v:56}],
['Weave',{in:'wv',v:'Plain 1/1',opts:WDIV.map(x=>x[0])},null],
['Cover factor (threads / √Ne)',{f:v=>v.e/Math.sqrt(v.nw),n:'kw',fx:'=B3/SQRT(B2)',fmt:'0.00'},{f:v=>v.p/Math.sqrt(v.nf),n:'kf',fx:'=C3/SQRT(C2)',fmt:'0.00'}],
['Relative cover (K ÷ 28)',{f:v=>v.kw/28,fx:'=B5/28',fmt:'0.0%'},{f:v=>v.kf/28,fx:'=C5/28',fmt:'0.0%'}],
['Total cover factor',{f:v=>v.kw+v.kf,n:'kt',fx:'=B5+C5',fmt:'0.00',tot:true},null],
['Weave divisor',{f:v=>WDIV.find(x=>x[0]===v.wv)[1],n:'dv',fx:'from the weave table',fmt:'0.00'},null],
['Plain-equivalent cover factor',{f:v=>v.kt/v.dv,fx:'=B7/B8',fmt:'0.00',tot:true},null],
['Cloth cover C₁+C₂−C₁C₂',{f:v=>{const a=Math.min(1,v.kw/28),b=Math.min(1,v.kf/28);return a+b-a*b;},fx:'=B6+C6-B6*C6',fmt:'0.0%'},null]
]})}
<div class="note">20×20/108×56 gives 24.1 + 12.5 = 36.7 — right at the weavability limit of a 75" airjet loom. Non-plain weaves interlace less often and can be woven denser; dividing by the weave factor converts them to a plain-weave equivalent before comparing with the limits below.</div></div>
<div class="card"><h2>Weavability limits (airjet) and weave factors</h2>
<div class="grid2"><div>
<table class="plain"><tr><th>Loom width</th><th>Standard total cover</th><th>Upper limit</th></tr>
<tr><td>75"</td><td class="r">36</td><td class="r">37.5</td></tr><tr><td>110"</td><td class="r">28</td><td class="r">32</td></tr><tr><td>134"</td><td class="r">25</td><td class="r">32</td></tr></table>
<p>Wider looms insert the pick over a longer distance, so they tolerate less cover: a construction that weaves comfortably at 75" may be unweavable at 134".</p></div>
<div><table class="plain"><tr><th>Weave</th><th class="r">Divide K by</th></tr>${WDIV.slice(1).map(x=>`<tr><td>${x[0]}</td><td class="r">${x[1]}</td></tr>`).join('')}</table></div></div></div>`});

lecture({id:'wc13',course:'wc',n:'14',title:'Fabric Production',sub:'Loom output per day from rpm, picks and efficiency; then warp and weft bags for an order, loom-days and daily yarn consumption.',chips:['Loom production','A-grade','Bags per order','Loom-days'],tags:'production rpm efficiency bags order',body:()=>`
<div class="card"><h2>From picks per minute to metres per day</h2>
<div class="formula">inches per minute = rpm × efficiency ÷ PPI &nbsp;&nbsp;·&nbsp;&nbsp; yards per day = in/min × 1440 ÷ 36</div>
<p>Then A-grade is what sells: subtract the B-grade percentage. Yarn consumption includes contraction <em>and</em> wastage (warp 3%, weft 5.6%) and is inflated by the B-grade rejection, because the rejected metres consumed yarn too.</p>
${S({title:'Loom production and yarn for an order',cols:[320,130],rows:[
[{s:'Construction 20×20 / 60×60, 63", plain',span:2}],
['Warp count Ne',{in:'nw',v:20}],['Weft count Ne',{in:'nf',v:20}],['Ends per inch',{in:'epi',v:60}],['Picks per inch',{in:'ppi',v:60}],['Width (in)',{in:'w',v:63}],
['Warp contraction',{in:'wc',v:0.10,fmt:'0%'}],['Weft contraction',{in:'fc',v:0.05,fmt:'0%'}],['Warp wastage',{in:'ww',v:0.03,fmt:'0.0%'}],['Weft wastage',{in:'fw',v:0.056,fmt:'0.0%'}],['B-grade',{in:'bg',v:0.01,fmt:'0.0%'}],
[{s:'Loom',span:2}],
['Loom speed (rpm)',{in:'rpm',v:800}],['Efficiency',{in:'ef',v:0.90,fmt:'0%'}],
['Inches per minute',{f:v=>v.rpm*v.ef/v.ppi,n:'ipm',fx:'=B13*B14/B5',fmt:'0.00'}],
['Yards per day (24 h)',{f:v=>v.ipm*1440/36,n:'ypd',fx:'=B15*1440/36',fmt:'#,##0.0'}],
['A-grade yards per day',{f:v=>v.ypd*(1-v.bg),n:'apd',fx:'=B16*(1-B11)',fmt:'#,##0.0'}],
['A-grade metres per day',{f:v=>v.apd/1.0936,n:'mpd',fx:'=B17/1.0936',fmt:'#,##0.0',tot:true}],
[{s:'Yarn per unit of A-grade fabric',span:2}],
['Warp lb per yard',{f:v=>v.epi*v.w*(1+v.wc+v.ww)/(840*v.nw)/(1-v.bg),n:'wpy',fx:'=B4*B6*(1+B7+B9)/(840*B2)/(1-B11)',fmt:'0.0000'}],
['Weft lb per yard',{f:v=>v.ppi*36*(v.w/36)*(1+v.fc+v.fw)/(840*v.nf)/(1-v.bg),n:'fpy',fx:'=B5*36*(B6/36)*(1+B8+B10)/(840*B3)/(1-B11)',fmt:'0.0000'}],
['Warp lb per metre',{f:v=>v.wpy*1.0936,n:'wpm',fx:'=B20*1.0936',fmt:'0.0000'}],
['Weft lb per metre',{f:v=>v.fpy*1.0936,n:'fpm',fx:'=B21*1.0936',fmt:'0.0000'}],
[{s:'Order',span:2}],
['Order quantity (m)',{in:'om',v:20000}],['Looms allotted',{in:'lm',v:4}],
['Warp bags (100 lb)',{f:v=>v.om*v.wpm/100,fx:'=B25*B22/100',fmt:'0.00',tot:true}],
['Weft bags (100 lb)',{f:v=>v.om*v.fpm/100,fx:'=B25*B23/100',fmt:'0.00',tot:true}],
['Days to complete',{f:v=>v.om/(v.mpd*v.lm),fx:'=B25/(B18*B26)',fmt:'0.00',tot:true}],
['Bags consumed per day (all looms)',{f:v=>(v.wpm+v.fpm)*v.mpd*v.lm/100,fx:'=(B22+B23)*B18*B26/100',fmt:'0.00'}]
]})}
<div class="note">Four looms at 800 rpm finish 20,000 m in 11.5 days and eat about 9.7 bags of yarn a day — a figure the yarn store needs long before the looms start (Planning III).</div></div>`});

lecture({id:'wc14',course:'wc',n:'15–16',title:'Crimp I & II – Peirce Geometry',sub:'Why yarns are longer than the cloth they make: the jammed plain weave with equal and unequal yarns, and the warp rib.',chips:['Jammed structure','θ, p, l, h','Crimp %','Cover 1542 / 1955'],tags:'crimp peirce geometry jammed',body:()=>`
<div class="card"><h2>The jammed plain weave</h2>
<p>Peirce modelled a yarn in cloth as a circular cross-section following arcs around the crossing threads. When the threads touch — the <b>jammed</b> state — the yarn has no straight portion; it is all arc. With D = d₁ + d₂ (sum of diameters), the thread spacing p, yarn length l per repeat and crimp height h depend only on the angle θ at which the yarn leaves the crossing thread:</p>
<div class="formula">p = D sin θ &nbsp;&nbsp;·&nbsp;&nbsp; l = D θ &nbsp;&nbsp;·&nbsp;&nbsp; h = D (1 − cos θ) &nbsp;&nbsp;·&nbsp;&nbsp; h₁ + h₂ = D &nbsp;&nbsp;·&nbsp;&nbsp; crimp = l / p − 1</div>
<div class="grid2">
<div>${crimpSVG(1,1,'Equal yarns: θ = 60°, p = 1.732 d, l = 2.094 d')}</div>
<div>${crimpSVG(1,2,'Weft twice as thick (d₂ = 2 d₁)')}</div></div>
<p>In the drawings the yellow circles are the picks seen end-on and the blue thread is a warp end wrapping them. Edit the diameters below to see every quantity change.</p></div>
<div class="card"><h2>Crimp calculator</h2>
${S({title:'Jammed plain weave geometry (lengths in units of d₁)',cols:[300,120,120],rows:[
[{h:''},{h:'Warp (1)'},{h:'Weft (2)'}],
['Diameter d',{in:'d1',v:1},{in:'d2',v:1}],
['D = d₁ + d₂',{f:v=>v.d1+v.d2,n:'D',fx:'=B2+C2',fmt:'0.000'},null],
['Crimp height h (= other yarn’s diameter when jammed)',{f:v=>v.d2,n:'h1',fx:'=C2',fmt:'0.000'},{f:v=>v.d1,n:'h2',fx:'=B2',fmt:'0.000'}],
['Angle θ (degrees)',{f:v=>Math.acos(1-v.h1/v.D)*180/Math.PI,n:'t1',fx:'=ACOS(1-B4/B3)',fmt:'0.0'},{f:v=>Math.acos(1-v.h2/v.D)*180/Math.PI,n:'t2',fx:'=ACOS(1-C4/B3)',fmt:'0.0'}],
['Thread spacing p (warp spacing uses θ₂, weft spacing θ₁)',{f:v=>v.D*Math.sin(v.t2*Math.PI/180),n:'p1',fx:'=B3*SIN(C5)',fmt:'0.000'},{f:v=>v.D*Math.sin(v.t1*Math.PI/180),n:'p2',fx:'=B3*SIN(B5)',fmt:'0.000'}],
['Yarn length per crossing l = Dθ',{f:v=>v.D*v.t1*Math.PI/180,n:'l1',fx:'=B3*RADIANS(B5)',fmt:'0.000'},{f:v=>v.D*v.t2*Math.PI/180,n:'l2',fx:'=B3*RADIANS(C5)',fmt:'0.000'}],
['Crimp % = l ÷ (spacing of the crossing threads) − 1',{f:v=>v.l1/v.p2-1,fx:'=B7/C6-1',fmt:'0.0%',tot:true},{f:v=>v.l2/v.p1-1,fx:'=C7/B6-1',fmt:'0.0%',tot:true}],
['Cover factor K = 2670 × d / p',{f:v=>2670*v.d1/v.p1,fx:'=2670*B2/B6',fmt:'#,##0',tot:true},{f:v=>2670*v.d2/v.p2,fx:'=2670*C2/C6',fmt:'#,##0',tot:true}]
]})}
<div class="note">Equal yarns: θ = 60°, crimp 20.9% in both directions and K = 1542 — the densest plain square cloth that can be woven. With d₂ = 2d₁ the fine warp must climb over the thick weft and takes about 31% crimp while the weft needs about 13%; the cover factors become 1194 and 1888 (lecture figures 29.5% / 12.2% with rounded angles).</div></div>
<div class="card"><h2>Twill and warp rib</h2>
<div class="grid2"><div><h3>2/2 twill, equal yarns</h3><p>Each thread interlaces only after every second crossing thread, so the modular length — half of the four-thread repeat — spans 2p = 2.732 d (one jammed arc plus a straight float of length d): K = 2670 × 2 ÷ 2.732 = <b>1955</b>. Yarn length per repeat l = 3.09 d, crimp = 3.09 ÷ 2.732 − 1 = <b>13.1%</b>. Twills are less crimped and can be set denser than plain weave — the reason for the weave divisors in Lecture 12.</p></div>
<div><h3>Warp rib</h3><p>With the weft twice as thick as the warp (d₂ = 2d₁), warp ends lie side by side (p₁ = d₁, K₁ = 2670) and each passes over two picks. The weft spacing is 1.5 d₂ (K₂ ≈ 1760), the warp wraps a half circle of diameter 3d₁: l₁ = 4.71 d₁ over 3 d₁ of cloth, so warp crimp is about <b>57%</b> while the straight weft has none. That is why rib fabrics use so much more warp yarn than their weight suggests.</p></div></div>
<p>Flattened (non-circular) yarns cover more width than the circular model predicts: real plain cloths look fully covered at K ≈ 1000–1400 rather than 1542.</p></div>`});

lecture({id:'wc17',course:'wc',n:'17',title:'Blended Fabrics – Fibre Composition',sub:'Percentage of each fibre in a fabric whose warp and weft are different blends, and the elastane content of a core-spun yarn.',chips:['Fibre %','Cotton / polyester','Lycra core-spun','Draft'],tags:'blend composition lycra elastane polyester',body:()=>`
<div class="card"><h2>Composition from yarn weights</h2>
<p>The fabric label must state the fibre content by weight. Compute the warp and weft weight per yard exactly as in Lecture 5, then apportion each by its blend.</p>
${S({title:'Cotton / polyester fabric',cols:[300,120,120],rows:[
[{h:''},{h:'Warp'},{h:'Weft'}],
['Count Ne',{in:'nw',v:20},{in:'nf',v:20}],
['Threads per inch',{in:'e',v:60},{in:'p',v:60}],
['Width (in)',{in:'w',v:63},null],
['Contraction',{in:'wc',v:0.10,fmt:'0%'},{in:'fc',v:0.05,fmt:'0%'}],
['Cotton share of this yarn',{in:'cw',v:1,fmt:'0%'},{in:'cf',v:0.65,fmt:'0%'}],
['Weight per yard of fabric (lb)',{f:v=>v.e*v.w*(1+v.wc)/(840*v.nw),n:'ww',fx:'=B3*B4*(1+B5)/(840*B2)',fmt:'0.0000'},{f:v=>v.p*36*(v.w/36)*(1+v.fc)/(840*v.nf),n:'wf',fx:'=C3*36*(B4/36)*(1+C5)/(840*C2)',fmt:'0.0000'}],
['Cotton (lb)',{f:v=>v.ww*v.cw,n:'c1',fx:'=B7*B6',fmt:'0.0000'},{f:v=>v.wf*v.cf,n:'c2',fx:'=C7*C6',fmt:'0.0000'}],
['Polyester (lb)',{f:v=>v.ww*(1-v.cw),n:'p1',fx:'=B7*(1-B6)',fmt:'0.0000'},{f:v=>v.wf*(1-v.cf),n:'p2',fx:'=C7*(1-C6)',fmt:'0.0000'}],
[{t:'<b>Fabric composition</b>'},{f:v=>(v.c1+v.c2)/(v.ww+v.wf),fx:'=(B8+C8)/(B7+C7)  cotton',fmt:'0.0%',tot:true},{f:v=>(v.p1+v.p2)/(v.ww+v.wf),fx:'=(B9+C9)/(B7+C7)  polyester',fmt:'0.0%',tot:true}]
]})}
<div class="note">An all-cotton warp with a 65/35 cotton-polyester weft gives a fabric of about 83% cotton / 17% polyester — because the warp carries more than half the weight.</div></div>
<div class="card"><h2>Lycra in a core-spun yarn</h2>
<p>A core-spun stretch yarn wraps cotton around an elastane (Lycra) filament. The filament is fed under <b>draft</b> (stretched 3.9–4.2 times), so only 1/draft of its nominal denier ends up per unit length — then it retracts a little after spinning (<b>residual shrinkage</b>, 6%), which raises its denier in the yarn by the same percentage. The denier of the whole yarn is 5315 ÷ Ne.</p>
${S({title:'Elastane content of core-spun yarns',cols:[300,120,120],rows:[
[{h:''},{h:'Yarn A'},{h:'Yarn B'}],
['Yarn count Ne',{in:'na',v:30},{in:'nb',v:20}],
['Lycra filament (denier)',{in:'la',v:40},{in:'lb',v:70}],
['Draft on Lycra',{in:'da',v:3.86},{in:'db',v:4.2}],
['Residual shrinkage',{in:'sa',v:0.06,fmt:'0%'},{in:'sb',v:0.06,fmt:'0%'}],
['Denier of the yarn (5315 ÷ Ne)',{f:v=>5315/v.na,n:'ya',fx:'=5315/B2',fmt:'0.00'},{f:v=>5315/v.nb,n:'yb',fx:'=5315/C2',fmt:'0.00'}],
['Lycra denier in the yarn',{f:v=>v.la/v.da*(1+v.sa),n:'ia',fx:'=B3/B4*(1+B5)',fmt:'0.00'},{f:v=>v.lb/v.db*(1+v.sb),n:'ib',fx:'=C3/C4*(1+C5)',fmt:'0.00'}],
[{t:'<b>Lycra % in yarn</b>'},{f:v=>v.ia/v.ya,n:'pa',fx:'=B7/B6',fmt:'0.00%',tot:true},{f:v=>v.ib/v.yb,n:'pb',fx:'=C7/C6',fmt:'0.00%',tot:true}],
[{s:'Fabric: cotton warp (lb/yd) + core-spun weft (lb/yd)',span:3}],
['Warp weight per yard (100% cotton)',{in:'wwt',v:0.2475},null],
['Weft weight per yard (core-spun yarn B)',{in:'fwt',v:0.236},null],
['Fabric Lycra %',{f:v=>v.fwt*v.pb/(v.wwt+v.fwt),fx:'=B11*C8/(B10+B11)',fmt:'0.0%',tot:true},null],
['Fabric cotton %',{f:v=>1-v.fwt*v.pb/(v.wwt+v.fwt),fx:'=1-B12',fmt:'0.0%',tot:true},null]
]})}
<div class="note">A 70-denier Lycra drafted 4.2× contributes 17.7 denier to an Ne 20 yarn — 6.65% of the yarn, and only about 3.2% of the fabric once the all-cotton warp is counted. Stretch fabrics are labelled “97% cotton 3% elastane” for exactly this reason.</div></div>`});

lecture({id:'wc18',course:'wc',n:'18',title:'Sizing Cost Analysis',sub:'Relating sizing cost per kilogram to warp count across many articles, and forecasting the cost of a new count with linear and quadratic trends.',chips:['Regression','FORECAST','Trend line','Cost per kg'],tags:'sizing cost regression forecast trend',body:()=>`
<div class="card"><h2>Why sizing cost rises with count</h2>
<p>Finer warps have more length per kilogram and so more surface to coat, need higher size add-on and run slower on the sizing machine, so the cost of sizing one kilogram of warp climbs steeply with Ne. The lecture tabulated the sizing cost of 41 articles against their warp count and fitted a trend to it. A representative selection of those points is loaded below — type your own figures over them.</p>
${S({title:'Sizing cost vs warp count',cols:[90,130,90,130,90,130],rows:[
[{h:'Warp Ne'},{h:'Rs / kg'},{h:'Warp Ne'},{h:'Rs / kg'},{h:'Warp Ne'},{h:'Rs / kg'}],
[{in:'x1',v:7},{in:'y1',v:4.65},{in:'x6',v:16},{in:'y6',v:5.32},{in:'x11',v:20},{in:'y11',v:6.58}],
[{in:'x2',v:9.75},{in:'y2',v:5.13},{in:'x7',v:16},{in:'y7',v:5.61},{in:'x12',v:30},{in:'y12',v:7.95}],
[{in:'x3',v:10},{in:'y3',v:4.98},{in:'x8',v:19.5},{in:'y8',v:6},{in:'x13',v:30},{in:'y13',v:8.13}],
[{in:'x4',v:14},{in:'y4',v:4.81},{in:'x9',v:20},{in:'y9',v:5.11},{in:'x14',v:40},{in:'y14',v:8.31}],
[{in:'x5',v:14.67},{in:'y5',v:5.5},{in:'x10',v:20},{in:'y10',v:5.81},{in:'x15',v:40},{in:'y15',v:9.63}],
[{s:'Fits (least squares over the 15 points)',span:6}],
['Forecast at Ne',{in:'fx',v:40},null,null,null,null],
['Linear slope',{f:v=>{const P=[];for(let i=1;i<=15;i++)P.push([v['x'+i],v['y'+i]]);const n=P.length,sx=P.reduce((a,p)=>a+p[0],0),sy=P.reduce((a,p)=>a+p[1],0),sxx=P.reduce((a,p)=>a+p[0]*p[0],0),sxy=P.reduce((a,p)=>a+p[0]*p[1],0);const b=(n*sxy-sx*sy)/(n*sxx-sx*sx);v.lin_a=(sy-b*sx)/n;return b;},n:'lin_b',fx:'=SLOPE(y,x)',fmt:'0.0000'},'Intercept',{f:v=>v.lin_a,fx:'=INTERCEPT(y,x)',fmt:'0.0000'},'Linear forecast',{f:v=>v.lin_a+v.lin_b*v.fx,fx:'=FORECAST(B8,y,x)',fmt:'0.00',tot:true}],
['Quadratic a (x²)',{f:v=>{const P=[];for(let i=1;i<=15;i++)P.push([v['x'+i],v['y'+i]]);const S=(k)=>P.reduce((a,p)=>a+Math.pow(p[0],k),0),T=(k)=>P.reduce((a,p)=>a+Math.pow(p[0],k)*p[1],0);const M=[[S(4),S(3),S(2)],[S(3),S(2),S(1)],[S(2),S(1),P.length]],R=[T(2),T(1),T(0)];const det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);const d=det(M);const sub=(i)=>M.map((r,ri)=>r.map((c,ci)=>ci===i?R[ri]:c));v.q_a=det(sub(0))/d;v.q_b=det(sub(1))/d;v.q_c=det(sub(2))/d;return v.q_a;},fx:'=LINEST(y,x^{1,2})',fmt:'0.00000'},'b (x)',{f:v=>v.q_b,fx:'',fmt:'0.0000'},'c',{f:v=>v.q_c,fx:'',fmt:'0.0000'}],
['Quadratic forecast',{f:v=>v.q_a*v.fx*v.fx+v.q_b*v.fx+v.q_c,fx:'=a*x²+b*x+c',fmt:'0.00',tot:true},null,null,null,null]
]})}
<div class="note">The lecture’s full table gave a linear FORECAST of 9.15 Rs/kg at Ne 40 and a quadratic trend 0.0027x² + 0.0172x + 4.4432 → 9.45. The quadratic fits the upward curve better; the straight line under-estimates the cost at both ends of the range (Ne 7–10 and beyond Ne 40) and over-estimates it for the middle counts. Both fits include the double-pick article at 11.64 Rs/kg.</div></div>
<div class="card"><h2>Trend lines from the lecture</h2>
${CH({w:600,h:320,xl:'Warp count Ne',yl:'Sizing cost Rs / kg',xmin:5,xmax:45,ymin:4,ymax:11,yfmt:'0.0',xfmt:'0',series:[
{pts:Array.from({length:9},(_,i)=>{const x=5+i*5;return [x,0.0027*x*x+0.0172*x+4.4432];}),color:'#b45309',label:'quadratic'},
{pts:[[5,3.75],[45,9.92]],color:'#64748b',label:'linear'}],
marks:[[7,4.65],[10,4.9],[12,5.05],[16,5.2],[20,5.1],[20,6.1],[20,6.58],[24,6.9],[26,7.3],[30,7.95],[30,8.13],[32,8.4],[40,8.31],[40,8.9],[40,9.63]].map(p=>({x:p[0],y:p[1],color:'#1e3a8a',label:''}))})}</div>`});

lecture({id:'wc19',course:'wc',n:'19–21',title:'Planning I, II & III – Orders, Changeovers and Yarn',sub:'The booking-and-shipping schedule: daily production per quality, days required, finish and dispatch dates, loom changeovers and the yarn each day of the plan consumes.',chips:['Loom plan','Lateness','Changeover','Yarn working','Bags per day'],tags:'planning orders schedule changeover yarn requirement booking',body:()=>`
<div class="card"><h2>Planning I — the loom plan</h2>
<p>Every booked quality gets a row: its construction, the looms assigned, their speed and efficiency, the A-grade percentage, and the quantity. From these the plan computes daily output, the days needed, and — counting from the start date — the finish, packing (+2 days), arrival in Karachi (+4 days) and the dispatch deadline (vessel date − 4 days). <b>Late</b> is finish − dispatch + 2: negative numbers mean the order is safe.</p>
<div class="formula">daily yards = Σ ( rpm × widths × looms × 24 × 60 ) ÷ 36 ÷ PPI × efficiency × A%</div>
${S({title:'Loom plan (dates as day numbers)',cols:[150,70,60,60,60,70,70,90,80,60,60,70,70,80,80,70],rows:[
[{h:'Quality'},{h:'PPI'},{h:'Eff'},{h:'A %'},{h:'RPM'},{h:'Widths'},{h:'Looms'},{h:'Qty (m)'},{h:'Daily yd'},{h:'Days'},{h:'Start'},{h:'Finish'},{h:'Packed'},{h:'In Karachi'},{h:'Vessel'},{h:'Late'}],
['60×60/161×114, 68", 4/1',{in:'p1',v:114},{in:'e1',v:0.92,fmt:'0%'},{in:'a1',v:0.98,fmt:'0%'},{in:'r1',v:800},{in:'w1',v:1},{in:'l1',v:6},{in:'q1',v:60000},{f:v=>v.r1*v.w1*v.l1*1440/36/v.p1*v.e1*v.a1,n:'d1',fx:'=E2*F2*G2*24*60/36/B2*C2*D2',fmt:'#,##0'},{f:v=>v.q1*1.0936/v.d1,n:'n1',fx:'=H2*1.0936/I2',fmt:'0.0'},{in:'s1',v:1},{f:v=>v.s1+Math.max(v.n1-1,0),n:'f1',fx:'=K2+MAX(J2-1,0)',fmt:'0.0'},{f:v=>v.f1+2,fx:'=L2+2',fmt:'0.0'},{f:v=>v.f1+6,fx:'=M2+4',fmt:'0.0'},{in:'v1',v:52},{f:v=>v.f1-(v.v1-4)+2,fx:'=L2-(O2-4)+2',fmt:'0.0',tot:true}],
['60×60/161×114, 68", 4/1 (2nd lot)',{in:'p2',v:114},{in:'e2',v:0.92,fmt:'0%'},{in:'a2',v:0.98,fmt:'0%'},{in:'r2',v:800},{in:'w2',v:1},{in:'l2',v:4},{in:'q2',v:40000},{f:v=>v.r2*v.w2*v.l2*1440/36/v.p2*v.e2*v.a2,n:'d2',fx:'=E3*F3*G3*24*60/36/B3*C3*D3',fmt:'#,##0'},{f:v=>v.q2*1.0936/v.d2,n:'n2',fx:'=H3*1.0936/I3',fmt:'0.0'},{f:v=>v.f1+1,n:'s2',fx:'=L2+1 (follows lot 1)',fmt:'0.0'},{f:v=>v.s2+Math.max(v.n2-1,0),n:'f2',fx:'=K3+MAX(J3-1,0)',fmt:'0.0'},{f:v=>v.f2+2,fx:'=L3+2',fmt:'0.0'},{f:v=>v.f2+6,fx:'=M3+4',fmt:'0.0'},{in:'v2',v:99},{f:v=>v.f2-(v.v2-4)+2,fx:'=L3-(O3-4)+2',fmt:'0.0',tot:true}],
['60×60/161×114, 98", 4/1',{in:'p3',v:114},{in:'e3',v:0.92,fmt:'0%'},{in:'a3',v:0.98,fmt:'0%'},{in:'r3',v:600},{in:'w3',v:1},{in:'l3',v:6},{in:'q3',v:12500},{f:v=>v.r3*v.w3*v.l3*1440/36/v.p3*v.e3*v.a3,n:'d3',fx:'=E4*F4*G4*24*60/36/B4*C4*D4',fmt:'#,##0'},{f:v=>v.q3*1.0936/v.d3,n:'n3',fx:'=H4*1.0936/I4',fmt:'0.0'},{in:'s3',v:1},{f:v=>v.s3+Math.max(v.n3-1,0),n:'f3',fx:'=K4+MAX(J4-1,0)',fmt:'0.0'},{f:v=>v.f3+2,fx:'=L4+2',fmt:'0.0'},{f:v=>v.f3+6,fx:'=M4+4',fmt:'0.0'},{in:'v3',v:42},{f:v=>v.f3-(v.v3-4)+2,fx:'=L4-(O4-4)+2',fmt:'0.0',tot:true}],
['60×60/161×114, 114", 4/1',{in:'p4',v:114},{in:'e4',v:0.92,fmt:'0%'},{in:'a4',v:0.98,fmt:'0%'},{in:'r4',v:500},{in:'w4',v:1},{in:'l4',v:8},{in:'q4',v:30000},{f:v=>v.r4*v.w4*v.l4*1440/36/v.p4*v.e4*v.a4,n:'d4',fx:'=E5*F5*G5*24*60/36/B5*C5*D5',fmt:'#,##0'},{f:v=>v.q4*1.0936/v.d4,n:'n4',fx:'=H5*1.0936/I5',fmt:'0.0'},{in:'s4',v:10},{f:v=>v.s4+Math.max(v.n4-1,0),n:'f4',fx:'=K5+MAX(J5-1,0)',fmt:'0.0'},{f:v=>v.f4+2,fx:'=L5+2',fmt:'0.0'},{f:v=>v.f4+6,fx:'=M5+4',fmt:'0.0'},{in:'v4',v:60},{f:v=>v.f4-(v.v4-4)+2,fx:'=L5-(O5-4)+2',fmt:'0.0',tot:true}]
]})}
<div class="note">In the original workbook the Days cell rounds to the nearest half day and the rows are chained so that the next lot starts the day after the previous one finishes (the 2nd lot here). Positive “Late” values are the planner’s alarm: add looms, raise speed or negotiate the vessel.</div></div>
<div class="card"><h2>Planning II — loom changeovers</h2>
<p>A second sheet lists, for every calendar day, how many looms run each quality. When a lot finishes its looms are re-beamed — a changeover takes a day or more — and the daily total must never exceed the looms in the shed. The pattern below is the kind of allocation the workbook produces for the four qualities above (looms per day):</p>
<table class="plain"><tr><th>Day</th><th class="r">1</th><th class="r">5</th><th class="r">10</th><th class="r">20</th><th class="r">30</th><th class="r">40</th><th class="r">50</th><th class="r">60</th></tr>
<tr><td>68" lot 1</td><td class="r">6</td><td class="r">6</td><td class="r">6</td><td class="r">6</td><td class="r">6</td><td class="r">6</td><td class="r">–</td><td class="r">–</td></tr>
<tr><td>68" lot 2</td><td class="r">–</td><td class="r">–</td><td class="r">–</td><td class="r">–</td><td class="r">–</td><td class="r">–</td><td class="r">4</td><td class="r">4</td></tr>
<tr><td>98"</td><td class="r">6</td><td class="r">6</td><td class="r">6</td><td class="r">–</td><td class="r">–</td><td class="r">–</td><td class="r">–</td><td class="r">–</td></tr>
<tr><td>114"</td><td class="r">–</td><td class="r">–</td><td class="r">8</td><td class="r">8</td><td class="r">8</td><td class="r">–</td><td class="r">–</td><td class="r">–</td></tr>
<tr><th>Total running</th><th class="r">12</th><th class="r">12</th><th class="r">20</th><th class="r">14</th><th class="r">14</th><th class="r">6</th><th class="r">4</th><th class="r">4</th></tr></table>
<p>Idle looms on days 20–60 are the opportunity for new bookings — Planning IV takes this up with a month-long simulation.</p></div>
<div class="card"><h2>Planning III — yarn working</h2>
<p>The yarn sheet converts each quality into warp and weft pounds per yard and, with the adjusted loom speed, into production and bags per loom per day. Multiplying by the looms running each day (from the changeover sheet) gives the daily warp and weft requirement, which is summed by month and compared with yarn already booked.</p>
<div class="formula">warp lb/yd = ends × width × (1 + crimp) ÷ (840 × Ne) &nbsp;&nbsp;·&nbsp;&nbsp; production yd/day = rpm × eff × 1440 ÷ (PPI × 36) × widths</div>
${S({title:'Yarn working — per loom per day',cols:[150,60,60,60,60,60,70,70,90,90,70,60,90,90,90],rows:[
[{h:'Quality'},{h:'Warp'},{h:'Weft'},{h:'Ends'},{h:'Picks'},{h:'Width'},{h:'Wp crimp'},{h:'Wf crimp'},{h:'Wp lb/yd'},{h:'Wf lb/yd'},{h:'RPM'},{h:'Eff'},{h:'Prod yd'},{h:'Warp bags'},{h:'Weft bags'}],
...[[68,0.09,800],[98,0.09,600],[114,0.06,500],[122,0.06,500]].map((r,i)=>{const k=i+1;return [`60×60/161×114, ${r[0]}"`,{in:'a'+k,v:60},{in:'b'+k,v:60},{in:'c'+k,v:161},{in:'d'+k,v:114},{in:'e'+k,v:r[0]},{in:'f'+k,v:r[1],fmt:'0%'},{in:'g'+k,v:0.09,fmt:'0%'},{f:v=>v['c'+k]*v['e'+k]*(1+v['f'+k])/(840*v['a'+k]),n:'wp'+k,fx:`=D${k+1}*F${k+1}*(1+G${k+1})/(840*B${k+1})`,fmt:'0.0000'},{f:v=>v['d'+k]*v['e'+k]*(1+v['g'+k])/(840*v['b'+k]),n:'wf'+k,fx:`=E${k+1}*F${k+1}*(1+H${k+1})/(840*C${k+1})`,fmt:'0.0000'},{in:'r'+k,v:r[2]},{in:'ef'+k,v:0.94,fmt:'0%'},{f:v=>v['r'+k]*v['ef'+k]*1440/(v['d'+k]*36),n:'pr'+k,fx:`=K${k+1}*L${k+1}*1440/(E${k+1}*36)`,fmt:'0.0'},{f:v=>v['pr'+k]*v['wp'+k]/100,fx:`=M${k+1}*I${k+1}/100`,fmt:'0.000',tot:true},{f:v=>v['pr'+k]*v['wf'+k]/100,fx:`=M${k+1}*J${k+1}/100`,fmt:'0.000',tot:true}];})
]})}
<div class="note">A 98" loom running this sheeting consumes about 0.68 bags of warp and 0.48 bags of weft a day. Six such looms for 12 days use 48.6 warp bags and 34.4 weft bags — 49 and 35 bags to hold in stock — numbers the yarn store must have in stock before the beams are sized.</div></div>`});

lecture({id:'wc22',course:'wc',n:'22',title:'Planning IV – Production Over Months',sub:'A day-by-day simulation: looms come on line one by one, stock builds up, and four shipments must be met on their dates.',chips:['Ramp-up','Cumulative stock','Shipments','Containers'],tags:'planning simulation shipments months ramp',body:()=>`
<div class="card"><h2>The problem</h2>
<p>Two widths of 60×60/161×112 are to be woven for a customer: the 68" quality makes 230 m per loom per day and the 98" quality 170 m. Looms are released to the order gradually — one more every two days for the 68" and every two and a half days for the 98" — until all are running. Shipments are booked on 10 October, 25 October, 5 November and 30 November, and each ships in a container (a 20 ft container holds 40,000 m of 68" or 30,000 m of 98"; a 40 ft holds double). Will the stock be there on each date?</p>
<p>The workbook runs a daily ledger from 1 September: looms × rate = production, cumulative stock minus shipments. The sheet below does the same with a loop, so you can change the ramp, the rates or the shipment programme and see at once which shipment slips.</p>
${S({title:'Ramp-up and shipment check (day 1 = 1 September)',cols:[260,110,110],rows:[
[{h:''},{h:'68" quality'},{h:'98" quality'}],
['Production per loom per day (m)',{in:'ra',v:230},{in:'rb',v:170}],
['Maximum looms on this quality',{in:'ma',v:12},{in:'mb',v:10}],
['Looms added: one every … days',{in:'ka',v:2},{in:'kb',v:2.5}],
['Looms running on day 1',{in:'la',v:1},{in:'lb',v:1}],
[{s:'Shipments (day number from 1 Sep: 10 Oct = 40, 25 Oct = 55, 5 Nov = 66, 30 Nov = 91)',span:3}],
[{h:'Shipment day'},{h:'68" (m)'},{h:'98" (m)'}],
[{in:'d1',v:40},{in:'qa1',v:40000},{in:'qb1',v:30000}],
[{in:'d2',v:55},{in:'qa2',v:45000},{in:'qb2',v:25000}],
[{in:'d3',v:66},{in:'qa3',v:20000},{in:'qb3',v:15000}],
[{in:'d4',v:91},{in:'qa4',v:20000},{in:'qb4',v:30000}],
[{s:'Result: stock on the shipment day after loading (negative = short)',span:3}],
...[1,2,3,4].map(i=>[{f:v=>v['d'+i],fx:'shipment day',fmt:'0'},{f:v=>sim(v,'a',i),fx:'cumulative production − cumulative shipments',fmt:'#,##0',tot:true},{f:v=>sim(v,'b',i),fx:'cumulative production − cumulative shipments',fmt:'#,##0',tot:true}]),
['Day on which the last shipment is fully covered',{f:v=>ready(v,'a'),fx:'first day with stock ≥ all shipments',fmt:'0'},{f:v=>ready(v,'b'),fx:'first day with stock ≥ all shipments',fmt:'0'}]
]})}
<div class="note">With the lecture’s figures every shipment is covered for both qualities; the 98" quality has the thinner margin (about 18,500 m in hand after the first two shipments), so it is the one to watch if its looms are released more slowly. Containers: 40,000 m of 68" + 30,000 m of 98" fill one 40 ft box; the 5 November lot (20,000 + 15,000) fits a 20 ft box.</div></div>`});
function looms(v,q,t){return Math.min(v['m'+q],v['l'+q]+Math.floor((t-1)/v['k'+q]));}
function sim(v,q,i){let stock=0,ship=0;const days=[1,2,3,4].map(j=>v['d'+j]);const T=v['d'+i];for(let t=1;t<=T;t++){stock+=looms(v,q,t)*v['r'+q];}for(let j=1;j<=i;j++)if(days[j-1]<=T)ship+=v['q'+q+j];return stock-ship;}
function ready(v,q){const total=[1,2,3,4].reduce((a,j)=>a+v['q'+q+j],0);let stock=0;for(let t=1;t<=2000;t++){stock+=looms(v,q,t)*v['r'+q];if(stock>=total)return t;}return NaN;}

lecture({id:'wc25',course:'wc',n:'25',title:'Set Size Planning',sub:'For every quality on the loom plan: beams per set, ends per beam, cone length, sets of warping required and bags of yarn to issue.',chips:['Sets','Ends per beam','Cone length','Bags'],tags:'set size warping sizing planning bags',body:()=>`
<div class="card"><h2>What a “set” is</h2>
<p>A set is one full creel of cones warped onto the required number of warper’s beams, then sized onto weaver’s beams. The size of the set is fixed by the cone: a 4.17 lb cone of Ne 20 holds 4.17 × 840 × 20 = 70,056 yd, less 2% wastage. Each loom gets a sized beam of a given length; multiply by looms and by beams per set to get the yardage the cones must supply, and divide by the yardage per cone to get the number of sets.</p>
<div class="formula">length per cone = cone lb × 840 × Ne × (1 − wastage) &nbsp;&nbsp;·&nbsp;&nbsp; sets = beams × looms × sized length per beam ÷ length per cone &nbsp;&nbsp;·&nbsp;&nbsp; bags = ends per beam × sets ÷ 24</div>
<p>How long a sized beam can be comes from the beam volume (Lecture 7) and the yarn diameter d = 1/(26√Ne) inches: the yarn cross-section × ends × length cannot exceed the beam’s volume.</p></div>
<div class="card"><h2>Set size worksheet</h2>
${S({title:'Set size planning',cols:[170,60,60,60,60,60,70,80,80,80,80,90,90,90,70,70,80],rows:[
[{h:'Quality'},{h:'Looms'},{h:'EPI'},{h:'Width'},{h:'Warp Ne'},{h:'Wastage'},{h:'T. ends'},{h:'Beams'},{h:'Ends/beam'},{h:'Yd / cone'},{h:'Yd / sized beam'},{h:'Yd to size'},{h:'Cone yd reqd'},{h:'Sets'},{h:'Sets used'},{h:'Bags'},{h:'Actual yd/beam'}],
[{s:'Cone size (lb) → ',span:1},{in:'cone',v:4.17},{t:'Beam yarn volume (in³)'},null,{in:'vol',v:39100},null,null,null,null,null,null,null,null,null,null,null,null],
...[['20×16/128×60, 63"',6,128,63,20],['30/2×40/2/96×48, 51"',2,96,51,15],['20×7/128×44, 51"',6,128,51,20],['20×10/118×52, 63"',12,118,63,20],['16×12/108×56, 63"',12,108,63,16],['20×20/108×58, 63"',12,108,63,20]].map((r,i)=>{const k=i+1,R=i+3;return [r[0],{in:'lm'+k,v:r[1]},{in:'ep'+k,v:r[2]},{in:'wd'+k,v:r[3]},{in:'ne'+k,v:r[4]},{in:'ws'+k,v:0.02,fmt:'0%'},
 {f:v=>v['ep'+k]*v['wd'+k],n:'te'+k,fx:`=C${R}*D${R}`,fmt:'#,##0'},
 {f:v=>RUE(v['te'+k]/840),n:'bm'+k,fx:`=CEILING(G${R}/840,2)`,fmt:'0'},
 {f:v=>Math.ceil(v['te'+k]/v['bm'+k]),n:'eb'+k,fx:`=ROUNDUP(G${R}/H${R},0)`,fmt:'#,##0'},
 {f:v=>v.cone*840*v['ne'+k]*(1-v['ws'+k]),n:'yc'+k,fx:`=$B$2*840*E${R}*(1-F${R})`,fmt:'#,##0'},
 {f:v=>{const d=1/(26*Math.sqrt(v['ne'+k]));return v.vol/(v['te'+k]*Math.PI/4*d*d)/36;},n:'sb'+k,fx:`=volume/(ends×π/4×d²)/36, d=1/(26√Ne)`,fmt:'#,##0'},
 {f:v=>v['sb'+k]*v['lm'+k],n:'ts'+k,fx:`=K${R}*B${R}`,fmt:'#,##0'},
 {f:v=>v['ts'+k]*v['bm'+k],n:'cr'+k,fx:`=L${R}*H${R}`,fmt:'#,##0'},
 {f:v=>v['cr'+k]/v['yc'+k],n:'st'+k,fx:`=M${R}/J${R}`,fmt:'0.00'},
 {f:v=>Math.max(1,Math.ceil(v['st'+k]-0.05)),n:'su'+k,fx:`=ROUNDUP(N${R}-0.05,0)`,fmt:'0',tot:true},
 {f:v=>Math.ceil(v['eb'+k]*v['su'+k]/24),fx:`=ROUNDUP(I${R}*O${R}/24,0)`,fmt:'0',tot:true},
 {f:v=>v['yc'+k]*v['su'+k]/v['bm'+k],fx:`=J${R}*O${R}/H${R}`,fmt:'#,##0'}];})
]})}
<div class="note">A set that works out to 2.03 is rounded down to 2 (the 0.05 allowance) — the beams simply come out a little shorter. 24 cones of 4.17 lb make one 100 lb bag. The sized-beam length is computed from the beam volume; the lecture read the same figures (2,320 yd for 8,064 ends of Ne 20) from a maximum-volume table on its second sheet.</div></div>`});

lecture({id:'wc27',course:'wc',n:'27–28',title:'Feasibility I & II – Costing a Weaving Plant',sub:'Variable cost and contribution per metre for local and export sale, then the investment, running cost and return of a 45-loom plant under three scenarios.',chips:['Variable cost','Contribution','Investment','Return %'],tags:'feasibility investment return contribution plant',body:()=>`
<div class="card"><h2>Feasibility I — contribution per metre</h2>
<p>The fabric is 20×16/128×60, 63", 3/1 twill. Warp and weft consumption per metre come from Lecture 14; prices and the selling price differ for the local and export markets. Commission and income tax are percentages of the sale price. What is left after all variable costs is the <b>unit contribution margin</b> (UCM), which, multiplied by the loom’s daily output, is what each loom earns per day towards fixed costs and profit.</p>
${S({title:'Variable cost per metre',cols:[280,110,110],rows:[
[{h:''},{h:'Local'},{h:'Export'}],
['Selling price (Rs / m)',{in:'sp1',v:53},{in:'sp2',v:70.32}],
['Warp yarn price (Rs / 10 lb)',{in:'wp1',v:460},{in:'wp2',v:560}],
['Weft yarn price (Rs / 10 lb)',{in:'fp1',v:445},{in:'fp2',v:530}],
['Warp consumption (lb / m)',{in:'wl',v:0.613},null],
['Weft consumption (lb / m)',{in:'fl',v:0.338},null],
['Sizing cost (Rs / kg of warp)',{in:'sz',v:10},null],
['Packing (Rs / m)',{in:'pk',v:0.15},null],
['Electricity (Rs / m)',{in:'el',v:1.55},null],
['Commission',{in:'cm',v:0.01,fmt:'0%'},null],
['Income tax on sale',{in:'tx',v:0.01,fmt:'0%'},null],
[{s:'Cost build-up',span:3}],
['Warp cost',{f:v=>v.wl*v.wp1/10,n:'w1',fx:'=B5*B3/10',fmt:'0.00'},{f:v=>v.wl*v.wp2/10,n:'w2',fx:'=B5*C3/10',fmt:'0.00'}],
['Weft cost',{f:v=>v.fl*v.fp1/10,n:'f1',fx:'=B6*B4/10',fmt:'0.00'},{f:v=>v.fl*v.fp2/10,n:'f2',fx:'=B6*C4/10',fmt:'0.00'}],
['Sizing',{f:v=>v.wl/2.2046*v.sz,n:'s1',fx:'=B5/2.2046*B7',fmt:'0.00'},{f:v=>v.wl/2.2046*v.sz,n:'s2',fx:'=B5/2.2046*B7',fmt:'0.00'}],
['Packing + electricity',{f:v=>v.pk+v.el,n:'pe',fx:'=B8+B9',fmt:'0.00'},{f:v=>v.pk+v.el,fx:'=B8+B9',fmt:'0.00'}],
['Commission + tax',{f:v=>v.sp1*(v.cm+v.tx),n:'ct1',fx:'=B2*(B10+B11)',fmt:'0.00'},{f:v=>v.sp2*(v.cm+v.tx),n:'ct2',fx:'=C2*(B10+B11)',fmt:'0.00'}],
['Total variable cost',{f:v=>v.w1+v.f1+v.s1+v.pe+v.ct1,n:'tv1',fx:'=SUM(B13:B17)',fmt:'0.00',tot:true},{f:v=>v.w2+v.f2+v.s2+v.pe+v.ct2,n:'tv2',fx:'=SUM(C13:C17)',fmt:'0.00',tot:true}],
['Unit contribution margin (Rs / m)',{f:v=>v.sp1-v.tv1,n:'u1',fx:'=B2-B18',fmt:'0.00',tot:true},{f:v=>v.sp2-v.tv2,n:'u2',fx:'=C2-C18',fmt:'0.00',tot:true}],
[{s:'Per loom and per plant',span:3}],
['Production per loom per day (m)',{in:'pd',v:430},null],
['Looms',{in:'nl',v:45},null],
['Contribution per loom per day',{f:v=>v.u1*v.pd,fx:'=B19*B21',fmt:'#,##0'},{f:v=>v.u2*v.pd,fx:'=C19*B21',fmt:'#,##0'}],
['Contribution per day, whole plant',{f:v=>v.u1*v.pd*v.nl,n:'c1',fx:'=B23*B22',fmt:'#,##0',tot:true},{f:v=>v.u2*v.pd*v.nl,n:'c2',fx:'=C23*B22',fmt:'#,##0',tot:true}],
['Contribution per month (30 days)',{f:v=>v.c1*30,fx:'=B24*30',fmt:'#,##0'},{f:v=>v.c2*30,fx:'=C24*30',fmt:'#,##0'}]
]})}
<div class="note">Local sale leaves Rs 4.35 per metre, export Rs 12. The same loom earns 1,873 or 5,166 rupees a day — a 45-loom shed makes about 2.5 million a month on local business and 7 million on export. These two figures and their average (a 50/50 mix, 4.75 million) are the “conservative / normal / aggressive” scenarios of Feasibility II.</div></div>
<div class="card"><h2>Feasibility II — investment and return</h2>
<p>Three scenarios: conservative (local market only), normal (a mix) and aggressive (export). Each has its own view of what the plant costs to build and to run.</p>
${S({title:'Plant feasibility (Rs million)',cols:[300,110,110,110],rows:[
[{h:''},{h:'Conservative'},{h:'Normal'},{h:'Aggressive'}],
[{s:'Investment',span:4}],
['Looms (45 × 3.0)',{in:'lo1',v:135},{in:'lo2',v:135},{in:'lo3',v:135}],
['Compressor',{in:'cp1',v:7},{in:'cp2',v:6},{in:'cp3',v:5}],
['Warping and sizing',{in:'ws1',v:50},{in:'ws2',v:45},{in:'ws3',v:40}],
['Construction (sq ft × Rs/sq ft)',{in:'cn1',v:24},{in:'cn2',v:18.375},{in:'cn3',v:15}],
['Yarn stock (lb × Rs 50)',{in:'ys1',v:7.5},{in:'ys2',v:11.25},{in:'ys3',v:15}],
['Total investment',{f:v=>v.lo1+v.cp1+v.ws1+v.cn1+v.ys1,n:'ti1',fx:'=SUM(B3:B7)',fmt:'0.0',tot:true},{f:v=>v.lo2+v.cp2+v.ws2+v.cn2+v.ys2,n:'ti2',fx:'=SUM(C3:C7)',fmt:'0.0',tot:true},{f:v=>v.lo3+v.cp3+v.ws3+v.cn3+v.ys3,n:'ti3',fx:'=SUM(D3:D7)',fmt:'0.0',tot:true}],
[{s:'Monthly figures',span:4}],
['Contribution (from Feasibility I)',{in:'co1',v:2.53},{in:'co2',v:4.75},{in:'co3',v:6.97}],
['Salaries',{in:'sa1',v:1.21},{in:'sa2',v:1.1},{in:'sa3',v:0.99}],
['Stores and spares',{in:'st1',v:0.715},{in:'st2',v:0.65},{in:'st3',v:0.585}],
['Overheads',{in:'oh1',v:0.11},{in:'oh2',v:0.1},{in:'oh3',v:0.09}],
['Administration',{in:'ad1',v:0.44},{in:'ad2',v:0.4},{in:'ad3',v:0.36}],
['Depreciation life (years)',{in:'dy1',v:10},{in:'dy2',v:10},{in:'dy3',v:10}],
['Depreciation per month',{f:v=>(v.lo1+v.cp1+v.ws1+v.cn1)/v.dy1/12,n:'dp1',fx:'=(B3+B4+B5+B6)/B15/12',fmt:'0.000'},{f:v=>(v.lo2+v.cp2+v.ws2+v.cn2)/v.dy2/12,n:'dp2',fx:'=(C3+C4+C5+C6)/C15/12',fmt:'0.000'},{f:v=>(v.lo3+v.cp3+v.ws3+v.cn3)/v.dy3/12,n:'dp3',fx:'=(D3+D4+D5+D6)/D15/12',fmt:'0.000'}],
['Total conversion cost',{f:v=>v.sa1+v.st1+v.oh1+v.ad1+v.dp1,n:'tc1',fx:'=SUM(B11:B14)+B16',fmt:'0.000',tot:true},{f:v=>v.sa2+v.st2+v.oh2+v.ad2+v.dp2,n:'tc2',fx:'=SUM(C11:C14)+C16',fmt:'0.000',tot:true},{f:v=>v.sa3+v.st3+v.oh3+v.ad3+v.dp3,n:'tc3',fx:'=SUM(D11:D14)+D16',fmt:'0.000',tot:true}],
['Monthly saving (profit)',{f:v=>v.co1-v.tc1,n:'sv1',fx:'=B10-B17',fmt:'0.00',tot:true},{f:v=>v.co2-v.tc2,n:'sv2',fx:'=C10-C17',fmt:'0.00',tot:true},{f:v=>v.co3-v.tc3,n:'sv3',fx:'=D10-D17',fmt:'0.00',tot:true}],
['Monthly return on investment',{f:v=>v.sv1/v.ti1,fx:'=B18/B8',fmt:'0.00%'},{f:v=>v.sv2/v.ti2,fx:'=C18/C8',fmt:'0.00%'},{f:v=>v.sv3/v.ti3,fx:'=D18/D8',fmt:'0.00%'}],
['Annual return on investment',{f:v=>v.sv1/v.ti1*12,fx:'=B19*12',fmt:'0.00%',tot:true},{f:v=>v.sv2/v.ti2*12,fx:'=C19*12',fmt:'0.00%',tot:true},{f:v=>v.sv3/v.ti3*12,fx:'=D19*12',fmt:'0.00%',tot:true}],
['Annual return ignoring depreciation (cash)',{f:v=>(v.sv1+v.dp1)/v.ti1*12,fx:'=(B18+B16)/B8*12',fmt:'0.00%'},{f:v=>(v.sv2+v.dp2)/v.ti2*12,fx:'=(C18+C16)/C8*12',fmt:'0.00%'},{f:v=>(v.sv3+v.dp3)/v.ti3*12,fx:'=(D18+D16)/D8*12',fmt:'0.00%'}]
]})}
<div class="note">The lecture’s conclusion: a plant that sells only locally loses money (about −9% a year), a mixed plant earns a modest 4%, and an export-oriented plant about 19% — 28% on a cash basis. The decision is not whether to build the plant but what market it must be built for.</div></div>`});

/* ===================== FABRIC DESIGN ===================== */
const gen=(w,h,fn)=>{const r=[];for(let p=0;p<h;p++){const row=[];for(let e=0;e<w;e++)row.push(fn(e,p)?1:0);r.push(row);}return r;};
const mod=(a,n)=>((a%n)+n)%n;
const PLAIN=(w=8,h=8)=>gen(w,h,(e,p)=>(e+p)%2===0);
// twill from a sequence "3,1" = 3 up 1 down, step = ends advanced per pick (1 = 45°, 2 = steep 63°), dir 1 = Z (rises to the right)
function TWILL(seq,w,h,step=1,dir=1){const s=seq.split(/[,/]/).map(Number);const r=s.reduce((a,b)=>a+b,0);const lift=[];s.forEach((n,i)=>{for(let k=0;k<n;k++)lift.push(i%2===0?1:0);});w=w||r;h=h||r;return gen(w,h,(e,p)=>lift[mod(e-dir*step*p,r)]);}
// satin/sateen: repeat r, move m; face 'warp' = warp-faced satin (one end down per pick), 'weft' = sateen (one end up per pick)
function SATIN(r,m,face='warp',w,h){w=w||r;h=h||r;return gen(w,h,(e,p)=>{const up=mod(e,r)===mod(p*m,r);return face==='weft'?up:!up;});}
// mirror the ends (pointed/waved draft) : rows of width r → width 2r-2
function POINT(rows){const r=rows[0].length;return rows.map(row=>{const o=[];for(let e=0;e<2*r-2;e++)o.push(row[e<r?e:2*r-2-e]);return o;});}
function HERRING(rows,n,shift=2){const r=rows[0].length,h=rows.length;return rows.map((row,p)=>{const o=[];for(let e=0;e<2*n;e++)o.push(e<n?row[mod(e,r)]:rows[(p+shift)%h][mod(n-1-(e-n),r)]);return o;});}
function tile(rows,tx,ty){const o=[];for(let p=0;p<rows.length*ty;p++){const row=[];for(let e=0;e<rows[0].length*tx;e++)row.push(rows[p%rows.length][e%rows[0].length]);o.push(row);}return o;}
function toHex(rows){return rows.map(r=>{const bits=r.join('').padStart(Math.ceil(r.length/4)*4,'0');let h='';for(let i=0;i<bits.length;i+=4)h+=parseInt(bits.slice(i,i+4),2).toString(16).toUpperCase();return '$'+h;}).join(' ')+' -'+rows[0].length;}
const IND='#4338ca',IND2='#e0e7ff';

lecture({id:'fd01',course:'fd',n:'01',title:'Introduction to Weaving and Fabric Construction',sub:'The three motions of a loom, the common weaving defects, and how a fabric construction is written and read.',chips:['Shedding','Picking','Beating-up','Construction notation'],tags:'introduction loom defects construction',body:()=>`
<div class="card"><h2>What a loom does, three times a pick</h2>
<div class="grid3">
<div class="card" style="margin:0;background:${IND2}"><h3>1 · Shedding</h3><p>The warp ends are divided into two sheets — some raised, some lowered — to open a <b>shed</b>. Which ends rise on which pick is the <em>design</em>, and that is what this course is about.</p></div>
<div class="card" style="margin:0;background:${IND2}"><h3>2 · Picking</h3><p>The weft is carried through the shed: by shuttle, projectile, rapier, or a jet of air or water.</p></div>
<div class="card" style="margin:0;background:${IND2}"><h3>3 · Beating-up</h3><p>The reed pushes the new pick against the fell of the cloth, fixing the picks per inch.</p></div></div>
<p>Let-off (feeding warp from the beam) and take-up (winding the cloth) keep the process continuous.</p></div>
<div class="card"><h2>Common defects and what they tell you</h2>
<table class="plain"><tr><th>Defect</th><th>What you see</th><th>Usual cause</th></tr>
<tr><td>Missing pick / missing end</td><td>A thin line across (pick) or along (end) the fabric</td><td>Weft break not detected; warp break with stop motion failing</td></tr>
<tr><td>Double pick / half pick</td><td>A thick weft bar, or a pick that stops part-way across</td><td>Two picks in one shed; pick breaking during insertion</td></tr>
<tr><td>Floats</td><td>Threads skipping over several others</td><td>Ends stuck together or a late shed</td></tr>
<tr><td>Crack (starting mark)</td><td>A band of lower pick density</td><td>Loom stopped and restarted without correcting the fell</td></tr>
<tr><td>Reed marks</td><td>Warp-way streaks</td><td>Too many ends per dent for the yarn</td></tr></table></div>
<div class="card"><h2>Reading a construction</h2>
<p>Yarn count in the English system is <b>hanks (leas of 840 yd) per pound</b>. A construction such as <b>20 × 16 / 128 × 60, 63", 3/1</b> gives warp count × weft count, ends × picks per inch, width and weave.</p>
${S({title:'Construction arithmetic',cols:[260,120],rows:[
['Warp count Ne',{in:'wc',v:20}],['Weft count Ne',{in:'fc',v:16}],['Ends per inch',{in:'epi',v:128}],['Picks per inch (finished)',{in:'ppi',v:60}],['Width (in)',{in:'w',v:63}],['Length contraction after the loom',{in:'lc',v:0.08,fmt:'0%'}],
['Total ends in the warp',{f:v=>v.epi*v.w,fx:'=B3*B5',fmt:'#,##0',tot:true}],
['Picks per inch to set on the loom',{f:v=>v.ppi*(1-v.lc),fx:'=B4*(1-B6)',fmt:'0.0',tot:true}],
['Yards of warp yarn per yard of fabric',{f:v=>v.epi*v.w*1.1,fx:'=B7*(1+10% crimp)',fmt:'#,##0'}],
['Rough weight, GSM ≈ (EPI/Ne + PPI/Ne) × 25',{f:v=>(v.epi/v.wc+v.ppi/v.fc)*25,fx:'=(B3/B1+B4/B2)*25',fmt:'0'}]
]})}
<div class="note">Because the fabric contracts in length when it leaves the loom, fewer picks are inserted per inch on the loom than are counted in the finished cloth — the lecture sets 55 picks on the loom for a 60-pick fabric.</div></div>`});

lecture({id:'fd02',course:'fd',n:'02',title:'Weight of Fabric',sub:'The quick GSM estimate and the exact calculation, shared with Weaving Calculations Lecture 5.',chips:['GSM','oz/yd²'],tags:'weight gsm',body:()=>`
<div class="card"><h2>Two ways to weigh a cloth before it is woven</h2>
<p>The quick rule: for Ne counts, <span class="formula">GSM ≈ ( EPI / Ne<sub>warp</sub> + PPI / Ne<sub>weft</sub> ) × 25</span>. It assumes about 10% crimp and ignores width effects, but it is close enough to sort constructions into sheeting, poplin, drill and canvas.</p>
${S({title:'Quick weight estimate',cols:[220,110,110,110],rows:[
[{h:''},{h:'Sheeting'},{h:'Drill'},{h:'Your fabric'}],
['Warp Ne',{in:'a1',v:20},{in:'a2',v:20},{in:'a3',v:30}],
['Weft Ne',{in:'b1',v:20},{in:'b2',v:16},{in:'b3',v:30}],
['EPI',{in:'c1',v:60},{in:'c2',v:128},{in:'c3',v:133}],
['PPI',{in:'d1',v:60},{in:'d2',v:60},{in:'d3',v:72}],
['GSM (approx.)',{f:v=>(v.c1/v.a1+v.d1/v.b1)*25,fx:'=(B4/B2+B5/B3)*25',fmt:'0',tot:true},{f:v=>(v.c2/v.a2+v.d2/v.b2)*25,fx:'=(C4/C2+C5/C3)*25',fmt:'0',tot:true},{f:v=>(v.c3/v.a3+v.d3/v.b3)*25,fx:'=(D4/D2+D5/D3)*25',fmt:'0',tot:true}],
['oz / yd² (GSM ÷ 33.9)',{f:v=>(v.c1/v.a1+v.d1/v.b1)*25/33.9,fx:'=B6/33.9',fmt:'0.00'},{f:v=>(v.c2/v.a2+v.d2/v.b2)*25/33.9,fx:'=C6/33.9',fmt:'0.00'},{f:v=>(v.c3/v.a3+v.d3/v.b3)*25/33.9,fx:'=D6/33.9',fmt:'0.00'}]
]})}
<p>For the exact method — contraction, width, pounds per linear yard — open <a data-go="wc05">Weaving Calculations Lecture 5</a>, which is the same worksheet the Fabric Design course used.</p></div>`});

lecture({id:'fd03',course:'fd',n:'03',title:'Shedding Mechanisms and Point Paper',sub:'Tappet, dobby and jacquard shedding — what each can weave — and the point-paper convention for drawing a weave.',chips:['Tappet','Dobby','Jacquard','Point paper'],tags:'shedding tappet dobby jacquard point paper',body:()=>`
<div class="card"><h2>Three shedding mechanisms</h2>
<table class="plain"><tr><th>Mechanism</th><th>Heald frames controlled</th><th>Typical weaves</th></tr>
<tr><td>Tappet (cam)</td><td>6–8</td><td>plain, twills, sateens, simple ribs — repeats up to 8 picks</td></tr>
<tr><td>Dobby</td><td>14–20 (up to 28)</td><td>any weave whose repeat fits the frames: cords, piqué, honeycomb, huckaback, small figures</td></tr>
<tr><td>Jacquard</td><td>every end individually (hooks)</td><td>figured fabrics, damask, brocade, large motifs</td></tr></table>
<p>The number of <em>different</em> end movements in a design decides how many heald frames it needs (Lecture 8). A design that needs more frames than the loom has must go to a dobby or jacquard.</p></div>
<div class="card"><h2>Point paper</h2>
<p>Each column of squares is a warp end, each row a pick; the first pick is at the bottom and the first end on the left. A filled square means the end is <b>lifted</b> over that pick (warp on the face); an empty square means the pick lies over the end. A weave is drawn as one <b>repeat</b> — the smallest block that tiles the whole cloth.</p>
<div class="grid2">
${W({rows:PLAIN(8,8),title:'Plain weave 1/1',size:18,colors:[IND,'#f1f5f9'],caption:'Every end alternates over and under; the second pick is the opposite of the first. One repeat is only 2 × 2 but is drawn on 8 × 8 here to show the tiling.'})}
${W({rows:TWILL('3,1',8,8),title:'3/1 twill',size:18,colors:[IND,'#f1f5f9'],caption:'Each end is up for 3 picks and down for 1; every pick shifts the pattern one end to the right, producing the diagonal.'})}
</div></div>`});

lecture({id:'fd04',course:'fd',n:'04',title:'Twill Weaves',sub:'Regular, irregular and steep twills, cavalry twill, and the pointed twill — all built from one rule.',chips:['2/1','2/2','3/1','Steep 63°','Pointed'],tags:'twill cavalry pointed steep irregular',body:()=>`
<div class="card"><h2>The twill rule</h2>
<p>Write the lifting order of one end as <b>up/down</b> numbers — 2/1 means two up, one down — and move it one end to the right on each successive pick. The repeat is the sum of the numbers on both ends and picks; the diagonal runs at 45° when the step is one end per pick.</p>
<div class="grid3">
${W({rows:TWILL('2,1',6,6),title:'2/1 twill (warp-faced)',size:20,colors:[IND,'#f1f5f9']})}
${W({rows:TWILL('2,2',8,8),title:'2/2 twill (balanced)',size:20,colors:[IND,'#f1f5f9']})}
${W({rows:TWILL('3,1',8,8),title:'3/1 twill (drill)',size:20,colors:[IND,'#f1f5f9']})}
</div>
<div class="note">A warp-faced twill (2/1, 3/1) shows mostly warp on the face; turn the cloth over and you see the weft-faced 1/2 or 1/3. Balanced twills (2/2) look the same on both sides. Twills interlace less often than plain weave and can be set denser (see cover factor divisors in Weaving Calculations 12).</div></div>
<div class="card"><h2>Irregular and steep twills</h2>
<div class="grid3">
${W({rows:TWILL('2,1,1,2',6,6),title:'Irregular twill 2/1/1/2',size:20,colors:[IND,'#f1f5f9'],caption:'Several up/down groups of different sizes still shift one end per pick.'})}
${W({rows:TWILL('3,1,2,2',8,8,2),title:'Steep twill (63°) — cavalry twill',size:20,colors:[IND,'#f1f5f9'],caption:'The lifting order advances two ends per pick, so the diagonal rises at 63°; a pronounced double ridge is typical of cavalry twill.'})}
${W({rows:TWILL('2,2',8,8,1,-1),title:'2/2 twill, S direction',size:20,colors:[IND,'#f1f5f9'],caption:'Shifting to the left gives an S twill; Z and S twills alternate in herringbones (Lecture 7).'})}
</div></div>
<div class="card"><h2>Pointed twill</h2>
<p>Reverse the draft at the end of the repeat — thread the ends 1-2-3-4-3-2 — and the twill line turns back on itself, forming points (chevrons) warp-way. The weave below is a 2/2 twill pointed on 6 ends.</p>
${W({rows:POINT(TWILL('2,2',4,8)),title:'Pointed 2/2 twill',size:20,colors:[IND,'#f1f5f9'],draft:true,tile:2,caption:'Note the draft: only 4 healds are needed although the repeat is 6 ends wide, because ends 5 and 6 repeat the movement of ends 3 and 2.'})}
</div>`});

lecture({id:'fd05',course:'fd',n:'05',title:'Satin and Sateen',sub:'Smooth, lustrous weaves built by distributing single interlacings with a move number.',chips:['Move number','5-end','8-end','Satinette','Striped satin'],tags:'satin sateen move number lustre',body:()=>`
<div class="card"><h2>Satin (warp-faced) and sateen (weft-faced)</h2>
<p>In a satin each end is down on only one pick of the repeat; in a sateen each end is <em>up</em> on only one pick. The single interlacings are scattered so that no two touch — that is what the <b>move number</b> does: on each pick the interlacing moves a fixed number of ends along. The move number must share no factor with the repeat, and must not be 1 or repeat − 1 (those give a twill).</p>
<table class="plain"><tr><th>Repeat</th><th>Possible move numbers</th><th>Note</th></tr>
<tr><td>4</td><td>—</td><td>no true satin; 4-end satinette (an irregular arrangement) is used</td></tr>
<tr><td>5</td><td>2, 3</td><td>the commonest: 4/1 satin, 1/4 sateen</td></tr>
<tr><td>6</td><td>—</td><td>irregular 6-end satin only</td></tr>
<tr><td>7</td><td>2, 3, 4, 5</td><td></td></tr>
<tr><td>8</td><td>3, 5</td><td>7/1 satin — damask, satin stripes</td></tr>
<tr><td>10</td><td>3, 7</td><td></td></tr></table></div>
<div class="card"><h2>Drawings</h2>
<div class="grid3">
${W({rows:SATIN(5,2,'weft'),title:'1/4 sateen, 5-end, move 2',size:22,colors:[IND,'#f1f5f9'],tile:2})}
${W({rows:SATIN(5,3,'warp'),title:'4/1 satin, 5-end, move 3',size:22,colors:[IND,'#f1f5f9'],tile:2})}
${W({rows:SATIN(8,3,'warp'),title:'7/1 satin, 8-end, move 3',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$8','$4','$1','$2'],w:4,title:'4-end satinette',size:22,colors:[IND,'#f1f5f9'],tile:3,caption:'Hex $8 $4 $1 $2 — one lift per pick (1 up, 3 down), so the lifts form a broken 1/3 twill (Lecture 10 notation).'})}
${W({rows:SATIN(8,5,'weft'),title:'1/7 sateen, 8-end, move 5',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({rows:(()=>{const a=SATIN(5,3,'warp',5,10),b=SATIN(5,2,'weft',5,11).slice(1);return a.map((r,p)=>[...r,...b[p]]);})(),title:'Striped satin (satin + sateen stripes)',size:20,colors:[IND,'#f1f5f9'],tile:2,caption:'Five ends of 4/1 satin beside five ends of 1/4 sateen: the warp-faced stripe looks dark, the weft-faced one light, from the same yarns.'})}
</div></div>`});

lecture({id:'fd06',course:'fd',n:'06',title:'Rib and Hopsack Weaves',sub:'Plain-weave derivatives: extend the interlacing warp-way for a warp rib, weft-way for a weft rib, both ways for a hopsack.',chips:['Warp rib','Weft rib','Hopsack','Basket'],tags:'rib hopsack basket matt panama',body:()=>`
<div class="card"><h2>Derived from plain weave</h2>
<p>Take plain weave and let each interlacing cover more than one thread. If every end moves over two picks at a time you get a <b>warp rib</b> (ridges run weft-way, the weft is hidden — warp crimp is high, see Weaving Calculations 15). If every pick covers two ends it is a <b>weft rib</b>. Extend both ways and it is a <b>hopsack</b> (matt, panama, basket).</p>
<div class="grid3">
${W({rows:gen(8,8,(e,p)=>(e+Math.floor(p/2))%2===0),title:'2/2 warp rib',size:20,colors:[IND,'#f1f5f9'],caption:'Each end lifts for two picks, down for two: 2 healds, repeat 2 ends × 4 picks.'})}
${W({rows:gen(8,8,(e,p)=>(Math.floor(e/2)+p)%2===0),title:'2/2 weft rib',size:20,colors:[IND,'#f1f5f9'],caption:'Ends work in pairs; repeat 4 ends × 2 picks.'})}
${W({rows:gen(8,8,(e,p)=>(Math.floor(e/2)+Math.floor(p/2))%2===0),title:'2/2 hopsack (matt)',size:20,colors:[IND,'#f1f5f9'],caption:'Pairs of ends and pairs of picks interlace as one — a looser, flatter cloth.'})}
${W({rows:gen(12,12,(e,p)=>(Math.floor(e/3)+Math.floor(p/3))%2===0),title:'3/3 hopsack',size:16,colors:[IND,'#f1f5f9']})}

${W({rows:gen(10,10,(e,p)=>{const E=[0,0,0,1,1,2,2,2,3,3][e],P=[0,0,0,1,1,2,2,2,3,3][p];return (E+P)%2===0;}),title:'Fancy basket 3-2',size:18,colors:[IND,'#f1f5f9'],caption:'Unequal groups (3 and 2) give the irregular basket used in shirtings and upholstery.'})}
</div>
<div class="note">Rib and hopsack weaves interlace less often than plain weave and their floats show equally on both sides (they are reversible), so they need higher sett than plain weave to look firm; the cover-factor divisors (Weaving Calculations 12) are 1.26 for warp rib, 1.5 for weft rib and 1.4 for panama.</div></div>`});

lecture({id:'fd07',course:'fd',n:'07',title:'Twill Derivatives',sub:'Waved, herringbone, broken and curved twills — ways of turning or interrupting the twill line.',chips:['Herringbone','Broken twill','Waved','Curved'],tags:'herringbone broken waved curved twill zigzag',body:()=>`
<div class="card"><h2>Turning the twill line</h2>
<p>A <b>pointed (waved) twill</b> reverses the draft, so the diagonal meets itself point to point. A <b>herringbone</b> reverses the direction <em>and</em> breaks the join by shifting the second half two picks, so the twill lines do not meet — the cut gives the typical fish-bone. A <b>broken twill</b> interrupts the line every few ends (crow’s foot). A <b>curved twill</b> changes the step gradually — 1, 1, 2, 2, 3 ends per pick — so the line bends.</p>
<div class="grid2">
${W({rows:POINT(TWILL('2,2',4,4)).map(r=>r),title:'Waved (pointed) 2/2 twill',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({rows:HERRING(TWILL('2,2',4,4),4),title:'Herringbone 2/2',size:20,colors:[IND,'#f1f5f9'],tile:2,caption:'Second half runs the other way and is cut (ends 5–8 are the inverse of a reversed 2/2), so warp floats meet weft floats at the join.'})}
${W({rows:HERRING(TWILL('3,1',4,4),4),title:'Herringbone 3/1',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$C','$3','$6','$9'],w:4,title:'Broken 2/2 twill (crow’s foot)',size:20,colors:[IND,'#f1f5f9'],tile:3,caption:'The picks of a 2/2 twill are re-ordered 1, 3, 2, 4 so the diagonal never runs more than two ends.'})}
${W({rows:gen(20,10,(e,p)=>[1,1,1,0,0][mod(e-[0,1,2,3,4,5,7,9,11,13][p],5)]),title:'Curved twill (changing step)',size:16,colors:[IND,'#f1f5f9'],effect:false,caption:'A 3/2 twill whose lifting order advances one end per pick for five picks, then two ends per pick for five picks, so the twill line changes angle and bends.'})}
</div></div>`});

lecture({id:'fd08',course:'fd',n:'08',title:'Draft, Peg Plan and Denting',sub:'From design to loom: which heald carries each end, which healds lift on each pick, and how many ends go through each reed dent.',chips:['Draft','Peg plan','Healds','Denting'],tags:'draft peg plan lifting denting reed healds',body:()=>`
<div class="card"><h2>Three drawings for every weave</h2>
<ol class="steps">
<li><b>Design</b> — the point paper: ends across, picks up.</li>
<li><b>Draft</b> — one row per heald frame: ends that move identically go on the same heald. The number of different end movements = number of healds.</li>
<li><b>Peg (lifting) plan</b> — one column per heald, one row per pick: which healds rise on each pick. For a straight draft the peg plan is the design itself.</li></ol>
<p>The engine on every weave page computes the draft and peg plan automatically; here they are shown for a straight-drafted twill and a pointed twill.</p>
${W({rows:TWILL('3,1',8,8),title:'3/1 twill — straight draft',size:20,colors:[IND,'#f1f5f9'],draft:true,effect:false,caption:'4 healds for 8 ends: end 5 moves like end 1, so both go on heald 1. Threading 1 2 3 4 1 2 3 4.'})}
${W({rows:POINT(TWILL('2,2',4,8)),title:'Pointed twill — pointed draft',size:20,colors:[IND,'#f1f5f9'],draft:true,effect:false,caption:'Threading 1 2 3 4 3 2: the draft turns back, the peg plan stays a plain 2/2 twill.'})}
</div>
<div class="card"><h2>Denting</h2>
<p>Ends are drawn through the reed in groups — 2, 3 or 4 per dent — chosen so that the group matches the weave repeat (or divides it) and the ends in a dent are not all lifting together, which would leave reed marks.</p>
<table class="plain"><tr><th>Weave</th><th>Ends per dent</th><th>Why</th></tr>
<tr><td>Plain 1/1</td><td>2</td><td>one up, one down in each dent</td></tr>
<tr><td>2/1 twill</td><td>3</td><td>whole repeat per dent</td></tr>
<tr><td>3/1 twill, 2/2 twill</td><td>4</td><td>whole repeat per dent</td></tr>
<tr><td>5-end satin</td><td>2, 3 alternately (2.5 avg)</td><td>repeat does not divide by 2 or 4</td></tr></table>
<p>Reed count then follows from EPI ÷ ends per dent (Weaving Calculations 11).</p></div>`});

lecture({id:'fd10',course:'fd',n:'10',title:'Number Systems and Hexadecimal Weave Notation',sub:'Decimal, binary and hexadecimal, and the compact way of writing any weave as one hex number per pick.',chips:['Binary','Hexadecimal','Nibble','$9 $C $6 $3'],tags:'binary hexadecimal number system notation',body:()=>`
<div class="card"><h2>Why a weaver needs binary</h2>
<p>A pick of a weave is a row of ends that are either lifted (1) or not (0) — a binary number. Binary is long to write, so group the bits in fours (a <b>nibble</b>) and write each group as one hexadecimal digit 0–9, A–F. A whole weave becomes a short list of hex numbers, one per pick, which a CAD system or an electronic dobby can read directly.</p>
<table class="plain"><tr><th>Binary</th><th>Hex</th><th>Dec</th><th>Binary</th><th>Hex</th><th>Dec</th><th>Binary</th><th>Hex</th><th>Dec</th><th>Binary</th><th>Hex</th><th>Dec</th></tr>
<tr><td>0000</td><td>0</td><td>0</td><td>0100</td><td>4</td><td>4</td><td>1000</td><td>8</td><td>8</td><td>1100</td><td>C</td><td>12</td></tr>
<tr><td>0001</td><td>1</td><td>1</td><td>0101</td><td>5</td><td>5</td><td>1001</td><td>9</td><td>9</td><td>1101</td><td>D</td><td>13</td></tr>
<tr><td>0010</td><td>2</td><td>2</td><td>0110</td><td>6</td><td>6</td><td>1010</td><td>A</td><td>10</td><td>1110</td><td>E</td><td>14</td></tr>
<tr><td>0011</td><td>3</td><td>3</td><td>0111</td><td>7</td><td>7</td><td>1011</td><td>B</td><td>11</td><td>1111</td><td>F</td><td>15</td></tr></table></div>
<div class="card"><h2>Converter</h2>
<p>Type a number in any one base; the others are computed. Examples from the lecture: 1101101₂ = 109 = $6D; $24A9E = 150,174; 1010001001100₂ = $144C.</p>
${S({title:'Base conversion',cols:[200,200],legend:false,rows:[
['Base of the number you type',{in:'base',v:'Binary',opts:['Binary','Decimal','Hexadecimal']}],
['Number',{in:'num',v:1101101,fmt:'txt'}],
['Decimal',{f:v=>{const el=document.querySelector('input[data-in="num"]');const s=(el?el.value:String(v.num)).trim().replace(/^\$/,'').replace(/\s+/g,'');const n=parseInt(s,v.base==='Binary'?2:v.base==='Decimal'?10:16);return isNaN(n)?NaN:n;},n:'dec',fx:'parse in the chosen base',fmt:'#,##0'}],
['Binary',{f:v=>isNaN(v.dec)?'–':v.dec.toString(2),fx:'=BASE(dec,2)',fmt:'txt'}],
['Hexadecimal',{f:v=>isNaN(v.dec)?'–':'$'+v.dec.toString(16).toUpperCase(),fx:'=BASE(dec,16)',fmt:'txt'}],
['Bits in groups of four',{f:v=>isNaN(v.dec)?'–':v.dec.toString(2).padStart(Math.ceil(v.dec.toString(2).length/4)*4,'0').replace(/(.{4})/g,'$1 ').trim(),fx:'nibbles',fmt:'txt'}]
]})}
<div class="warn">The “Number” cell is read as text; type the digits without spaces (hex with or without the leading $).</div></div>
<div class="card"><h2>Weaves in hexadecimal</h2>
<p>Convention: write the picks from the bottom of the point paper upward, one hex number per pick, the most significant bit on the left end; append “−n” to say how many ends wide the design is. If the width is not a multiple of 4, idle (zero) ends are added on the <em>right</em> of each pick before grouping, and they are dropped again when decoding: $8 $4 $2 −3 is 100<i>0</i>, 010<i>0</i>, 001<i>0</i>. (This is different from writing a plain number, where zeros are added on the left — as in the converter above — because they do not change its value.) <b>$9 $C $6 $3 −4</b> is 1001, 1100, 0110, 0011 — a 2/2 twill.</p>
<div class="grid2">
${W({hex:['$9','$C','$6','$3'],w:4,title:'$9 $C $6 $3 −4 → 2/2 twill',size:22,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$8','$4','$2'],w:3,title:'$8 $4 $2 −3 → 1/2 twill',size:22,colors:[IND,'#f1f5f9'],tile:3})}
${W({hex:['$8','$4','$1','$2'],w:4,title:'$8 $4 $1 $2 −4 → 4-end satinette',size:22,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$F80','$8B8','$8B8','$8B8','$F80','$07C','$744','$744','$744','$07C'],w:10,title:'Mock leno, 10 ends',size:20,colors:[IND,'#f1f5f9'],tile:2})}
</div>
<h3>Try your own</h3>
<p>Edit the codes, change the width, press Draw. The draft and peg plan are generated too — so you can see how many healds your idea needs.</p>
${HEXBOX('$9 $C $6 $3',4)}
</div>`});

lecture({id:'fd12',course:'fd',n:'12',title:'Fabric Analysis II – Yarn Diameter',sub:'Estimating the diameter of a yarn from its count and specific volume — the number behind every cover and crimp calculation.',chips:['Specific volume','d = √tex / 26.7','d = 0.9 / √Ne'],tags:'diameter specific volume analysis',body:()=>`
<div class="card"><h2>From count to diameter</h2>
<p>Treat the yarn as a cylinder of specific volume v (cm³ per gram; about 1.1 for a cotton yarn in cloth). One metre of yarn of N tex weighs N/1000 g and occupies N·v/1000 cm³; equate that to the cylinder volume π d² l / 4 and solve:</p>
<div class="formula">d = √( 4 v N / (1000 π l) ), l = 100 cm &nbsp;&nbsp;⇒&nbsp;&nbsp; d (mm) = √tex ÷ 26.7 &nbsp;&nbsp;·&nbsp;&nbsp; d (mm) = 0.9 ÷ √Ne &nbsp;&nbsp;·&nbsp;&nbsp; d (in) ≈ 1 ÷ (28 √Ne)</div>
${S({title:'Yarn diameter',cols:[260,120,120,120],rows:[
[{h:''},{h:'Yarn A'},{h:'Yarn B'},{h:'Yarn C'}],
['Count Ne',{in:'a',v:20},{in:'b',v:30},{in:'c',v:40}],
['Specific volume (cm³/g)',{in:'va',v:1.1},{in:'vb',v:1.1},{in:'vc',v:1.1}],
['Tex',{f:v=>590.67/v.a,n:'ta',fx:'=590.67/B2',fmt:'0.00'},{f:v=>590.67/v.b,n:'tb',fx:'=590.67/C2',fmt:'0.00'},{f:v=>590.67/v.c,n:'tc',fx:'=590.67/D2',fmt:'0.00'}],
['Diameter from v (mm)',{f:v=>Math.sqrt(4*v.va*v.ta/(Math.PI*1e5))*10,fx:'=SQRT(4*B3*B4/(PI()*100000))*10',fmt:'0.000',tot:true},{f:v=>Math.sqrt(4*v.vb*v.tb/(Math.PI*1e5))*10,fx:'=SQRT(4*C3*C4/(PI()*100000))*10',fmt:'0.000',tot:true},{f:v=>Math.sqrt(4*v.vc*v.tc/(Math.PI*1e5))*10,fx:'=SQRT(4*D3*D4/(PI()*100000))*10',fmt:'0.000',tot:true}],
['Diameter, √tex ÷ 26.7 (mm)',{f:v=>Math.sqrt(v.ta)/26.7,fx:'=SQRT(B4)/26.7',fmt:'0.000'},{f:v=>Math.sqrt(v.tb)/26.7,fx:'=SQRT(C4)/26.7',fmt:'0.000'},{f:v=>Math.sqrt(v.tc)/26.7,fx:'=SQRT(D4)/26.7',fmt:'0.000'}],
['Diameter, 0.9 ÷ √Ne (mm)',{f:v=>0.9/Math.sqrt(v.a),fx:'=0.9/SQRT(B2)',fmt:'0.000'},{f:v=>0.9/Math.sqrt(v.b),fx:'=0.9/SQRT(C2)',fmt:'0.000'},{f:v=>0.9/Math.sqrt(v.c),fx:'=0.9/SQRT(D2)',fmt:'0.000'}],
['Threads per inch if touching (25.4 ÷ d)',{f:v=>25.4/(0.9/Math.sqrt(v.a)),fx:'=25.4/B7',fmt:'0.0'},{f:v=>25.4/(0.9/Math.sqrt(v.b)),fx:'=25.4/C7',fmt:'0.0'},{f:v=>25.4/(0.9/Math.sqrt(v.c)),fx:'=25.4/D7',fmt:'0.0'}]
]})}
<div class="note">An Ne 20 yarn is about 0.2 mm across: 126 of them touching fill an inch, which is why the maximum cover factor per direction is about 28 (126 ÷ √20). A 1 cm³/g assumption makes the yarn 5% thinner; real cotton yarns in cloth are flattened and cover more than the circular model predicts.</div></div>`});

lecture({id:'fd13',course:'fd',n:'13',title:'Crepe, Spot and Honeycomb Weaves',sub:'Weaves built on sateen bases — crepes from added marks, superimposed sateens, and the cellular honeycomb.',chips:['Crepe','Sateen base','Superimposed','Honeycomb'],tags:'crepe honeycomb sateen base superimposed spot',body:()=>`
<div class="card"><h2>Crepe weaves on a sateen base</h2>
<p>A crepe weave has an all-over pebbled, non-directional look. The classic way to construct one is to start with a sateen base and add one or more marks to every base mark in a fixed arrangement, or to superimpose two sateens. The hex codes below are the lecture’s own designs.</p>
<div class="grid2">
${W({hex:['$A1','$D1','$9C','$56','$6C','$4E','$2B','$33'],w:8,title:'8-end sateen base + 2 marks',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$AE','$D5','$BA','$57','$EA','$5D','$AB','$75'],w:8,title:'8-end sateen base and 2 by 1 by 1 by 3',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$AA','$DD','$AA','$77','$AA','$DD','$AA','$77'],w:8,title:'Spots on a plain ground',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$84','$CC','$84','$10','$30','$12','$03','$02'],w:8,title:'Motif reversed in alternate quarters',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$C0','$18','$03','$60','$0C','$81','$30','$06'],w:8,title:'Sateen derivative (two marks per base)',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$C8','$5C','$13','$62','$8C','$C5','$31','$26'],w:8,title:'8-end sateen derivative + 4-end satinette superimposed',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$80','$20','$08','$40','$04','$10'],w:6,title:'Irregular 6-end sateen',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$8A8','$64C','$193','$632','$8C9','$544','$931','$22A','$88A','$454','$151','$326'],w:12,title:'4-end and 6-end sateens superimposed (12 × 12)',size:18,colors:[IND,'#f1f5f9']})}
</div></div>
<div class="card"><h2>Honeycomb</h2>
<p>A pointed draft and a pointed lifting plan produce diamond-shaped cells whose ridges are long floats and whose hollows are tightly interlaced — a towelling weave that traps water. The 8-end version is the ordinary honeycomb; the 16-end version is the same ordinary honeycomb on a larger cell.</p>
<div class="grid2">
${W({hex:['$80','$41','$A2','$D5','$EB','$D5','$A2','$41'],w:8,title:'Honeycomb, 8 ends',size:20,colors:[IND,'#f1f5f9'],draft:true,tile:2})}
${W({hex:['$4001','$A002','$5005','$A80A','$D415','$EA2B','$F557','$FAAF','$FD5F','$FAAF','$F557','$EA2B','$D415','$A80A','$5005','$A002'],w:16,title:'Honeycomb, 16 ends',size:16,colors:[IND,'#f1f5f9'],tile:2})}
</div></div>`});

lecture({id:'fd14',course:'fd',n:'14',title:'Bedford Cord',sub:'Warp-way cords of plain or twill face separated by cutting lines, with stuffer ends for a rounder cord.',chips:['Cutting ends','Stuffer ends','Plain face','Twill face'],tags:'bedford cord stuffer cutting',body:()=>`
<div class="card"><h2>Structure</h2>
<p>A Bedford cord shows rounded warp-way ribs. Alternate picks (or pairs of picks) change over: on one pick the weft weaves plain (or twill) with the ends of cord A and floats loosely under cord B; on the next it does the reverse. The floats on the back pull each cord into a ridge. Between cords a pair of <b>cutting ends</b> weaves plain with every pick, making a sunk line. <b>Stuffer ends</b> — coarse ends lying straight between the face and the floats — make the cords fuller.</p>
<div class="grid2">
${W({hex:['$AAABFF','$7FF555','$955BFF','$7FF6AA'],w:24,title:'Plain-face Bedford cord, 24 ends',size:16,colors:[IND,'#f1f5f9'],draft:true,caption:'Ends 1–2 and 13–14 are the cutting ends (plain on every pick). Odd picks weave plain with the left cord and float under the right one; even picks do the reverse.'})}
${W({hex:['$BFEAAA','$7FF555','$AAABFF','$5557FF'],w:24,title:'Weft floating on two picks (2-and-2 order)',size:16,colors:[IND,'#f1f5f9']})}
${W({hex:['$ADB7FC','$7FEDB4','$B6D7FC','$7FEED8','$9B77FC','$7FEB6C'],w:22,title:'Twill-face Bedford cord, 22 ends',size:16,colors:[IND,'#f1f5f9'],caption:'The cord face is a 2/1 twill; six picks complete the repeat.'})}
${W({hex:['$A92AFFF','$7FFDA4A','$9296FFF','$7FFD4A5'],w:28,title:'With stuffer ends, 28 ends',size:14,colors:[IND,'#f1f5f9'],caption:'The extra ends in the middle of each cord are lifted on the floating picks and lowered on the weaving picks, so they lie straight inside the cord.'})}
</div>
<div class="note">Colour effect: weave the two pick-pairs in red and green and each cord shows a solid colour because only its own weaving picks are on its face — a two-colour cord from one warp.</div></div>`});

lecture({id:'fd16',course:'fd',n:'16',title:'Piqué',sub:'Weft-way or figured cords made with a stitching back warp: welt, loose-back and fast-back piqué, wadding picks and waved piqué.',chips:['Welt','Stitching ends','Wadding','Waved piqué'],tags:'pique welt wadding stitching',body:()=>`
<div class="card"><h2>Two warps, one cloth</h2>
<p>A piqué (welt) has a face warp weaving plain with the face picks and a <b>stitching warp</b> — usually one stitching end for every two face ends — held at high tension. On the stitching picks the back ends are lifted over the face, pulling it down into a furrow; between furrows the face bulges into a cord. <b>Wadding picks</b> are thick picks laid between face and back to fill the cords.</p>
<div class="grid2">
${W({hex:['$90','$24','$90','$24','$D8','$6C'],w:6,title:'Welt (plain piqué)',size:22,colors:[IND,'#f1f5f9'],draft:true,tile:2,caption:'Ends 2 and 5 are stitching ends, down on all face picks and lifted on picks 5–6 (the indent).'})}
${W({hex:['$90','$24','$B4','$B4','$90','$24','$D8','$6C'],w:6,title:'Loose-back welt with wadding picks 3–4',size:22,colors:[IND,'#f1f5f9'],tile:2,caption:'Wadding picks ($B4) lie under the face and over the stitching ends.'})}
${W({hex:['$90','$24','$F4','$BC','$90','$24','$D8','$6C'],w:6,title:'Fast-back welt',size:22,colors:[IND,'#f1f5f9'],tile:2,caption:'The stitching ends also interlace with the wadding picks, locking the back.'})}
${W({hex:['$934924','$259249','$9A6924','$2CB249','$D34D24','$659649','$9A6924','$2CB249','$934924','$259249','$B6DB6D','$B6DB6D','$924934','$249259','$9249A6','$2492CB','$D24D34','$649659','$9249A6','$2492CB','$924934','$249259','$B6DB6D','$B6DB6D'],w:24,title:'Waved piqué with wadding picks',size:14,colors:[IND,'#f1f5f9'],caption:'The stitching points move diagonally, so the furrow waves instead of running straight across.'})}
${W({hex:['$936D2490','$25B64924','$DA49A690','$6C92CB24','$936D2490','$25B64924','$B6DB6DB4','$B6DB6DB4','$924926D8','$24924B6C','$DA493490','$6C925924','$924926D8','$24924B6C','$B6DB6DB4','$B6DB6DB4'],w:30,title:'Another waved piqué, with wadding',size:13,colors:[IND,'#f1f5f9']})}
</div></div>`});

lecture({id:'fd17',course:'fd',n:'17',title:'Stripe and Check Designs',sub:'Combining weaves side by side (stripes) and in both directions (checks); the 36-end turned-twill check and the warp/weft-face combination.',chips:['Stripe','Check','Twill turned','Face combination'],tags:'stripe check combination twill',body:()=>`
<div class="card"><h2>Rules for combining weaves</h2>
<p>Weaves can be placed side by side when they have the same number of picks in the repeat (or a common multiple) and interlace with similar frequency, so that the fabric does not pucker. At the join, warp floats of one weave should meet weft floats of the other to make a clean cut. A <b>stripe</b> changes weave across the ends; a <b>check</b> changes it across picks as well.</p>
<div class="grid2">
${W({rows:gen(16,8,(e,p)=>e<8?TWILL('2,2',8,8)[p][e]:TWILL('2,2',8,8,1,-1)[p][e-8]),title:'Stripe: 2/2 twill Z beside 2/2 twill S',size:18,colors:[IND,'#f1f5f9'],tile:2})}
${W({rows:gen(16,16,(e,p)=>{const i=e<8?0:1,j=p<8?0:1,ph=[1,0,3,0][i*2+j];return i===j?mod(e-p+ph,4)<2:mod(e+p+ph,4)<2;}),title:'Check: twill direction turned in each quarter',size:16,colors:[IND,'#f1f5f9']})}
${W({rows:gen(32,32,(e,p)=>{const inA=(e%16)<8,inB=(p%16)<8;return inA^inB?PLAIN(2,2)[p%2][e%2]:TWILL('3,1',4,4)[p%4][e%4];}),title:'Plain / 3-1 twill check, 32 × 32',size:11,colors:[IND,'#f1f5f9'],effect:true,tile:1,caption:'Plain squares look flat and light, twill squares dense and lustrous — the lecture’s 32 × 32 table drawn as a weave.'})}
${W({hex:['$AAB1C','$AA8E3','$5531C','$550E3','$5531C','$AA8E3','$AAB1C','$AA8E3','$5531C','$550E3','$C72AA','$38EAA','$C7155','$38D55','$C7155','$38EAA','$C72AA','$38EAA','$C7155','$38D55'],w:20,title:'Warp-face / weft-face combination, 20 ends',size:14,colors:[IND,'#f1f5f9'],caption:'Plain-weave squares alternate with squares in which the ends work in groups of two and three (a rib-type weave), so a check appears in one colour of yarn.'})}
</div></div>
<div class="card"><h2>The 36-end twill check</h2>
<p>The lecture’s large example turns a 3/3 twill in blocks of 24 and 12 ends and 24 and 12 picks on a 36 × 36 repeat. The codes are reproduced exactly:</p>
${W({hex:['$C71C7171C','$E38E38E38','$71C71CC71','$38E38E8E3','$1C71C71C7','$8E38E338E','$C71C7171C','$E38E38E38','$71C71CC71','$38E38E8E3','$1C71C71C7','$8E38E338F','$C71C7171C','$E38E38E38','$71C71CC71','$38E38E8E3','$1C71C71C7','$8E38E338E','$C71C7171C','$E38E38E38','$71C71CC71','$38E38E8E3','$1C71C71C7','$8E383E38E','$71C71CC71','$E38E38E38','$C71C7171C','$8E38E338E','$1C71C71C7','$38E38E8E3','$71C71CC71','$E38E38E38','$C71C7171C','$8E38E338E','$1C71C71C7','$38E38E8E3'],w:36,title:'36-end check of 3/3 twill, turned',size:11,colors:[IND,'#f1f5f9'],tile:1})}
</div>`});

lecture({id:'fd19',course:'fd',n:'19',title:'Colour and Weave Effects',sub:'The same weave with coloured ends and picks: hairlines, hound’s tooth, bird’s eye — pattern made by colour order, not by weave.',chips:['Hairline','Hound’s tooth','Bird’s eye','Colour order'],tags:'colour weave effect houndstooth hairline',body:()=>`
<div class="card"><h2>How a colour-and-weave effect arises</h2>
<p>On the face of the cloth you see the warp colour wherever the end is lifted and the weft colour wherever the pick is on top. Arrange the warp and weft colours in an order (1 dark 1 light, 2 and 2, 4 and 4 …) and a plain weave or a twill produces patterns that the weave alone would never show. Below, the warp colour order runs across and the weft order up; the weave is the dark/white point paper on the left and the resulting cloth is on the right.</p>
<div class="grid2">
${W({rows:PLAIN(8,8),title:'Plain, 1 & 1 colouring — vertical hairlines',size:18,colors:[['#111827','#e5e7eb'],['#e5e7eb','#111827']],tile:2,caption:'Warp dark-light, weft light-dark: wherever the dark end is down, the pick on top is also dark → dark lines warp-way.'})}
${W({rows:PLAIN(8,8),title:'Plain, 1 & 1 colouring — horizontal hairlines',size:18,colors:[['#111827','#e5e7eb'],['#111827','#e5e7eb']],tile:2,caption:'Same weave, weft order shifted by one pick: the lines turn weft-way.'})}
${W({rows:TWILL('2,2',8,8),title:'2/2 twill, 4 & 4 — hound’s tooth',size:18,colors:[['#111827','#111827','#111827','#111827','#e5e7eb','#e5e7eb','#e5e7eb','#e5e7eb'],['#111827','#111827','#111827','#111827','#e5e7eb','#e5e7eb','#e5e7eb','#e5e7eb']],tile:2,caption:'The classic dog-tooth: four dark, four light in both directions on a 2/2 twill.'})}
${W({rows:PLAIN(8,8),title:'Plain, 2 & 2 colouring — bird’s eye / step',size:18,colors:[['#111827','#111827','#e5e7eb','#e5e7eb'],['#111827','#111827','#e5e7eb','#e5e7eb']],tile:2})}
${W({rows:TWILL('2,2',8,8),title:'2/2 twill, 2 & 2 — weft-way hairlines',size:18,colors:[['#111827','#111827','#e5e7eb','#e5e7eb'],['#111827','#111827','#e5e7eb','#e5e7eb']],tile:2})}
${W({rows:TWILL('2,2',8,8),title:'2/2 twill, 1 & 1 — small step effect',size:18,colors:[['#111827','#e5e7eb'],['#111827','#e5e7eb']],tile:2})}
</div>
<div class="note">The lecture encoded hound’s tooth as hex with the colour order in the first row ($3C0 … −10 and $0F0 … −10). In this companion the colour order is given separately and the weave stays a plain 2/2 twill, which is how CAD systems treat colour-and-weave effects.</div></div>`});

lecture({id:'fd20',course:'fd',n:'20',title:'Cover Factor',sub:'Relative cover from diameter and spacing, cloth cover, and the Ne cover factor — the design view of Weaving Calculations 12.',chips:['d/p','K = n√tex','Cloth cover'],tags:'cover factor density',body:()=>`
<div class="card"><h2>Cover in design terms</h2>
<p>Relative cover of one thread set is d/p — how much of the spacing the yarn fills. With d = √tex ÷ 26.7 mm, cover = (threads per 100 mm × √tex) ÷ 2670; the product n√tex is the cover factor K and 2670 is its maximum. Cloth cover combines warp and weft: C = C₁ + C₂ − C₁C₂.</p>
${S({title:'Cover factor from count and density',cols:[260,120,120],rows:[
[{h:''},{h:'Warp'},{h:'Weft'}],
['Tex',{in:'t1',v:25},{in:'t2',v:36}],
['Threads per 100 mm',{in:'n1',v:267},{in:'n2',v:334}],
['Diameter d (mm)',{f:v=>Math.sqrt(v.t1)/26.7,n:'d1',fx:'=SQRT(B2)/26.7',fmt:'0.000'},{f:v=>Math.sqrt(v.t2)/26.7,n:'d2',fx:'=SQRT(C2)/26.7',fmt:'0.000'}],
['Spacing p (mm)',{f:v=>100/v.n1,n:'p1',fx:'=100/B3',fmt:'0.000'},{f:v=>100/v.n2,n:'p2',fx:'=100/C3',fmt:'0.000'}],
['Cover factor K = n √tex',{f:v=>v.n1*Math.sqrt(v.t1),fx:'=B3*SQRT(B2)',fmt:'#,##0'},{f:v=>v.n2*Math.sqrt(v.t2),fx:'=C3*SQRT(C2)',fmt:'#,##0'}],
['Relative cover d/p',{f:v=>v.d1/v.p1,n:'c1',fx:'=B4/B5',fmt:'0.00',tot:true},{f:v=>v.d2/v.p2,n:'c2',fx:'=C4/C5',fmt:'0.00',tot:true}],
['Cloth cover C₁ + C₂ − C₁C₂',{f:v=>v.c1+v.c2-v.c1*v.c2,fx:'=B7+C7-B7*C7',fmt:'0.00',tot:true},null],
['Equivalent Ne cover factor (EPI/√Ne)',{f:v=>v.n1*0.254/Math.sqrt(590.67/v.t1),fx:'=B3*0.254/SQRT(590.67/B2)',fmt:'0.0'},{f:v=>v.n2*0.254/Math.sqrt(590.67/v.t2),fx:'=C3*0.254/SQRT(590.67/C2)',fmt:'0.0'}]
]})}
<div class="note">The lecture’s example: 25 tex at 267/100 mm covers 0.50, 36 tex at 334/100 mm covers 0.75, and the cloth is 0.88 covered — the remaining 12% is the open area that lets air (and light) through. For weavability limits and weave corrections see <a data-go="wc12">Weaving Calculations 12–13</a>.</div></div>`});

lecture({id:'fd22',course:'fd',n:'22',title:'Spot and Figured Designs',sub:'Distributing small motifs over a ground: the six methods and the sateen-base distribution over 30 ends × 40 picks.',chips:['Sateen base','Distribution','Motif','Plain ground'],tags:'spot figure distribution motif sateen base',body:()=>`
<div class="card"><h2>Placing spots</h2>
<p>A spot design repeats a small motif at regular intervals on a plain (or other) ground. The lecture lists six methods of arrangement, A to F: in straight rows, in alternate (half-drop) rows, on a twill base, on a sateen base, reversed in alternate positions, and in a diamond (pointed) order. The sateen base is the most useful because it spreads the spots evenly with no obvious lines.</p>
<p>Below, a 5-end sateen base with intervals of 6 ends and 8 picks spreads five spots over a 30 × 40 repeat; each spot is a small diamond motif and the ground is plain weave. The blue squares are motif lifts, the grey ones the plain ground.</p>
${W({rows:gen(30,40,(e,p)=>{const base=[0,2,4,1,3];let sp=false;for(let k=0;k<5;k++){const cx=base[k]*6+3,cy=k*8+4;const dx=e-cx,dy=p-cy;if((Math.abs(dx)<=2&&dy===0)||(Math.abs(dy)<=2&&dx===0)||(Math.abs(dx)===1&&Math.abs(dy)===1))sp=true;}return sp?1:(e+p)%2===0;}),marks:(()=>{const m={};const base=[0,2,4,1,3];for(let k=0;k<5;k++){const cx=base[k]*6+3,cy=k*8+4;for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){if((Math.abs(dx)<=2&&dy===0)||(Math.abs(dy)<=2&&dx===0)||(Math.abs(dx)===1&&Math.abs(dy)===1))m[(cy+dy)+','+(cx+dx)]=IND;}}return m;})(),title:'Spots on a 5-sateen base, 30 × 40',size:11,colors:[IND,'#f1f5f9'],effect:true,tile:1,caption:'Spot centres at ends 4, 16, 28, 10, 22 (move number 2 × 6 ends) and picks 5, 13, 21, 29, 37.'})}
<div class="note">When the ground is plain weave, the motif must start on an end and pick where it continues the plain order, otherwise long floats appear at its edges — the lecture’s “plain basis, alternate order” rule.</div></div>`});

lecture({id:'fd23',course:'fd',n:'23',title:'Huckaback and Mock Leno',sub:'Open, absorbent weaves: huckaback for towels and mock leno imitating the gauze of a true leno.',chips:['Huckaback','Mock leno','Floats','Open structure'],tags:'huckaback mock leno towel open',body:()=>`
<div class="card"><h2>Huckaback</h2>
<p>A huckaback alternates blocks of plain weave with blocks where ends (and picks) float over three or more threads. The floats stand out from the plain ground and make a rough, absorbent surface for towels and glass cloths.</p>
<div class="grid2">
${W({hex:['$554','$FA8','$554','$AA8','$57C','$AA8'],w:10,title:'Huckaback 1',size:20,colors:[IND,'#f1f5f9'],draft:true,tile:2})}
${W({hex:['$554','$FA8','$554','$FA8','$554','$AA8','$57C','$AA8','$57C','$AA8'],w:10,title:'Huckaback 2',size:20,colors:[IND,'#f1f5f9'],tile:2})}
</div></div>
<div class="card"><h2>Mock leno</h2>
<p>A true leno crosses the ends over each other with a doup heald; a mock leno imitates the open, perforated look with an ordinary dobby by grouping ends and picks so that they crowd together in some places and leave gaps in others.</p>
<div class="grid2">
${W({hex:['$555','$E38','$555','$AAA','$1C7','$AAA','$555','$E38','$555','$AAA','$1C7','$AAA'],w:12,title:'Mock leno A — 12 ends',size:18,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$69','$F0','$F0','$69','$96','$0F','$0F','$96'],w:8,title:'Mock leno B — 8 ends',size:20,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$B568','$5AB4','$B568','$E01C','$5AB4','$B568','$5AB4','$B568','$5AB4','$B568','$0FC0','$5AB4','$B568','$5AB4'],w:14,title:'Mock leno C — 14 ends',size:16,colors:[IND,'#f1f5f9'],tile:2})}
${W({hex:['$AAAA','$594D','$A88A','$5005','$A80A','$5005','$A88A','$594D','$AAAA','$4D59','$8AA8','$0550','$0AA8','$0550','$8AA8','$4D58'],w:16,title:'Mock leno D — 16 ends',size:16,colors:[IND,'#f1f5f9'],tile:2})}
</div></div>`});

lecture({id:'fd24',course:'fd',n:'24',title:'Fabric Analysis – Guidelines',sub:'How to take a sample apart: finding the face, the warp direction and the repeat before counting threads.',chips:['Face side','Warp direction','Repeat'],tags:'analysis guidelines face warp sample',body:()=>`
<div class="card"><h2>Which side is the face?</h2>
<p>The face is usually the side with more lustre and a clearer, better-defined weave; printed or finished fabrics show the finish on the face; warp-faced weaves (satin, twill drills) show the warp floats on the face.</p></div>
<div class="card"><h2>Which way is the warp?</h2>
<dl class="def">
<dt>Selvedge</dt><dd>If a selvedge is present the warp runs parallel to it.</dd>
<dt>Size and feel</dt><dd>Warp yarns are sized, so they feel harsher and stiffer and are harder to unravel; weft is softer.</dd>
<dt>Design direction</dt><dd>Stripes, cords and the prominent twill line usually run warp-way; the sett is normally higher in the warp.</dd>
<dt>Crimp</dt><dd>The set with more crimp (wavier when pulled out) is usually the warp in dense fabrics — though in weft-faced cloths it can be the reverse.</dd>
<dt>Folded yarns</dt><dd>If one set is two-fold and the other single, the folded yarn is almost always the warp.</dd>
<dt>Yarn quality</dt><dd>Warp yarns are generally finer, stronger and more uniform.</dd></dl></div>
<div class="card"><h2>Then analyse</h2>
<ol class="steps">
<li>Count ends and picks per inch (or cm) in several places and average.</li>
<li>Unravel a few picks and ends; note the interlacing of each end over the picks on point paper until the pattern repeats.</li>
<li>Measure crimp: straightened length ÷ cloth length − 1 (Lecture 25).</li>
<li>Weigh a measured length of unravelled ends and picks to determine the counts; confirm with the fabric weight formula (Lecture 2).</li>
<li>Record the weave, draft, peg plan and denting so the fabric can be reproduced.</li></ol></div>`});

lecture({id:'fd25',course:'fd',n:'25',title:'Crimp',sub:'Peirce’s geometry of crimp, repeated here for the design course; the calculator lives in Weaving Calculations 15–16.',chips:['Crimp %','θ, p, l','Jammed'],tags:'crimp peirce geometry',body:()=>`
<div class="card"><h2>What crimp does to a design</h2>
<p>Crimp is the waviness a yarn takes as it bends over the crossing threads: crimp % = (straightened length − cloth length) ÷ cloth length. It decides how much yarn a design consumes, how thick and how extensible the cloth is, and how dense it can be set. In a jammed plain weave of equal yarns the crimp is 20.9% in both directions; a 2/2 twill needs only 13.1%; a warp rib may take 57% in the warp and none in the weft.</p>
<div class="grid2">
<div>${crimpSVG(1,1,'Plain, equal yarns')}</div>
<div>${crimpSVG(1,2,'Plain, weft twice the warp diameter')}</div></div>
<p>Open <a data-go="wc14">Weaving Calculations 15–16</a> for the full derivation and the live calculator (θ, spacing, cover factor and crimp for any pair of diameters).</p></div>`});

lecture({id:'fd26',course:'fd',n:'26',title:'Double Cloth',sub:'Two cloths woven at once: face and back warps and wefts, and the rule that keeps them apart.',chips:['Face / back','Self-stitched','Plain + twill'],tags:'double cloth face back stitching',body:()=>`
<div class="card"><h2>The one rule</h2>
<p>A double cloth has a top (face) warp and weft and a bottom (back) warp and weft. The top layer must sit on the bottom, so <b>every top end is lifted on every back pick, and no back end is lifted on a face pick</b>. Within each layer the threads weave their own structure. Left unstitched this makes a tube or a bag; stitching points (a back end lifted over a face pick, or a face end dropped under a back pick) tie the layers and give a thick, bulky cloth.</p>
<p>In the drawings the ends alternate face (T), back (B) and the picks alternate the same way. Dark squares are the layers’ own weave; <span class="sw" style="background:#f59e0b"></span> orange squares are the face ends lifted out of the way on back picks.</p>
<div class="grid2">
${(()=>{const mk=(fw,bw,w,h,title)=>{const rows=[],marks={};for(let p=0;p<h;p++){const row=[];for(let e=0;e<w;e++){const fe=e%2===0,fp=p%2===0;let up;if(fe&&fp)up=fw(e/2,p/2);else if(fe&&!fp){up=1;marks[p+','+e]='#f59e0b';}else if(!fe&&fp)up=0;else up=bw((e-1)/2,(p-1)/2);row.push(up?1:0);}rows.push(row);}return W({rows,marks,title,size:18,colors:[IND,'#f1f5f9'],tile:1,effect:false});};
const pl=(e,p)=>(e+p)%2===0,t31=(e,p)=>mod(e-p,4)<3,t21=(e,p)=>mod(e-p,3)<2;
return mk(pl,pl,8,8,'Plain / plain double cloth')+mk(pl,t31,16,16,'Plain face, 3/1 twill back')+mk(pl,t21,12,12,'Plain face, 2/1 twill back')+mk(t31,t31,16,16,'3/1 twill both layers');})()}
</div>
<div class="note">Read any face pick (rows 1, 3, 5 …): only face ends (columns 1, 3, 5 …) are lifted, in the face weave. Read any back pick (rows 2, 4 …): every face end is up (orange) and the back ends follow the back weave. Add a stitch by lifting one back end on a face pick between two face ends that are also lifted, so the face warp on either side hides it.</div></div>`});


(function(){
if(!window.URLS)return;
go=function(id){location.href=URLS[id]!==undefined?URLS[id]:URLS[''];};
function linkify(){document.querySelectorAll('[data-go]').forEach(function(a){var p=URLS[a.dataset.go];if(p!==undefined&&a.tagName==='A'){a.setAttribute('href',p);a.removeAttribute('data-go');}});}
var r0=render;render=function(){r0();linkify();};
var b0=buildNav;buildNav=function(){b0();linkify();};
window.removeEventListener('hashchange',window.__hc);
})();
buildNav();render();
