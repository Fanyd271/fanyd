import { renderMath } from './math.js';

const ROWS = [
  {id:'rnn1',label:'RNN₁',kind:'rnn',layer:1},
  {id:'rnn2',label:'RNN₂',kind:'rnn',layer:2},
  {id:'tf1',label:'Transformer ×3',kind:'spatial'},
  {id:'rnn3',label:'RNN₃',kind:'rnn',layer:3},
  {id:'tf2',label:'Transformer ×3',kind:'spatial'},
  {id:'rnn4',label:'RNN₄',kind:'rnn',layer:4},
  {id:'tf3',label:'Transformer ×3',kind:'spatial'},
  {id:'rnn5',label:'RNN₅',kind:'rnn',layer:5},
];
const PHASES = ['collect', ...ROWS.map(r=>r.id), 'carry'];
const BLOCK_GROUPS = 4;
const BLOCKS = 3;
const LAST_STEP = BLOCKS * PHASES.length + 3;
const WIDTH = 1120;
const HEIGHT = 705;
const X0 = 164;
const CW = 66;
const TOP = 188;
const RH = 55;
const TERMINAL_X = 1035;
const fmtTex = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const tex = (value, display = false) => `<span data-tex="${fmtTex(value)}"${display?' data-display="block"':''}></span>`;
const symbol = n => ['₀','₁','₂','₃','₄','₅'][n] || String(n);
const blockName = i => ['A','B','C'][i] || String(i + 1);
const xFor = group => X0 + group * CW + CW/2;
const yFor = row => TOP + row * RH;

function stageFor(step) {
  if (step < BLOCKS * PHASES.length) {
    const block = Math.floor(step / PHASES.length);
    const phase = step % PHASES.length;
    return {block, phase, id:PHASES[phase], ending:false, first:block*BLOCK_GROUPS+1,last:(block+1)*BLOCK_GROUPS};
  }
  const index = step - BLOCKS * PHASES.length;
  return {block:2,phase:10,id:['terminal-arrival','terminal-core','readout','done'][index],ending:true,first:9,last:12};
}

export function mountStreaming(container, demo) {
  let step = 0;
  let scan = 0;
  let timer = null;
  let tick = 0;
  let destroyed = false;
  container.innerHTML = `
    <div class="stream-paper-intro"><div><p class="eyebrow">02 / STREAMING EXECUTION</p><h2 class="section-title">沿时间接收，沿网络深度计算</h2><p class="muted">按论文图 1c / 图 7 展开：灰色 RNN 沿时间递推，黄色 Transformer 在同一层并行处理已到达的时间组。</p></div><span class="stream-paper-badge">AQ2-full · 5 RNN / 9 Transformer</span></div>
    <div class="stream-paper-toolbar"><div class="control-row"><button class="btn primary stream-paper-play" type="button">播放数据流</button><button class="btn stream-paper-next" type="button">下一步</button><button class="btn ghost stream-paper-reset" type="button">重置</button></div><div class="stream-paper-step"><span class="stream-paper-step-index"></span><strong class="stream-paper-step-name"></strong></div></div>
    <section class="panel stream-paper-network" aria-label="AQ2流式计算网络图"><div class="stream-paper-legend"><span><i class="done"></i>已完成</span><span><i class="temporal"></i>当前 RNN</span><span><i class="spatial"></i>当前 Transformer</span><span><i class="buffer"></i>已到达，尚未处理</span><span><i class="future"></i>未来测量</span></div><div class="stream-paper-diagram-scroll"><div class="stream-paper-diagram"></div></div><div class="stream-paper-diagram-caption"><span>横向 → 时间组（每组 6 轮）</span><span>纵向 ↓ 网络层</span><span>红框：当前数据块，4 组 = 24 轮</span></div></section>
    <section class="panel stream-paper-explanation" aria-live="polite"><div class="stream-paper-explanation-head"><span class="eyebrow stream-paper-phase-label"></span><h3 class="stream-paper-explanation-title"></h3></div><div class="stream-paper-equation"></div><p class="stream-paper-explanation-text"></p><div class="stream-paper-memory-note"></div></section>
    <p class="stream-paper-source-note subtle">主干顺序与因果关系依据论文图 1、图 7 和附录 A.1。每组 6 轮对应仿真表面码；每块 4 组是讲解选择。动画节奏不代表实际计算耗时。每个 RNN 节点代表全部稳定子分别进行更新，空间 Transformer 才在稳定子之间交换信息。</p>
  `;
  const $ = selector => container.querySelector(selector);
  const diagram = $('.stream-paper-diagram');
  const play = $('.stream-paper-play');

  function stop() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    play.textContent = step >= LAST_STEP ? '演示结束' : '播放数据流';
  }

  function statusForGroup(group, stage) {
    const start = stage.block * BLOCK_GROUPS;
    const end = start + BLOCK_GROUPS;
    if (stage.ending || group < start) return 'done';
    if (group < end) return stage.phase === 0 && stage.block === 0 && group >= 2 ? 'future' : 'buffer';
    const arrivedNext = stage.phase > 0 ? Math.min(4, Math.floor(stage.phase/2)) : 0;
    return group < end + arrivedNext ? 'buffer' : 'future';
  }

  function rowState(group, rowIndex, stage) {
    const first = stage.block * BLOCK_GROUPS;
    if (stage.ending || group < first) return 'done';
    if (group >= first + BLOCK_GROUPS || stage.phase === 0) return 'pending';
    if (stage.id === 'carry') return 'done';
    const activeRow = stage.phase - 1;
    return rowIndex < activeRow ? 'done' : rowIndex === activeRow ? ROWS[rowIndex].kind === 'rnn' ? 'temporal' : 'spatial' : 'pending';
  }

  function drawDiagram(stage) {
    let svg = `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="stream-network-title stream-network-desc"><title id="stream-network-title">AlphaQubit 2 流式网络计算图</title><desc id="stream-network-desc">横向为时间组，每组6轮。纵向为5层RNN和9层空间Transformer。当前数据块4组以红框标出。高亮RNN按时间递推，高亮Transformer并行处理当前块内各组，未来测量不参与计算。</desc><defs><marker id="stream-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke"/></marker><marker id="stream-arrow-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#087f8c"/></marker></defs>`;
    const start = stage.block * BLOCK_GROUPS;
    const end = start + BLOCK_GROUPS;
    const topZones = [];
    if (start > 0) topZones.push({start:0,end:start,label:'Processed · 已处理',kind:'processed'});
    if (!stage.ending) topZones.push({start,end,label:`Current block ${blockName(stage.block)} · 当前块`,kind:'current'});
    if (end < 12 && !stage.ending) topZones.push({start:end,end:12,label:'Available / Future · 缓冲 / 未来',kind:'future'});
    if (stage.ending) topZones.push({start:0,end:12,label:'Processed · 常规块全部完成',kind:'processed'});
    for (const zone of topZones) {
      const left = X0 + zone.start * CW + 4;
      const right = X0 + zone.end * CW - 4;
      svg += `<line x1="${left}" x2="${right}" y1="30" y2="30" class="stream-paper-zone-line ${zone.kind}"/><text x="${(left+right)/2}" y="21" text-anchor="middle" class="stream-paper-zone-label ${zone.kind}">${zone.label}</text>`;
    }
    svg += `<text x="18" y="67" class="stream-paper-row-label">稳定子测量</text><text x="18" y="85" class="stream-paper-secondary">每组含连续 6 轮</text>`;
    for (let group = 0; group < 12; group += 1) {
      const status = statusForGroup(group, stage);
      const x = xFor(group);
      for(let round=0;round<6;round+=1)svg += `<line x1="${x-20+round*8}" y1="52" x2="${x-20+round*8}" y2="69" class="stream-paper-measure ${status}"/>`;
      svg += `<text x="${x}" y="90" text-anchor="middle" class="stream-paper-group-label ${status}">G${group+1}</text>`;
      svg += `<line x1="${x}" y1="98" x2="${x}" y2="112" class="stream-paper-vertical ${status}" marker-end="url(#stream-arrow)"/>`;
      svg += `<rect x="${x-25}" y="118" width="50" height="24" rx="4" class="stream-paper-compression ${status}"/><text x="${x}" y="134" text-anchor="middle" class="stream-paper-node-text ${status}">压缩</text>`;
      svg += `<line x1="${x}" y1="143" x2="${x}" y2="167" class="stream-paper-vertical ${status}" marker-end="url(#stream-arrow)"/>`;
    }
    svg += `<text x="18" y="135" class="stream-paper-row-label">Temporal compression</text>`;
    if (!stage.ending) svg += `<rect x="${X0+start*CW-2}" y="105" width="${BLOCK_GROUPS*CW+4}" height="${RH*7+126}" rx="7" class="stream-paper-block-outline"/><text x="${X0+start*CW+8}" y="656" class="stream-paper-block-label">块 ${blockName(stage.block)}：G${stage.first}–G${stage.last}</text>`;
    for (let row = 0; row < ROWS.length; row += 1) {
      const layer = ROWS[row];
      const y = yFor(row);
      const activeRow = !stage.ending && stage.id === layer.id;
      svg += `<text x="18" y="${y+5}" class="stream-paper-row-label ${activeRow ? layer.kind : ''}">${layer.label}</text>`;
      if(layer.kind==='rnn') svg+=`<text x="18" y="${y+21}" class="stream-paper-secondary">时间递推 →</text>`;
      else svg+=`<text x="18" y="${y+21}" class="stream-paper-secondary">组间并行 · 组内 attention</text>`;
      for(let group=0;group<12;group+=1){
        const x=xFor(group);
        const status=rowState(group,row,stage);
        const inputStatus=statusForGroup(group,stage);
        const strong=activeRow&&layer.kind==='rnn'&&group===start+scan;
        if(row>0)svg+=`<line x1="${x}" y1="${yFor(row-1)+17}" x2="${x}" y2="${y-18}" class="stream-paper-vertical ${status==='done'?'done':status==='pending'?'pending':status}" marker-end="url(#stream-arrow)"/>`;
        if(layer.kind==='rnn'){
          if(group<11){const next=rowState(group+1,row,stage);const arrowActive=activeRow&&group>=start&&group<end-1;svg+=`<line x1="${x+22}" y1="${y}" x2="${xFor(group+1)-23}" y2="${y}" class="stream-paper-memory-edge ${arrowActive?'temporal':status==='done'&&next==='done'?'done':'pending'}" marker-end="url(#stream-arrow)"/>`;}
          svg+=`<rect x="${x-22}" y="${y-15}" width="44" height="30" rx="5" class="stream-paper-rnn-node ${status} ${strong?'focus':''}"/>`;
          svg+=`<text x="${x}" y="${y+4}" text-anchor="middle" class="stream-paper-node-text ${status}">h${symbol(layer.layer)}</text>`;
          if(activeRow&&group>=start&&group<end)svg+=`<text x="${x}" y="${y-22}" text-anchor="middle" class="stream-paper-order-label">${group-start+1}</text>`;
        }else{
          for(let stack=2;stack>=0;stack-=1)svg+=`<rect x="${x-22-stack*2}" y="${y-15-stack*2}" width="44" height="30" rx="3" class="stream-paper-transformer-node ${status}"/>`;
          svg+=`<text x="${x}" y="${y+4}" text-anchor="middle" class="stream-paper-node-text ${status}">T ×3</text>`;
          if(activeRow&&group>=start&&group<end)svg+=`<text x="${x}" y="${y-25}" text-anchor="middle" class="stream-paper-parallel-label">并行</text>`;
        }
        if(inputStatus==='future'&&group>=end)svg+=`<line x1="${x-17}" y1="${y+10}" x2="${x+17}" y2="${y-10}" class="stream-paper-future-slash"/>`;
      }
      if(layer.kind==='rnn'&&!stage.ending){
        const boundaryX=X0+end*CW-1;
        if(stage.id==='carry')svg+=`<circle cx="${boundaryX}" cy="${y}" r="8" class="stream-paper-memory-token"/><text x="${boundaryX}" y="${y-13}" text-anchor="middle" class="stream-paper-memory-label">h${symbol(layer.layer)}</text>`;
        if(stage.block>0){
          const prevX=X0+start*CW-5;
          svg+=`<circle cx="${prevX}" cy="${y}" r="6" class="stream-paper-memory-token inherited"/>`;

        }
      }
    }
    const terminalActive=stage.id==='terminal-arrival'||stage.id==='terminal-core';
    svg+=`<text x="${TERMINAL_X}" y="31" text-anchor="middle" class="stream-paper-zone-label">Terminal</text><text x="${TERMINAL_X}" y="63" text-anchor="middle" class="stream-paper-group-label ${stage.ending?'buffer':'future'}">最终数据读出</text><line x1="${TERMINAL_X}" y1="73" x2="${TERMINAL_X}" y2="112" class="stream-paper-vertical ${stage.ending?'buffer':'pending'}" marker-end="url(#stream-arrow)"/><rect x="${TERMINAL_X-30}" y="118" width="60" height="24" rx="4" class="stream-paper-compression ${terminalActive?'buffer':'pending'}"/><text x="${TERMINAL_X}" y="134" text-anchor="middle" class="stream-paper-node-text">单独嵌入</text>`;
    for(let row=0;row<ROWS.length;row+=1){
      const y=yFor(row);const isDone=stage.id==='readout'||stage.id==='done';const status=isDone?'done':stage.id==='terminal-core'?(ROWS[row].kind==='rnn'?'temporal':'spatial'):'pending';
      svg+=`<line x1="${TERMINAL_X}" y1="${row===0?144:yFor(row-1)+17}" x2="${TERMINAL_X}" y2="${y-18}" class="stream-paper-vertical ${status}" marker-end="url(#stream-arrow)"/><rect x="${TERMINAL_X-22}" y="${y-15}" width="44" height="30" rx="4" class="${ROWS[row].kind==='rnn'?'stream-paper-rnn-node':'stream-paper-transformer-node'} ${status}"/>`;
      if(ROWS[row].kind==='rnn')svg+=`<line x1="${xFor(11)+24}" y1="${y}" x2="${TERMINAL_X-24}" y2="${y}" class="stream-paper-memory-edge ${stage.ending?'done':'pending'}" marker-end="url(#stream-arrow)"/>`;
    }
    const readoutActive=stage.id==='readout'||stage.id==='done';
    svg+=`<line x1="${TERMINAL_X}" y1="${yFor(7)+17}" x2="${TERMINAL_X}" y2="638" class="stream-paper-vertical ${readoutActive?'done':'pending'}" marker-end="url(#stream-arrow)"/><rect x="${TERMINAL_X-43}" y="644" width="86" height="36" rx="6" class="stream-paper-readout ${readoutActive?'active':''}"/><text x="${TERMINAL_X}" y="667" text-anchor="middle" class="stream-paper-readout-text">Readout</text>`;
    svg+=`<text x="${X0}" y="693" class="stream-paper-secondary">每列：一个时间组中的全部稳定子特征；每个 RNN 层分别保存自己的历史状态。</text></svg>`;
    diagram.innerHTML=svg;
  }

  function explain(stage) {
    const k = stage.first + scan;
    const prior = stage.first-1;
    let title, text, equation, memory;
    const phaseLabel = stage.ending ? 'FINAL FRAME & READOUT' : `BLOCK ${blockName(stage.block)} · GROUPS ${stage.first}–${stage.last}`;
    if(stage.id==='collect'){
      title=stage.block===0?'先接收测量，再组成当前数据块':'下一块已进入缓冲区，接续处理';
      text=stage.block===0?'连续六轮测量先压缩成一个时间组。图中以四组作为一个数据块，收齐后开始计算；右侧尚未到达的测量不参与当前计算。':'处理前一块时，新测量已继续到达缓冲区。现在切换当前块，但各层 RNN 的历史状态继续保留。';
      equation=tex(String.raw`z_{i,k}=C\!\left(f_{i,6k-5},\ldots,f_{i,6k}\right),\qquad \mathcal B_{${stage.block+1}}=\{G_{${stage.first}},\ldots,G_{${stage.last}}\}`,true);
      memory=stage.block===0?'初始化：每个稳定子、每层 RNN 的隐藏状态均为零。':`块 ${blockName(stage.block)} 从上一块末组 G${prior} 的五层状态继续计算。`;
    }else if(stage.id==='carry'){
      title='块计算完成：五层记忆分别带入下一块';
      text='红框内各时间组已完成整套主干。右边界的五个状态标记对应五层 RNN 的末组状态；换块时保留它们，无需从头重算历史测量。';
      equation=tex(String.raw`\mathcal S_{${stage.block+1}}=\left\{h^{(\ell)}_{i,${stage.last}}:\ell=1,\ldots,5;\ i=1,\ldots,N_s\right\}`,true);
      memory=stage.block<2?`下一块 ${blockName(stage.block+1)}：每层分别读取自己的 h，而不是共享一个状态。`:'三个常规数据块全部处理完成；继续等待最终数据读出形成的末帧。';
    }else if(stage.id==='terminal-arrival'){
      title='实验结束：单独接收最终的稳定子帧';
      text='最后的数据比特读出用于构造 terminal stabilizers。这一帧单独嵌入，不与前面的六轮一组合并。';
      equation=tex(String.raw`z_{i,\mathrm{end}}=\operatorname{Embed}_{\mathrm{end}}\!\left(s_{i,\mathrm{end}}\right)`,true);
      memory='主干已积累的五层状态仍然保留，作为处理末帧的历史信息。';
    }else if(stage.id==='terminal-core'){
      title='末帧经过相同主干，接续已有的历史状态';
      text='末帧沿右侧同一套 RNN / Transformer 层向下计算。RNN 各层分别接续常规块末尾的状态；空间层在本帧稳定子之间交换信息。';
      equation=tex(String.raw`h^{(\ell)}_{i,\mathrm{end}}=F_\ell\!\left(u^{(\ell)}_{i,\mathrm{end}},h^{(\ell)}_{i,12}\right)`,true);
      memory='这里没有读取实验之后的未来测量，也没有跨时间的 self-attention。';
    }else if(stage.id==='readout'||stage.id==='done'){
      title=stage.id==='done'?'流式演示完成：历史已通过循环状态保留下来':'最后运行 Readout，输出逻辑预测';
      text='将最终的稳定子特征送入 Readout，聚合并预测指定逻辑可观测量的二元标签。常规块持续处理 syndrome，并不等于每块都向量子芯片施加物理纠错。';
      equation=tex(String.raw`p_\theta\!\left(L=1\mid s_{1:\mathrm{end}}\right)=\operatorname{Readout}\!\left(\{h^{(5)}_{i,\mathrm{end}}\}_{i=1}^{N_s}\right)`,true);
      memory='流式计算减少结束时尚未处理的历史；吞吐率与最终结果延迟是不同指标。';
    }else{
      const row=ROWS.find(r=>r.id===stage.id);
      if(row.kind==='rnn'){
        const layer=row.layer;
        title=`${row.label}：同一层沿当前块的四个时间组递推`;
        text=`按 G${stage.first} → G${stage.first+1} → G${stage.first+2} → G${stage.last} 的顺序计算。每组使用本层上一组的 h；各稳定子分别更新。图上的横向箭头传时间记忆，向下箭头传给下一网络层。`;
        const input=layer===1?'z_{i,k}':layer===2?'h^{(1)}_{i,k}':'\\operatorname{Spatial}_{\\mathrm{lower}}(\\cdot)';
        equation=tex(String.raw`h^{(${layer})}_{i,k}=\operatorname{RMSNorm}\!\left[\operatorname{GELU}\!\left(W_${layer}\left[u^{(${layer})}_{i,k};h^{(${layer})}_{i,k-1}\right]+b_${layer}\right)\right]`,true)+tex(String.raw`u^{(${layer})}_{i,k}=${input}`,true);
        memory=stage.block===0?`块 A 的起点：h${symbol(layer)}(i,0)=0。现在高亮 G${k}，RNN₁ 到 RNN₂ 是网络深度，Gk−1 到 Gk 是时间。`:`当前块起点：RNN${symbol(layer)} 读取上一块保留的 h${symbol(layer)}(i,${prior})；该状态不重新清零。`;
      }else{
        title='空间 Transformer：四个时间组并行计算';
        text=`当前 RNN 层已经给出 G${stage.first}–G${stage.last} 的输入。这四组各自执行三层空间 Transformer：每组内部所有稳定子之间做 self-attention，组与组之间不做 attention。`;
        equation=tex(String.raw`\widetilde H_k=\operatorname{SpatialTransformer}^{\times3}(H_k),\qquad k\in\{${stage.first},\ldots,${stage.last}\}`,true);
        memory='可以并行的是同一空间层在多个已到达时间组上的计算；下一层 RNN 仍然按组顺序递推。';
      }
    }
    $('.stream-paper-phase-label').textContent=phaseLabel;
    $('.stream-paper-explanation-title').textContent=title;
    $('.stream-paper-explanation-text').textContent=text;
    $('.stream-paper-equation').innerHTML=equation;
    $('.stream-paper-memory-note').textContent=memory;
    renderMath($('.stream-paper-equation'));
  }

  function render(){
    if(destroyed)return;
    const stage=stageFor(step);
    $('.stream-paper-step-index').textContent=`步骤 ${step+1} / ${LAST_STEP+1}`;
    $('.stream-paper-step-name').textContent=stage.id==='collect'?`收集块 ${blockName(stage.block)}`:stage.id==='carry'?'保留五层状态':stage.id==='terminal-arrival'?'接收末帧':stage.id==='terminal-core'?'末帧通过主干':stage.id==='readout'?'最终 Readout':stage.id==='done'?'演示完成':ROWS.find(r=>r.id===stage.id)?.label||'';
    $('.stream-paper-next').disabled=step>=LAST_STEP;
    play.disabled=step>=LAST_STEP;
    drawDiagram(stage); explain(stage);
  }

  function next(){
    if(step<LAST_STEP){step+=1;scan=0;tick=0;render();}
    if(step>=LAST_STEP)stop();
  }
  function toggle(){
    if(timer!==null){stop();return;}
    if(step>=LAST_STEP)return;
    play.textContent='暂停';
    timer=window.setInterval(()=>{
      const stage=stageFor(step);
      const row=ROWS.find(r=>r.id===stage.id);
      if(row?.kind==='rnn'&&tick<3){tick+=1;scan=tick;render();}
      else{next();}
    },360);
  }
  play.addEventListener('click',toggle);
  $('.stream-paper-next').addEventListener('click',()=>{stop();next();});
  $('.stream-paper-reset').addEventListener('click',()=>{stop();step=0;scan=0;tick=0;render();});
  render();
  return {pause:stop,onLeave:stop,onEnter:render,destroy(){stop();destroyed=true;container.innerHTML='';},getState(){return {step,scan,stage:stageFor(step),playing:timer!==null,totalSteps:LAST_STEP+1};}};
}
