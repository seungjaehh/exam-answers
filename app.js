'use strict';
const $ = id => document.getElementById(id);
const data = {...window.EXAM_DATA, records: window.EXAM_DATA.records.filter(r=>r.variant!=='화법과 작문')};
let subject = 'all', zoom = 100, fitWidth = 700, active = null;
const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const years = Array.from({length:Number(data.updated.slice(0,4))-2019},(_,i)=>Number(data.updated.slice(0,4))-i);
$('year').innerHTML='<option value="all">전체 연도</option>'+years.map(y=>`<option value="${y}">${y}년</option>`).join('');
$('year').value=String(data.records[0]?.year || years[0]);
$('updated').textContent=data.updated;$('end-year').textContent=years[0];
$('exam-count').textContent=new Set(data.records.map(r=>r.date)).size;$('sheet-count').textContent=data.records.length;
function render(){
 const previousMonth=$('month').value;
 const availableMonths=[...new Set(data.records.filter(r=>($('year').value==='all'||String(r.year)===$('year').value)&&($('agency').value==='all'||r.agency===$('agency').value)&&(subject==='all'||r.subject===subject)).map(r=>r.month))].sort((a,b)=>a-b);
 $('month').replaceChildren(new Option('전체 월','all'),...availableMonths.map(m=>new Option(`${m}월`,String(m))));
 $('month').value=availableMonths.some(m=>String(m)===previousMonth)?previousMonth:'all';
 const rows=data.records.filter(r=>($('year').value==='all'||String(r.year)===$('year').value)&&($('month').value==='all'||String(r.month)===$('month').value)&&($('agency').value==='all'||r.agency===$('agency').value)&&(subject==='all'||r.subject===subject));
 const groups=Map.groupBy ? Map.groupBy(rows,r=>r.date) : rows.reduce((m,r)=>(m.has(r.date)?m.get(r.date).push(r):m.set(r.date,[r]),m),new Map());
 $('result-title').textContent=($('year').value==='all'?'전체':$('year').value+'년')+' 시험 목록';
 $('result-count').textContent=`${groups.size}개 시험 · ${rows.length}개 정답표`;
 $('results').innerHTML=Array.from(groups,([date,list])=>{const r=list[0];const title=r.title.split('\u00a0')[0];return `<article class="exam"><div class="exam-top"><span class="badge ${r.agency==='교육청'?'school':''}">${r.agency}</span><time datetime="${date}">${date.replaceAll('-','. ')}</time></div><h3>${r.year}년 ${r.month}월 ${r.kind==='수능'?'수능':r.agency==='평가원'?'모의평가':'학력평가'}</h3><p class="detail">${escapeHTML(title)}</p><div class="answer-buttons">${list.slice().sort((a,b)=>a.subject.localeCompare(b.subject,'ko')||a.variant.localeCompare(b.variant,'ko')).map(s=>`<button class="answer-button ${s.subject==='영어'?'eng':''}" data-id="${escapeHTML(s.id)}">${s.subject} ${s.form||""} <span>${s.variant==='공통'?'정답표 보기 ↗':escapeHTML(s.variant)+' ↗'}</span></button>`).join('')}</div></article>`}).join('')||'<div class="empty"><strong>조건에 맞는 자료가 없습니다.</strong>연도·월·주관기관을 바꾸거나 필터를 초기화해 주세요.</div>';
}
for(const id of ['year','month','agency']) $(id).addEventListener('change',render);
$('subjects').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;subject=b.dataset.subject;for(const x of $('subjects').children)x.setAttribute('aria-pressed',String(x===b));render()});
$('reset').onclick=()=>{for(const id of ['year','month','agency'])$(id).value='all';$('subjects').querySelector('button').click()};
function applyZoom(){ $('zoom-label').textContent=zoom+'%';$('answer-image').style.width=Math.round(fitWidth*zoom/100)+'px';$('minus').disabled=zoom<=50;$('plus').disabled=zoom>=300; }
function fit(){fitWidth=Math.max(200,$('image-area').clientWidth-(innerWidth<680?44:60));zoom=100;applyZoom()}
function openAnswer(id){
 active=data.records.find(r=>r.id===id);if(!active)return;
 $('viewer-title').textContent=`${active.year}년 ${active.month}월 ${active.subject} · ${active.variant} ${active.form||""}${active.kind==="수능"?" · 수능":""}`;
 $('viewer-meta').textContent=`${active.date} · ${active.agency} · EBSi 원본 정답표`;
 $('original').href=active.image;$('solution').hidden=!active.solution;if(active.solution)$('solution').href=active.solution;
 const img=$('answer-image');img.hidden=true;$('image-status').hidden=false;$('image-status').textContent='정답표를 불러오는 중입니다…';
 img.onload=()=>{img.hidden=false;$('image-status').hidden=true;};
 img.onerror=()=>{img.hidden=true;$('image-status').hidden=false;$('image-status').textContent='정답표를 불러오지 못했습니다. 인터넷 연결을 확인하거나 위의 원본 버튼으로 열어 주세요.';};
 img.alt=`${active.title} 정답표`;img.src=active.image;
 $('viewer').showModal();document.body.classList.add('modal-open');fit();$('image-area').scrollTo(0,0);
}
$('results').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)openAnswer(b.dataset.id)});
$('close').onclick=()=>$('viewer').close();
$('viewer').addEventListener('close',()=>{document.body.classList.remove('modal-open');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});$('answer-image').removeAttribute('src');});
$('plus').onclick=()=>{zoom=Math.min(300,zoom+25);applyZoom()};$('minus').onclick=()=>{zoom=Math.max(50,zoom-25);applyZoom()};$('fit').onclick=fit;
$('fullscreen').hidden=!document.fullscreenEnabled;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('viewer').requestFullscreen();fit()}catch{$('fullscreen').textContent='브라우저 확대 사용'}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'전체화면 종료':'전체화면';if($('viewer').open)fit()});
window.addEventListener('resize',()=>{if($('viewer').open&&zoom===100)fit()});
render();
