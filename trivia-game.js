/* Scripture trivia boards. Prompts live in data/trivia.json, which has no answer key.
   The boards open for practice. A choice is never marked right or wrong. */
window.TriviaGame=(()=>{
  let root,ctx,library=null,mode=null,open=null,notice=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function hide(){root=null;open=null;notice=null;mode=null}
  async function load(){if(!library)library=await ctx.api('/study/trivia')}
  function unscoredNote(){return `<p class="lead">This board cannot be scored. There is no answer key, so a choice is not marked right or wrong.</p>`}
  function render(){
    if(!root)return;
    if(!mode){
      root.innerHTML=`<button class="text-button" data-nav="challenges">← Quizzes & games</button><span class="eyebrow">PLAY THE SCRIPTURES</span><h1>The question is yours.</h1>${unscoredNote()}<div class="challenge-grid"><button class="card challenge-card" data-trivia="select" data-mode="answer-board"><span class="eyebrow">ANSWER BOARD</span><h2>Survey Says</h2><p>Family Feud style. Read the prompt and the biblical choices. Nothing here is scored.</p></button><button class="card challenge-card" data-trivia="select" data-mode="jeopardy"><span class="eyebrow">CATEGORY BOARD</span><h2>Jeopardy</h2><p>Pick a clue and read the responses in question form. Nothing here is scored.</p></button></div><p class="footnote">The answer board point order is curated for play. It does not represent an actual survey.</p>`;
      return;
    }
    root.innerHTML=`<button class="text-button" data-trivia="boards">← Boards</button><span class="eyebrow">${mode==='jeopardy'?'CATEGORY BOARD':'ANSWER BOARD'}</span><h1>${mode==='jeopardy'?'Clues across Scripture.':'Name what the Bible names.'}</h1>${unscoredNote()}${mode==='jeopardy'?jeopardyBoard():answerBoard()}${notice?`<div class="card trivia-feedback" role="status"><strong>Not scored</strong><p>${esc(notice)}</p></div>`:''}<p class="footnote">Scripture references use KJV numbering. Orthodox Psalter numbers can differ.</p>`;
  }
  function jeopardyBoard(){
    const items=library.jeopardy||[],cats=[...new Set(items.map(q=>q.category))];
    return `<div class="jeopardy-board">${cats.map(cat=>`<div class="jeopardy-column"><h3>${esc(cat)}</h3>${items.filter(q=>q.category===cat).map(q=>`<button data-trivia="open" data-id="${esc(q.id)}">${esc(q.points)}</button>`).join('')}</div>`).join('')}</div>${open?clue(items.find(q=>q.id===open)):''}`;
  }
  function answerBoard(){
    const items=library.answerBoard||[];
    return `<div class="feud-list">${items.map(q=>`<button class="card feud-round" data-trivia="open" data-id="${esc(q.id)}"><strong>${esc(q.prompt)}</strong><span>${(q.choices||[]).length} choices</span></button>`).join('')}</div>${open?clue(items.find(q=>q.id===open)):''}`;
  }
  function clue(q){
    if(!q)return '';
    const choices=(q.choices||[]).map((choice,i)=>`<button data-trivia="answer" data-id="${esc(q.id)}" data-choice="${i}">${mode==='jeopardy'?`${esc(q.answerForm||'')} ${esc(choice)}?`:esc(choice)}</button>`).join('');
    return `<section class="card trivia-clue" id="active-clue"><span class="eyebrow">${mode==='jeopardy'?`${esc(q.category)} · ${esc(q.points)} POINTS`:'SCRIPTURE CHOICES'}</span><h2>${esc(q.prompt)}</h2><div class="trivia-choices">${choices}</div><p class="small">${q.reference?`Passage on this card: ${esc(q.reference)}. `:''}Choosing one does not score the board.</p></section>`;
  }
  function click(e){
    if(!root||!root.contains(e.target))return;
    const button=e.target.closest('[data-trivia]');
    if(!button)return;
    const action=button.dataset.trivia;
    if(action==='boards'){mode=null;open=null;notice=null;render();return}
    if(action==='retry'){library=null;load().then(render).catch(err=>{root.innerHTML=`<div class="empty error">${esc(err.message)} <button data-trivia="retry">Try again</button></div>`});return}
    if(action==='select'){mode=button.dataset.mode;open=null;notice=null;render();return}
    if(action==='open'){open=button.dataset.id;notice=null;render();root.querySelector('#active-clue')?.scrollIntoView({block:'nearest',behavior:'smooth'});return}
    if(action==='answer'){
      const items=mode==='jeopardy'?(library.jeopardy||[]):(library.answerBoard||[]);
      const q=items.find(item=>item.id===button.dataset.id);
      notice=q?`This board cannot be scored. There is no answer key, so this choice is not marked right or wrong.${q.reference?` The card names ${q.reference}.`:''}`:'This board cannot be scored. There is no answer key, so this choice is not marked right or wrong.';
      render();
      root.querySelector('.trivia-feedback')?.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
  }
  return {pending:null,show:async(el,options)=>{const preset=window.TriviaGame.pending;window.TriviaGame.pending=null;hide();root=el;ctx=options;if(preset==='jeopardy'||preset==='answer-board')mode=preset;root.innerHTML='<div class="loading">Opening games…</div>';try{await load();render()}catch(e){root.innerHTML=`<div class="empty error">${esc(e.message)} <button data-trivia="retry">Try again</button></div>`}},hide,click};
})();
