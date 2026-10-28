// activities: pick an option per row, then Check
document.querySelectorAll('[data-activity]').forEach(box=>{
  const rows=[...box.querySelectorAll('.act-row')], res=box.querySelector('.result');
  rows.forEach(r=>r.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>{
    r.querySelectorAll('.opt').forEach(o=>o.classList.remove('sel','ok','bad'));b.classList.add('sel');res.textContent='';})));
  box.querySelector('[data-check]').addEventListener('click',()=>{
    let n=0;
    rows.forEach(r=>{const s=r.querySelector('.opt.sel');r.querySelectorAll('.opt').forEach(o=>o.classList.remove('ok','bad'));
      if(!s)return; if(s.dataset.v===r.dataset.a){s.classList.add('ok');n++}else s.classList.add('bad');});
    res.className='result '+(n===rows.length?'ok':'bad');
    res.textContent=n===rows.length?'All correct!':n+' / '+rows.length+' correct. Fix the red ones and try again.';});
  box.querySelector('[data-reset]').addEventListener('click',()=>{rows.forEach(r=>r.querySelectorAll('.opt').forEach(o=>o.classList.remove('sel','ok','bad')));res.textContent='';});
});
// think-reveal
document.querySelectorAll('.tbtn').forEach(b=>b.addEventListener('click',()=>{
  const a=b.nextElementSibling;a.classList.toggle('open');const ic=b.querySelector('span[aria-hidden]');if(ic)ic.textContent=a.classList.contains('open')?'▴':'▾';}));
// quiz
const quiz=document.getElementById('quiz');
if(quiz){
  quiz.querySelectorAll('.q .opt').forEach(b=>b.addEventListener('click',()=>{
    b.parentElement.querySelectorAll('.opt').forEach(o=>o.classList.remove('sel'));b.classList.add('sel');}));
  document.getElementById('submitQuiz').addEventListener('click',()=>{
    let n=0;const qs=quiz.querySelectorAll('.q');
    qs.forEach(q=>{q.querySelectorAll('.opt').forEach(o=>o.classList.remove('ok','bad'));
      const s=q.querySelector('.opt.sel');q.querySelectorAll('.opt').forEach(o=>{if(o.dataset.c==='1')o.classList.add('ok')});
      if(s){if(s.dataset.c==='1')n++;else s.classList.add('bad')}});
    const r=document.getElementById('quizRes');r.className='result '+(n===qs.length?'ok':'bad');r.textContent='Score: '+n+' / '+qs.length;});
}
// mark scheme
[['msBtn','ms'],['msBtn2','ms2']].forEach(([b,m])=>{const btn=document.getElementById(b);
  if(btn)btn.addEventListener('click',()=>{const el=document.getElementById(m);el.classList.toggle('open');btn.textContent=el.classList.contains('open')?'Hide mark scheme':'Show mark scheme';});});
