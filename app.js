'use strict';

const modules = [
  {
    id: 'dts', name: 'DTS', title: '尺寸技术规范', subtitle: '把整车感知质量，转化为可以验证的尺寸目标。',
    scope: '本模块按常见的 Dimensional Technical Specification（尺寸技术规范）语境介绍 DTS。名称、目标分层和验收规则须以企业项目文件为准。',
    intro: 'DTS 用于约定产品的尺寸质量要求，例如车门与侧围之间的间隙、面差及其评价条件。它让设计、制造和质量团队对“达到什么状态”形成一致认识。',
    points: [
      ['间隙与面差', '间隙描述相邻零件边缘的分离距离；面差描述规定方向上相邻表面的相对高低。两者需要分别定义测量位置和方向。'],
      ['目标离不开条件', '目标值、公差或限值、测点、评价方向、车辆状态与测量方法共同构成可执行要求。只写一个数值不能完整定义验收。'],
      ['从整车到零件', '整车目标需要通过尺寸链分析、基准协调和工艺能力评估，分配到相关零件与过程；分配结果还需验证和迭代。']
    ],
    caseTitle: '总装 · 车门匹配',
    application: '假设某车门边缘的间隙目标为 4.0 ± 0.5 mm（仅作教学示例）。团队需明确沿门边的测量位置、关门状态和测量方法，再分析门框、车门、铰链及装调过程对结果的影响。',
    mistakes: ['把 DTS 的整车间隙目标直接当成某一个零件的尺寸公差。应通过尺寸链和过程能力进行分配。', '仅凭一个测点合格就判断整条间隙合格。应按约定的测点与评价规则检查一致性。'],
    questions: [
      { text: '制定车门间隙要求时，哪组信息最完整？', options: ['只给出名义间隙数值', '目标与限值、测点、方向、车辆状态和方法', '只规定车门钣金的材料牌号'], answer: 1, explanation: '尺寸目标必须连同评价条件一起定义，才能得到可比较、可执行的验收结果。' },
      { text: '整车间隙超差后，合理的第一步是什么？', options: ['直接认定冲压模具故障', '直接放宽所有零件公差', '确认测量条件，再结合尺寸链与过程数据定位原因'], answer: 2, explanation: '间隙可能受到多个零件、定位和装调过程影响。先确认测量有效性，再用证据分析贡献因素。' },
      { text: '关于间隙与面差，哪项理解正确？', options: ['分别描述边缘距离与规定方向上的表面相对高低', '两者是同一指标的不同名称', '间隙合格就能保证面差合格'], answer: 0, explanation: '间隙与面差表达不同的匹配特性，需要各自定义目标、测点和评价方法。' }
    ]
  },
  {
    id: 'rps', name: 'RPS', title: '参考点系统', subtitle: '让设计、制造与测量，在一致的参考下对话。',
    scope: 'RPS 常指 Reference Point System（参考点系统）。点位、约束方向与标识规则因企业而异；3-2-1 只是刚性工件的简化定位模型。',
    intro: 'RPS 通过规定参考位置及其约束方向，协调零件或总成在不同工序和检测环节中的位置表达。关键不在于点的数量，而在于约束关系、可实现性和基准传递的一致性。',
    points: [
      ['理解六个自由度', '刚体在空间有三个平移和三个转动自由度。定位方案要检查约束是否充分、是否重复，以及接触能否稳定实现。'],
      ['定位与夹紧分工', '定位确定工件位置；夹紧使工件可靠贴合定位元件。不能把增加夹紧力当成建立正确几何位置的替代方法。'],
      ['薄板需要额外判断', '柔性薄板可能需要辅助支承。评估定位、夹紧顺序、变形和释放后的回弹，不能机械套用六点定位。']
    ],
    caseTitle: '焊装 · 侧围定位',
    application: '侧围进入焊接夹具后，由规定的支承面和定位孔等建立位置，再按工艺顺序夹紧。检测时应确认参考体系与装夹状态；若夹具中合格、释放后偏移，要结合柔性变形和焊接过程继续分析。',
    mistakes: ['把 RPS 参考点直接等同于所有 GD&T 基准。二者需协调，但用途、表达和建立方式并不完全相同。', '认为定位点越多越稳定。重复约束可能引起装夹困难或薄板变形，需要结合实际接触分析。'],
    questions: [
      { text: '刚体在三维空间中有几个自由度？', options: ['三个，全部为平移', '六个，三个平移和三个转动', '六个，全部为转动'], answer: 1, explanation: '六自由度模型用于分析刚体的空间位置约束；柔性零件还需要考虑自身变形。' },
      { text: '薄板件装夹后变形，应该怎样处理？', options: ['持续增加夹紧力', '直接增加所有方向的定位约束', '检查接触、辅助支承、夹紧顺序与过约束'], answer: 2, explanation: '薄板的柔性使装夹状态影响测量与装配结果。应分析约束和受力，而不是简单增加力或点数。' },
      { text: '定位与夹紧的关系是什么？', options: ['定位确定位置，夹紧保持可靠贴合', '夹紧力越大，定位一定越准', '夹紧可以代替所有定位元件'], answer: 0, explanation: '定位与夹紧有不同作用。夹紧方案需服务于定位，并避免引入不必要的变形。' }
    ]
  },
  {
    id: 'gdt', name: 'GD&T', title: '几何尺寸与公差', subtitle: '用清晰的几何语言，表达产品的功能要求。',
    scope: '本模块仅讲通用概念。ISO GPS 与 ASME GD&T 的规则和默认条件存在差异；实际读图须确认图纸采用的体系、版本和企业补充要求。',
    intro: 'GD&T 用几何特征、公差带及相关基准表达形状、方向、位置和跳动等要求，连接产品功能、制造和检验。判断合格不能只看一个公差数字，还要理解其符号及适用条件。',
    points: [
      ['尺寸与几何各有作用', '尺寸要求控制大小等尺寸特性；几何公差控制形状、方向或位置等特性。孔径合格不代表孔的位置一定合格。'],
      ['基准要素不是理想基准', '基准要素是零件上被指定的实际要素；基准是按适用规则从基准要素建立的理想几何参考。两者不能混为一谈。'],
      ['完整读取标注', '读取几何特征、公差带形状与大小、修饰符和有序基准引用。并非所有几何公差都需要基准，例如平面度通常控制表面自身形状。']
    ],
    caseTitle: '零件设计 · 支架安装孔',
    application: '支架安装孔需要与车身上的配合件顺利装配。除控制孔径外，还可按所用标准定义孔的位置要求及其基准体系。检验时应采用与图纸一致的基准建立与评价规则，而非任意最佳拟合。',
    mistakes: ['认为所有几何公差都要引用基准。形状公差如平面度通常不引用基准，需按具体标准读图。', '把 ISO 与 ASME 的规则直接混用。相似的标注不意味着所有默认解释都一致。'],
    questions: [
      { text: '某安装孔孔径合格，能否据此判断位置也合格？', options: ['能，孔径决定孔的位置', '不能，还需按图纸评价位置要求', '只要外观正常就能判断合格'], answer: 1, explanation: '孔的大小和位置是不同特性。满足尺寸要求并不能替代对位置要求的评价。' },
      { text: '基准要素与基准的区别是什么？', options: ['都是实际表面，没有区别', '基准要素是理想参考，基准是实际表面', '基准要素是实际要素，基准是按规则建立的理想参考'], answer: 2, explanation: '应区分实际零件要素与由其建立的理想几何参考；具体建立方法取决于适用标准。' },
      { text: '看到平面度标注没有基准引用，合理的理解是？', options: ['平面度通常控制自身形状，不要求引用基准', '图纸必然漏标，不能继续检查', '可随意添加一个基准来判定'], answer: 0, explanation: '平面度属于形状控制，通常不依赖基准。仍需结合适用标准和完整图纸判断。' }
    ]
  },
  {
    id: 'mcp', name: 'MCP', title: '测量控制计划', subtitle: '让测量有对象、有方法，也有异常后的行动。',
    scope: 'MCP 并非跨企业统一的缩写。本网站暂按测量控制计划（Measurement Control Plan）的常见语境讲解；有的企业可能指制造控制计划等文件，实际须核对项目术语表与模板。',
    intro: '在本模块的语境中，MCP 将需要控制的尺寸特性转化为可执行的测量安排，明确测什么、如何测、何时测、由谁负责，以及异常时怎样响应。它需要与产品要求和过程风险相衔接。',
    points: [
      ['测量特性可追溯', '为特性规定编号、测点与方向，关联图纸或项目要求、限值和版本，避免点位名称相同但含义不同。'],
      ['方法与频次可执行', '明确设备、装夹与对齐方式、工件状态、采样频次及责任人。频次应结合风险和过程稳定性，不是每个点都必须全检。'],
      ['异常必须形成闭环', '约定超差后的复测、隔离或升级处理及责任分工。结合测量系统能力与过程数据判断，避免把所有偏差直接归因于零件。']
    ],
    caseTitle: '质量检测 · 白车身关键孔',
    application: '针对白车身关键安装孔，计划规定测量设备、参考对齐、特性编号、抽样频次及异常响应。当结果偏离要求时，先确认测量系统和工件状态，再按计划追溯对应批次与工位并采取措施。',
    mistakes: ['把一张测点坐标表当作完整控制计划。没有方法、频次、责任与异常响应，无法指导稳定执行。', '认为设备精度高就不用关注测量系统。装夹、对齐、环境、操作者与方法都可能影响结果。'],
    questions: [
      { text: '哪项最接近一份可执行的测量控制计划？', options: ['仅有一张测点截图', '特性与限值、方法、频次、责任人和异常响应齐全', '仅列测量设备的采购价格'], answer: 1, explanation: '计划需要让执行者知道测量对象、判断依据、执行方法以及异常后的行动。' },
      { text: '一个关键尺寸突然超差，优先如何处理？', options: ['直接修改合格限值', '删除异常数据后继续生产', '核实测量与工件状态，并按计划执行异常响应'], answer: 2, explanation: '先确认数据有效性，同时按计划控制风险，再用过程证据分析原因，不能擅自修改限值或删除数据。' },
      { text: '更换测量设备后，哪项做法合理？', options: ['评估方法、装夹、对齐和测量系统能力并更新受控计划', '沿用旧结果，无需任何验证', '只要新设备更贵就默认结果一致'], answer: 0, explanation: '设备更换可能改变测量结果。需要验证测量系统和方法的一致性，并保持计划版本可追溯。' }
    ]
  }
];

const storageKey = 'dimension-lab-progress-v1';
let answers = {};
let storageAvailable = true;
function showStorageNotice() {
  const notice = document.querySelector('#storage-notice');
  notice.hidden = false;
  notice.textContent = '当前浏览器无法保存学习记录。本次答题仍可使用，关闭页面后进度可能丢失。';
}
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    modules.forEach(module => module.questions.forEach((question, index) => {
      const key = `${module.id}-${index}`;
      if (Number.isInteger(saved[key]) && saved[key] >= 0 && saved[key] < question.options.length) answers[key] = saved[key];
    }));
  }
} catch { storageAvailable = false; showStorageNotice(); }

function saveProgress() {
  if (!storageAvailable) return;
  try { localStorage.setItem(storageKey, JSON.stringify(answers)); }
  catch { storageAvailable = false; showStorageNotice(); }
}

function updateProgress() {
  const correct = modules.reduce((sum, module) => sum + module.questions.filter((question, index) => answers[`${module.id}-${index}`] === question.answer).length, 0);
  document.querySelector('#total-score').innerHTML = `${correct}<small>/12</small>`;
  document.querySelector('#overall-progress').value = correct;
  document.querySelector('#progress-text').textContent = `${Math.round(correct / 12 * 100)}%`;
}

function feedbackMarkup(question, selected) {
  const correct = selected === question.answer;
  return `<strong>${correct ? '回答正确' : '再想一想'} · 正确答案 ${'ABC'[question.answer]}</strong><br>${question.explanation}`;
}

function renderModule() {
  const module = modules.find(item => `#${item.id}` === location.hash) || modules[0];
  const moduleIndex = modules.indexOf(module);
  document.querySelector('#breadcrumb').textContent = module.name;
  document.title = `${module.name} ${module.title} · 尺寸研习所`;
  document.querySelector('#module-nav').innerHTML = modules.map((item, index) => `<a class="nav-item" href="#${item.id}" ${item === module ? 'aria-current="page"' : ''}><span class="nav-number">0${index + 1}</span><span><strong>${item.name}</strong><small>${item.title}</small></span><span class="nav-arrow" aria-hidden="true">↗</span></a>`).join('');
  const next = modules[(moduleIndex + 1) % modules.length];
  document.querySelector('#lesson').innerHTML = `
    <div class="section-kicker">MODULE 0${moduleIndex + 1} / 04</div>
    <div class="lesson-heading"><div><h2 id="lesson-title">${module.name}<span>·</span>${module.title}</h2><p class="lesson-subtitle">${module.subtitle}</p></div><span class="module-tag">基础入门</span></div>
    <div class="scope-note"><strong>术语与适用范围</strong>　${module.scope}</div>
    <div class="content-grid">
      <article class="card concept-card"><h3 class="card-title"><span class="card-icon" aria-hidden="true">◎</span>基础概念</h3><p>${module.intro}</p><ol class="concept-list">${module.points.map(([title, content], index) => `<li><span class="point-index" aria-hidden="true">0${index + 1}</span><div><strong>${title}</strong><p>${content}</p></div></li>`).join('')}</ol></article>
      <article class="card"><h3 class="card-title"><span class="card-icon" aria-hidden="true">↗</span>实际应用</h3><span class="case-label">${module.caseTitle}</span><p>${module.application}</p></article>
      <article class="card"><h3 class="card-title"><span class="card-icon" aria-hidden="true">!</span>常见误区</h3>${module.mistakes.map(text => `<div class="mistake"><span aria-hidden="true">×</span><p>${text}</p></div>`).join('')}</article>
    </div>
    <section class="quiz-section" aria-labelledby="quiz-title"><div class="quiz-heading"><h3 id="quiz-title">检验一下你的理解</h3><span>3 道情景练习 · 提交后查看解析</span></div><div class="quiz-list">${module.questions.map((question, index) => {
      const key = `${module.id}-${index}`;
      const selected = answers[key];
      const attempted = selected !== undefined;
      return `<form class="quiz-card" data-question="${index}"><div class="question-number">QUESTION 0${index + 1}</div><fieldset><legend>${question.text}</legend><div class="options">${question.options.map((option, optionIndex) => `<label class="option"><input type="radio" name="${key}" value="${optionIndex}" ${selected === optionIndex ? 'checked' : ''}><span>${'ABC'[optionIndex]}. ${option}</span></label>`).join('')}</div></fieldset><div class="quiz-actions"><button class="check-answer" type="submit" ${attempted ? '' : 'disabled'}>检查答案</button><span class="quiz-hint">可重新选择并提交</span></div><div class="feedback ${attempted ? selected === question.answer ? 'correct' : 'incorrect' : ''}" role="status" ${attempted ? '' : 'hidden'}>${attempted ? feedbackMarkup(question, selected) : ''}</div></form>`;
    }).join('')}</div></section>
    <div class="next-module"><span>这四个模块相互协调，共同支持尺寸质量。</span><a href="#${next.id}">下一模块：${next.name} <span aria-hidden="true">→</span></a></div>`;
  document.querySelectorAll('.quiz-card').forEach(form => {
    form.addEventListener('change', () => {
      form.querySelector('button').disabled = false;
      form.querySelector('.feedback').hidden = true;
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const input = form.querySelector('input:checked');
      if (!input) return;
      const index = Number(form.dataset.question);
      const selected = Number(input.value);
      answers[`${module.id}-${index}`] = selected;
      const feedback = form.querySelector('.feedback');
      feedback.className = `feedback ${selected === module.questions[index].answer ? 'correct' : 'incorrect'}`;
      feedback.innerHTML = feedbackMarkup(module.questions[index], selected);
      feedback.hidden = false;
      saveProgress();
      updateProgress();
    });
  });
  updateProgress();
}

window.addEventListener('hashchange', () => {
  if (modules.some(module => `#${module.id}` === location.hash)) {
    renderModule();
    document.querySelector('#lesson').focus({ preventScroll: true });
    document.querySelector('#lesson').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
});
document.querySelector('#reset-progress').addEventListener('click', () => {
  if (!window.confirm('确定重置全部 12 道题的学习记录吗？')) return;
  answers = {};
  saveProgress();
  renderModule();
});
renderModule();
