import { renderMath } from './math.js';

// A structural diagram of AQ2-full. It intentionally contains no sample weights or numerical inference.
const tex = String.raw;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const math = (value, display = false, cls = '') => `<${display ? 'div' : 'span'} class="${cls}" data-tex="${escape(value)}"${display ? ' data-display="block"' : ''}></${display ? 'div' : 'span'}>`;
const STAGES = [
  { short:'总览', name:'沿时间与网络深度读图', focus:'overview', text:'横向是压缩后的时间组，纵向是网络深度。每一列经过同一套网络；实线向下传特征，虚线向右传同一层的历史状态。', formulas:[tex`\underbrace{\mathrm{RNN}_1\to\mathrm{RNN}_2}_{\text{先积累时间信息}}\to\mathrm{Transformer}^{\times3}\to\mathrm{RNN}_3\to\mathrm{Transformer}^{\times3}\to\mathrm{RNN}_4\to\mathrm{Transformer}^{\times3}\to\mathrm{RNN}_5`], definitions:[[tex`i=1,\ldots,N_s`,'稳定子编号；每个稳定子维护自己的向量。'],[tex`k`,'时间组编号；表面码仿真每组包含六个物理测量轮。'],[tex`\ell=1,\ldots,5`,'RNN 层编号；各层参数、历史状态分别维护。']], note:'展开区显示前两层 RNN 和第一段空间 Transformer；底部保留其余主干的准确顺序。AQ2-full 共 5 层 RNN、9 层空间 Transformer。' },
  { short:'输入', name:'每轮稳定子测量先做 embedding', focus:'input', text:'对一个时间组中的每一轮，分别嵌入每个稳定子的测量与 detection event，并加入空间位置。此时尚未合并六轮。', formulas:[tex`f_{i,t}=\mathrm{Embed}\!\left(m_{i,t},e_{i,t},x_i,y_i\right)\in\mathbb{R}^{512}`,tex`F_t\in\mathbb{R}^{N_s\times512}`], definitions:[[tex`m_{i,t}`,'第 t 个物理轮中，稳定子 i 的测量结果。'],[tex`e_{i,t}`,'由稳定子测量变化得到的 detection event。'],[tex`f_{i,t}`,'一个稳定子、一个物理轮的特征向量。']], note:'这里以表面码输入为例。颜色码与 Bell-flagged 颜色码的输入还按对应设置使用测量与 flag 信息。' },
  { short:'压缩', name:'按顺序拼接六轮，再投影到一个时间组', focus:'compression', text:'同一个稳定子的六个向量按时间顺序拼接，得到 3072 维向量，再投影回 512 维。压缩输出 z 是第一层 RNN 的当前输入。', formulas:[tex`z_{i,k}=W_C\!\left[f_{i,6k-5};\,f_{i,6k-4};\,\cdots;\,f_{i,6k}\right]+b_C`,tex`6\times512\ \xrightarrow{\mathrm{Concat}}\ 3072\ \xrightarrow{\mathrm{Project}}\ 512,\qquad u^{(1)}_{i,k}=z_{i,k}`], definitions:[[tex`z_{i,k}`,'稳定子 i 在时间组 k 的压缩观测特征。'],[tex`[\,\cdot\,;\,\cdot\,]`,'按顺序拼接向量；不是将六轮直接取平均。'],[tex`W_C,b_C`,'通过训练学习的压缩投影参数。']], note:'六轮一组对应论文的仿真表面码配置；仿真颜色码为三轮，Willow 数据为五轮。最终数据读出形成的末帧独立嵌入。' },
  { short:'RNN₁', name:'第一层：把当前观测与本层历史结合', focus:'rnn1', text:'当前组压缩特征 z 从上方进入；第一层上一组的隐藏状态从左侧进入。输出既传给当前组的 RNN₂，也保存为下一组的第一层记忆。', formulas:[tex`u^{(1)}_{i,k}=z_{i,k}`,tex`h^{(1)}_{i,k}=\mathrm{RMSNorm}\!\left(\mathrm{GELU}\!\left(W_1[z_{i,k};h^{(1)}_{i,k-1}]+b_1\right)\right)`], definitions:[[tex`z_{i,k}`,'当前组、当前稳定子的压缩观测。'],[tex`h^{(1)}_{i,k-1}`,'同一层、同一稳定子在上一组留下的记忆。'],[tex`h^{(1)}_{i,k}`,'更新后的状态：向下传给 RNN₂，向右留给下一时间组。']], note:'实验开始时，第一层每个稳定子的隐藏状态都初始化为零向量。同一 RNN 层对各稳定子分别更新，并在稳定子与时间组之间共享参数。' },
  { short:'RNN₂', name:'第二层：接收第一层特征，维护第二层记忆', focus:'rnn2', text:'第二层当前输入 u² 是当前组的第一层输出 h¹。它与第二层自己保存的上一组状态 h² 结合，得到交给空间 Transformer 的新特征。', formulas:[tex`u^{(2)}_{i,k}=h^{(1)}_{i,k}`,tex`h^{(2)}_{i,k}=\mathrm{RMSNorm}\!\left(\mathrm{GELU}\!\left(W_2[h^{(1)}_{i,k};h^{(2)}_{i,k-1}]+b_2\right)\right)`,tex`H^{(2)}_k=\begin{bmatrix}(h^{(2)}_{1,k})^\mathsf{T}\\\vdots\\(h^{(2)}_{N_s,k})^\mathsf{T}\end{bmatrix}\in\mathbb{R}^{N_s\times512}`], definitions:[[tex`h^{(1)}_{i,k}`,'从上一网络层传来的当前组特征。'],[tex`h^{(2)}_{i,k-1}`,'第二层自己的历史状态；不同于第一层的历史状态。'],[tex`H^{(2)}_k`,'将当前组全部稳定子的第二层输出堆叠成矩阵。']], note:'RNN₁ 与 RNN₂ 有不同的参数。交给 Transformer 的是 Nₛ 个稳定子 token，不是逐比特的错误概率。' },
  { short:'空间层', name:'在同一时间组内，全部稳定子做 self-attention', focus:'spatial', text:'Transformer 同时接收当前组全部稳定子的向量，用带二维空间 RoPE 的多头 self-attention 交换信息，再用 gated dense 更新。它不在不同时间组之间做 attention。', formulas:[tex`A=\mathrm{MHA}\!\left(\mathrm{RMSNorm}(H^{(2)}_k);\,\mathrm{RoPE}_{x,y}\right),\qquad Y=H^{(2)}_k+A`,tex`H'_k=Y+\mathrm{GatedDense}\!\left(\mathrm{RMSNorm}(Y)\right)`,tex`\mathrm{head}_a=\mathrm{softmax}\!\left(\frac{Q_aK_a^{\mathsf T}}{\sqrt{32}}\right)V_a,\qquad\mathrm{MHA}=\mathrm{Concat}(\mathrm{head}_1,\ldots,\mathrm{head}_{16})W_O`], definitions:[[tex`Q_a,K_a,V_a\in\mathbb{R}^{N_s\times32}`,'每个头分别投影出 Q、K、V；共 16 头，Q、K 中加入二维空间 RoPE。'],[tex`N_s\times N_s`,'每个注意力头在当前组稳定子之间计算的权重矩阵形状。'],[tex`N_s\times512`,'空间层输入与输出的形状；每个稳定子仍对应一个 token。']], note:'第一段包含三个连续空间 Transformer。后续 RNN 再将含有空间关联的特征沿时间积累；图中黄色模块之间没有跨时间箭头。' },
  { short:'读出', name:'末帧通过同一主干，最后聚合逻辑读出', focus:'readout', text:'由最终数据比特读出推导的稳定子末帧单独嵌入，经过同一套主干。Readout 对最终稳定子特征做 pooling，用逻辑可观测量 embedding 与 cross-attention 汇集信息，再输出逻辑标签概率。', formulas:[tex`q_L=\frac{1}{N_s}\sum_{i=1}^{N_s}h_{i,\mathrm{final}}+e_L`,tex`r_L=\mathrm{CrossAttention}(q_L,H_{\mathrm{final}},H_{\mathrm{final}}),\qquad p_L=\sigma\!\left(\mathrm{ReadoutMLP}(r_L)\right)`], definitions:[[tex`H_{\mathrm{final}}`,'末帧通过主干后，所有稳定子的最终特征。'],[tex`e_L`,'用于区分指定逻辑可观测量的可学习 embedding。'],[tex`p_L`,'论文所定义的二元逻辑标签为 1 的概率，用于最终解码。']], note:'此处 Readout 公式为结构示意，省略其内部重复层。末帧不是常规六轮组；输出也不是每个物理比特的错误概率。' },
];

const centers = [200, 460, 720, 1000];
const columnTex = [tex`k-1`,tex`k`,tex`k+1`,tex`\mathrm{final}`];
const active = (focus, kind, col) => focus === 'overview' || (focus === 'readout' ? col === 3 : focus === kind && col === 1);
const foreignMath = (x,y,w,h,value,cls='') => `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" class="arch-svg-math ${cls}">${math(value)}</div></foreignObject>`;
function box(x,y,w,h,kind,focus,col,label,detail='') {
  const cls = `${active(focus,kind,col)?'is-focused':''} ${focus!=='overview'&&!active(focus,kind,col)?'is-dimmed':''}`;
  const layers = ['rnn1','rnn2','compression','input'].includes(kind) ? `<rect class="arch-diagram-sheet" x="${x-w/2-8}" y="${y-h/2-8}" width="${w}" height="${h}" rx="5"/><rect class="arch-diagram-sheet" x="${x-w/2-4}" y="${y-h/2-4}" width="${w}" height="${h}" rx="5"/>` : '';
  return `<g class="arch-module arch-module-${kind} ${cls}" data-module="${kind}" data-col="${col}">${layers}<rect class="arch-module-face" x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="6"/><text class="arch-module-name" x="${x}" y="${detail?y-7:y+5}" text-anchor="middle">${label}</text>${detail?foreignMath(x-w/2+7,y+1,w-14,31,detail):''}</g>`;
}
function vertical(x,y1,y2,focus,kind,col, label='') {
  const on=active(focus,kind,col);
  return `<path class="arch-data-edge ${on?'is-focused':''}" d="M${x},${y1} L${x},${y2}" marker-end="url(#arch-down-arrow)"/>${label?foreignMath(x+8,(y1+y2)/2-12,130,29,label,'arch-edge-math'):''}`;
}
function memories(y,layer,focus,kind) {
  return centers.slice(0,3).map((x,col)=>{
    const next=centers[col+1];
    const label=col===2?tex`\cdots`:tex`h^{(${layer})}_{i,${col===0?'k-1':'k'}}`;
    const focused=focus===kind&&(col===0||col===1);
    return `<path class="arch-memory-edge ${focused?'is-focused':''}" d="M${x+96},${y} L${next-103},${y}" marker-end="url(#arch-memory-arrow)"/>${foreignMath(x+96,y-32,next-x-199,28,label,'arch-memory-math')}`;
  }).join('');
}
function diagram(focus) {
  let svg=`<svg class="arch-network-svg" viewBox="0 0 1170 860" role="img" aria-labelledby="arch-diagram-title arch-diagram-description"><title id="arch-diagram-title">AlphaQubit 2 的时间组与网络层数据流</title><desc id="arch-diagram-description">从左到右是k减1、k、k加1和最终稳定子帧。从上到下是测量、压缩、两层RNN、三个空间Transformer、其余主干以及最终Readout。实线向下传特征，虚线向右传每层独立的循环状态。Transformer在同组稳定子之间交换信息。</desc><defs><marker id="arch-down-arrow" markerWidth="8" markerHeight="8" refX="6.2" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7"/></marker><marker id="arch-memory-arrow" markerWidth="8" markerHeight="8" refX="6.2" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7"/></marker></defs>`;
  svg+=`<rect class="arch-current-lane" x="340" y="13" width="240" height="724" rx="12"/><text class="arch-current-label" x="460" y="29" text-anchor="middle">当前展开的时间组</text><text class="arch-axis-time" x="1138" y="50" text-anchor="end">时间 →</text><text class="arch-axis-depth" x="23" y="54">网络深度 ↓</text>`;
  centers.forEach((x,col)=>{
    svg+=foreignMath(x-97,41,194,32,col<3?tex`\text{时间组 }${columnTex[col]}`:tex`\text{末帧 }${columnTex[col]}`,'arch-col-label');
    if(col===3){
      svg+=box(x,115,190,57,'input',focus,col,'最终数据比特读出',tex`\text{推导终端稳定子帧}`);
      svg+=vertical(x,146,183,focus,'readout',col);
      svg+=box(x,220,190,59,'compression',focus,col,'独立一帧 embedding',tex`f_{i,\mathrm{final}}\in\mathbb{R}^{512}`);
    } else {
      svg+=box(x,115,190,57,'input',focus,col,'连续六轮稳定子测量',tex`m_{i,t},\ e_{i,t}\quad(6\text{轮})`);
      svg+=vertical(x,146,183,focus,'compression',col);
      svg+=box(x,220,190,59,'compression',focus,col,'Embedding → 拼接 → 投影',tex`6\times512\ \longrightarrow\ 512`);
    }
    svg+=vertical(x,252,291,focus,'rnn1',col,col===1?tex`u^{(1)}_{i,k}=z_{i,k}`:'');
    svg+=box(x,328,190,59,'rnn1',focus,col,'RNN₁ · 各稳定子分别更新',col===1?tex`u^{(1)}_{i,k}\mapsto h^{(1)}_{i,k}`:tex`\mathbb{R}^{512}\to\mathbb{R}^{512}`);
    svg+=vertical(x,360,401,focus,'rnn2',col,col===1?tex`u^{(2)}_{i,k}=h^{(1)}_{i,k}`:'');
    svg+=box(x,438,190,59,'rnn2',focus,col,'RNN₂ · 各稳定子分别更新',col===1?tex`u^{(2)}_{i,k}\mapsto h^{(2)}_{i,k}`:tex`\mathbb{R}^{512}\to\mathbb{R}^{512}`);
    svg+=vertical(x,470,513,focus,'spatial',col,col===1?tex`H^{(2)}_k\in\mathbb{R}^{N_s\times512}`:'');
    const cls=`${active(focus,'spatial',col)?'is-focused':''} ${focus!=='overview'&&!active(focus,'spatial',col)?'is-dimmed':''}`;
    svg+=`<g class="arch-module arch-module-spatial ${cls}" data-module="spatial" data-col="${col}"><rect class="arch-module-face" x="${x-100}" y="522" width="200" height="76" rx="6"/><text class="arch-module-name" x="${x}" y="547" text-anchor="middle">空间 Transformer ×3</text><text class="arch-module-subtitle" x="${x}" y="567" text-anchor="middle">同组全部稳定子之间做 attention</text>${[-63,-42,-21,0,21,42,63].map(dx=>`<circle class="arch-token-dot" cx="${x+dx}" cy="583" r="4"/>`).join('')}</g>`;
    svg+=vertical(x,601,630,focus,'continuation',col);
    const contcls=focus==='overview'||focus==='readout'&&col===3?'is-focused':'is-dimmed';
    svg+=`<g class="arch-module arch-module-continuation ${contcls}"><rect class="arch-module-face" x="${x-100}" y="638" width="200" height="85" rx="6"/><text class="arch-continuation-label" x="${x}" y="659" text-anchor="middle">继续通过同一套主干</text><text class="arch-continuation-flow" x="${x}" y="683" text-anchor="middle">RNN₃ → Transformer ×3</text><text class="arch-continuation-flow" x="${x}" y="704" text-anchor="middle">→ RNN₄ → Transformer ×3 → RNN₅</text></g>`;
    if(col===3){svg+=vertical(x,726,773,focus,'readout',col,tex`H_{\mathrm{final}}`);svg+=box(x,807,200,55,'readout',focus,col,'Readout',tex`p_L=\Pr(L=1\mid\text{测量记录})`);}
  });
  svg+=memories(328,1,focus,'rnn1')+memories(438,2,focus,'rnn2');
  svg+=`<text class="arch-row-side-label" x="27" y="218">时间压缩</text><text class="arch-row-side-label" x="27" y="328">时间混合</text><text class="arch-row-side-label" x="27" y="438">时间混合</text><text class="arch-row-side-label" x="27" y="560">空间混合</text><text class="arch-row-side-label" x="27" y="680">后续层</text><text class="arch-omitted-time" x="860" y="100">⋯</text>`;
  svg+=`<path class="arch-zero-guide" d="M${centers[0]-106},328 L${centers[0]-89},328"/><text class="arch-small-diagram-note" x="104" y="772">每个 RNN 层都有自己的历史状态；仅在实验开始时初始化为零。</text><text class="arch-small-diagram-note" x="104" y="795">黄色空间层按时间组独立计算，没有跨组 attention。</text><text class="arch-small-diagram-note" x="104" y="818">末帧单独嵌入，再经过同一主干；推理时最后才运行 Readout。</text></svg>`;
  return svg;
}

function zoomNode(x,y,w,h,label,formula='',kind='neutral') {
  return `<g class="arch-zoom-node arch-zoom-${kind}"><rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="5"/><text x="${x}" y="${formula?y-7:y+5}" text-anchor="middle">${label}</text>${formula?foreignMath(x-w/2+5,y+2,w-10,h/2-1,formula,'arch-zoom-math'):''}</g>`;
}
function zoomPath(path,memory=false,label='',lx=0,ly=0,lw=150) {
  return `<path class="arch-zoom-edge ${memory?'is-memory':''}" d="${path}" marker-end="url(#${memory?'arch-memory-arrow':'arch-down-arrow'})"/>${label?foreignMath(lx,ly,lw,28,label,'arch-zoom-edge-label'):''}`;
}
function rnnZoom(layer) {
  const input=layer===1?tex`u^{(1)}_{i,k}=z_{i,k}`:tex`u^{(2)}_{i,k}=h^{(1)}_{i,k}`;
  const state=tex`h^{(${layer})}_{i,k-1}`;
  const output=tex`h^{(${layer})}_{i,k}`;
  return `<div class="arch-module-inset"><div class="arch-inset-heading"><span>模块展开 / RNN${layer===1?'₁':'₂'}</span><p>固定一个稳定子 i：当前输入与本层历史状态合并，输出分成网络深度和时间两个方向。</p></div><div class="arch-inset-scroll" tabindex="0" role="region" aria-label="可横向滚动的RNN第${layer}层内部结构"><svg class="arch-rnn-zoom-svg" viewBox="0 0 1190 245" role="img" aria-label="当前组输入与同层历史状态拼接为1024维，投影为512维，经过GELU及RMSNorm得到新状态，并传给下一层及下一组。">${zoomNode(98,76,165,57,'当前组的输入',input,'input')}${zoomNode(98,177,165,57,'本层上一组的状态',state,'memory')}${zoomNode(290,126,117,67,'Concat',tex`512+512=1024`,'operation')}${zoomNode(452,126,117,67,'Linear',tex`1024\to512`,'operation')}${zoomNode(600,126,102,67,'GELU','','operation')}${zoomNode(748,126,124,67,'RMSNorm','','operation')}${zoomNode(915,126,127,67,'新状态',output,'output')}${zoomNode(1104,76,145,57,'下一网络层',output,'output')}${zoomNode(1104,177,145,57,'下一时间组',output,'memory')}${zoomPath('M180,76 L207,76 L207,110 L231,110')}${zoomPath('M180,177 L207,177 L207,143 L231,143',true)}${zoomPath('M349,126 L393,126')}${zoomPath('M511,126 L549,126')}${zoomPath('M651,126 L686,126')}${zoomPath('M810,126 L851,126')}${zoomPath('M979,126 L1004,126 L1004,76 L1031,76')}${zoomPath('M979,126 L1004,126 L1004,177 L1031,177',true)}<text class="arch-zoom-foot-label" x="20" y="231">同一层在各稳定子与时间组之间共享参数；RNN₁、RNN₂ 的参数各自独立。</text></svg></div></div>`;
}
function spatialZoom() {
  return `<div class="arch-module-inset"><div class="arch-inset-heading"><span>模块展开 / 一个空间 Transformer</span><p>上半部展开一个注意力头，16 个头并行计算；下半部汇总各头，并完成两次残差更新。</p></div><div class="arch-inset-scroll" tabindex="0" role="region" aria-label="可横向滚动的空间Transformer内部结构"><svg class="arch-spatial-zoom-svg" viewBox="0 0 1280 460" role="img" aria-label="输入经过RMSNorm和QKV投影，Q与K加入二维RoPE，计算缩放点积与Softmax，再加权Value。16头拼接、输出投影、残差，之后RMSNorm、门控全连接和第二次残差得到输出。"><rect class="arch-head-boundary" x="346" y="7" width="825" height="204" rx="8"/><text class="arch-head-boundary-label" x="1153" y="201" text-anchor="end">一个注意力头 a · 共 16 头并行</text>${zoomNode(88,99,127,59,'输入',tex`H\in\mathbb{R}^{N_s\times512}`,'input')}${zoomNode(250,99,124,59,'RMSNorm','','operation')}${zoomNode(429,44,135,52,'Q 投影 + RoPE',tex`Q_a\in\mathbb{R}^{N_s\times32}`,'projection')}${zoomNode(429,108,135,52,'K 投影 + RoPE',tex`K_a\in\mathbb{R}^{N_s\times32}`,'projection')}${zoomNode(429,172,135,52,'V 投影',tex`V_a\in\mathbb{R}^{N_s\times32}`,'projection')}${zoomNode(647,76,188,66,'缩放点积',tex`Q_aK_a^{\mathsf T}/\sqrt{32}`,'attention')}${zoomNode(849,76,134,66,'Softmax',tex`A_a\in\mathbb{R}^{N_s\times N_s}`,'attention')}${zoomNode(1053,107,180,66,'加权汇集 value',tex`O_a=A_aV_a`,'attention')}${zoomPath('M152,99 L188,99')}${zoomPath('M312,99 L335,99 L335,44 L361,44')}${zoomPath('M312,99 L335,99 L335,108 L361,108')}${zoomPath('M312,99 L335,99 L335,172 L361,172')}${zoomPath('M497,44 L526,44 L526,61 L553,61')}${zoomPath('M497,108 L526,108 L526,91 L553,91')}${zoomPath('M741,76 L782,76')}${zoomPath('M916,76 L940,76 L940,107 L963,107')}${zoomPath('M497,172 L521,172 L521,229 L1053,229 L1053,140')}${zoomPath('M1143,107 L1213,107 L1213,267 L91,267 L91,309',false,tex`O_1,\ldots,O_{16}`,592,242,180)}${zoomNode(91,340,144,60,'Concat 16 heads',tex`16\times32=512`,'attention')}${zoomNode(276,340,135,60,'输出投影',tex`W_O:\ 512\to512`,'projection')}${zoomNode(431,340,61,60,'＋','','residual')}${zoomNode(583,340,135,60,'RMSNorm','','operation')}${zoomNode(778,340,164,60,'Gated Dense','','operation')}${zoomNode(948,340,61,60,'＋','','residual')}${zoomNode(1127,340,171,60,'输出',tex`H'\in\mathbb{R}^{N_s\times512}`,'output')}${zoomPath('M163,340 L208,340')}${zoomPath('M344,340 L400,340')}${zoomPath('M462,340 L515,340')}${zoomPath('M651,340 L696,340')}${zoomPath('M860,340 L917,340')}${zoomPath('M979,340 L1041,340')}${zoomPath('M88,129 L88,238 L431,238 L431,309',false,tex`H\ \text{残差}`,171,214,160)}${zoomPath('M482,340 L482,425 L948,425 L948,371',false,tex`Y\ \text{残差}`,590,398,180)}<text class="arch-zoom-foot-label" x="24" y="451">全部操作都在同一时间组内完成；Nₛ 个稳定子 token 之间交换信息，输出 token 数保持不变。</text></svg></div></div>`;
}
function moduleInset(stage){return stage===3?rnnZoom(1):stage===4?rnnZoom(2):stage===5?spatialZoom():'';}

export function mountArchitecture(container) {
  let stage=0,playing=false,timer=null;
  function pause(){clearInterval(timer);timer=null;playing=false;}
  function render(){
    const item=STAGES[stage];
    container.className='arch-paper-view';
    container.innerHTML=`<div class="arch-paper-toolbar"><div class="arch-paper-stepper" role="group" aria-label="选择网络讲解步骤">${STAGES.map((s,index)=>`<button type="button" class="arch-paper-step ${index===stage?'is-active':''}" data-stage="${index}" aria-pressed="${index===stage}"><span>${index===0?'◉':String(index).padStart(2,'0')}</span>${s.short}</button>`).join('')}</div><div class="arch-paper-playback"><button class="btn" type="button" data-action="prev" ${stage===0?'disabled':''} aria-label="上一步">←</button><button class="btn primary" type="button" data-action="play" aria-pressed="${playing}">${playing?'Ⅱ 暂停':'▶ 自动讲解'}</button><button class="btn" type="button" data-action="next" ${stage===STAGES.length-1?'disabled':''} aria-label="下一步">→</button></div></div><div class="arch-paper-figure"><div class="arch-figure-topline"><div><span class="arch-figure-kicker">ALPHAQUBIT 2 · FULL</span><h2>跨时间组展开的网络结构</h2></div><span class="arch-current-step">${stage===0?'网络总览':`步骤 ${stage} / 6 · ${item.short}`}</span></div><div class="arch-network-scroll" role="region" tabindex="0" aria-label="可横向滚动的 AlphaQubit 2 网络结构图">${diagram(item.focus)}</div><div class="arch-paper-legend"><span><i class="arch-legend-line"></i>实线：当前组沿网络层传特征</span><span><i class="arch-legend-line is-memory"></i>虚线：同一 RNN 层沿时间传状态</span><span><i class="arch-legend-stack"></i>叠片：各稳定子分别维护向量</span></div></div>${moduleInset(stage)}<section class="arch-step-detail" aria-labelledby="arch-explanation-title"><div class="arch-detail-header"><span>读图 / ${String(stage).padStart(2,'0')}</span><h3 id="arch-explanation-title">${item.name}</h3><p>${item.text}</p></div><div class="arch-detail-body"><div class="arch-equations">${item.formulas.map(value=>math(value,true,'arch-equation')).join('')}</div><dl class="arch-definitions">${item.definitions.map(([symbol,definition])=>`<div><dt>${math(symbol)}</dt><dd>${definition}</dd></div>`).join('')}</dl></div><div class="arch-paper-note">${item.note}</div></section>`;
    renderMath(container);
    const scroller=container.querySelector('.arch-network-scroll');
    const svg=container.querySelector('.arch-network-svg');
    if(scroller&&svg&&scroller.clientWidth){
      const target=item.focus==='overview'?0:item.focus==='readout'?1000:460;
      const scale=svg.getBoundingClientRect().width/1170;
      scroller.scrollLeft=target===0?0:Math.max(0,target*scale-scroller.clientWidth/2);
    }
    container.dispatchEvent(new CustomEvent('aq2-stage-change',{bubbles:true,detail:{stage,focus:item.focus}}));
  }
  function change(next){stage=Math.min(STAGES.length-1,Math.max(0,next));render();}
  function click(event){
    const step=event.target.closest('[data-stage]');
    if(step){pause();change(Number(step.dataset.stage));return;}
    const button=event.target.closest('[data-action]');if(!button)return;
    if(button.dataset.action==='prev'){pause();change(stage-1);}
    if(button.dataset.action==='next'){pause();change(stage+1);}
    if(button.dataset.action==='play'){
      if(playing){pause();render();}
      else{if(stage===STAGES.length-1)stage=0;playing=true;render();timer=setInterval(()=>{if(stage<STAGES.length-1)stage++;if(stage===STAGES.length-1)pause();render();},4200);}
    }
  }
  container.addEventListener('click',click);render();
  return{pause(){pause();render();},onEnter(){render();},onLeave(){pause();render();},destroy(){pause();container.removeEventListener('click',click);},getState(){return{stage,playing,focus:STAGES[stage].focus};}};
}
