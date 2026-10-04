/* Scripture trivia prompts live in data/trivia.json, which has no answer key.
   Timed solo and friend rooms are not offered: there is nothing to score,
   and the friends worker does not run these boards. */
window.TriviaGame=(()=>{
  let root;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function hide(){root=null}
  function render(){
    if(!root)return;
    root.innerHTML=`<button class="text-button" data-nav="challenges">← Quizzes & games</button><span class="eyebrow">SCRIPTURE TRIVIA</span><h1>These boards cannot be scored here.</h1><p class="lead">The prompts are saved in this app, but there is no answer key, so a timed round cannot be scored and a friend room cannot be checked. Those modes are not offered. Jeopardy and Family Feud on the Games page are separate, and they can be played there.</p>`;
  }
  function click(e){if(!root||!root.contains(e.target))return;const button=e.target.closest('[data-nav]');if(button&&button.dataset.nav==='challenges')hide()}
  return {show(el){hide();root=el;render()},hide,click};
})();
