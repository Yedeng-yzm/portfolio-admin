// 个人网站 · 内容管理后台
// 原理：读取/写入 portfolio 仓库里的 data.js，通过 GitHub Contents API 提交，个人站自动生效。
// 所有内容只存在你自己的浏览器 localStorage，不上传任何服务器。

const CONFIG = {
  owner: 'Yedeng-yzm',          // GitHub 用户名
  repo: 'portfolio',            // 个人站仓库名
  path: 'data.js',              // 内容文件路径
  branch: 'main',
  password: 'admin123',         // 管理密码（可改成你自己的，改这里即可）
};

let state = null;   // 当前内容数据（与 data.js 里的 SITE_DATA 同结构）
let fileSha = null; // data.js 在 GitHub 上的 sha，保存时需要带上

const LS_KEY = 'portfolio-admin-auth';

/* ================= 工具 ================= */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}

/* UTF-8 安全的 base64（GitHub API 用 base64 传文件内容） */
function b64Encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
function b64Decode(b64) {
  const bin = atob(String(b64).replace(/\s+/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/* data.js 文本 <-> 数据对象 */
function parseData(text) {
  const win = {};
  new Function('window', text)(win);
  return win.SITE_DATA;
}
function serializeData(data) {
  return 'window.SITE_DATA = ' + JSON.stringify(data, null, 2) + ';\n';
}

/* ================= 本地存储 ================= */
function getAuth() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function setAuth(a) { localStorage.setItem(LS_KEY, JSON.stringify(a)); }
function getToken() { return getAuth().token || ''; }

/* ================= GitHub API ================= */
function ghHeaders(token) {
  return {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function loadFromGitHub() {
  const token = getToken();
  if (!token) throw new Error('缺少 GitHub Token，请重新登录');
  const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}?ref=${CONFIG.branch}`;
  const res = await fetch(url, { headers: ghHeaders(token) });
  if (!res.ok) throw new Error(`读取失败 HTTP ${res.status}：${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  fileSha = json.sha;
  state = parseData(b64Decode(json.content));
  renderAll();
}

async function saveToGitHub() {
  const token = getToken();
  if (!token) throw new Error('缺少 GitHub Token，请重新登录');
  if (!fileSha) throw new Error('尚未读取过文件，请先点击「从 GitHub 读取」');
  const content = b64Encode(serializeData(state));
  const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'update: 更新个人网站内容',
      content,
      sha: fileSha,
      branch: CONFIG.branch,
    }),
  });
  if (!res.ok) throw new Error(`保存失败 HTTP ${res.status}：${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  fileSha = json.content.sha;
}

/* ================= 渲染 ================= */
function renderAll() {
  if (!state) return;
  renderProfile();
  renderSkills();
  renderProjects();
  renderBlog();
}

function renderProfile() {
  const p = state.profile || {};
  const typing = (p.typing || []).map((t, i) => `
    <div class="line">
      <input data-path="profile.typing.${i}" value="${esc(t)}" placeholder="一句话介绍">
      <button class="btn-del" data-action="del-typing" data-idx="${i}">删除</button>
    </div>`).join('');
  const about = (p.about || []).map((a, i) => `
    <div class="line">
      <textarea data-path="profile.about.${i}">${esc(a)}</textarea>
      <button class="btn-del" data-action="del-about" data-idx="${i}">删除</button>
    </div>`).join('');
  const timeline = (p.timeline || []).map((t, i) => `
    <div class="line">
      <input data-path="profile.timeline.${i}.time" value="${esc(t.time)}" style="width:120px" placeholder="时间">
      <input data-path="profile.timeline.${i}.text" value="${esc(t.text)}" placeholder="内容">
      <button class="btn-del" data-action="del-timeline" data-idx="${i}">删除</button>
    </div>`).join('');

  document.getElementById('panel-profile').innerHTML = `
    <h2>基本资料</h2>
    <div class="field-grid">
      <label><span class="field-label">姓名</span><input data-path="profile.name" value="${esc(p.name)}"></label>
      <label><span class="field-label">英文名</span><input data-path="profile.enName" value="${esc(p.enName)}"></label>
      <label><span class="field-label">身份 / 一句话介绍</span><input data-path="profile.role" value="${esc(p.role)}"></label>
      <label><span class="field-label">浏览器标题</span><input data-path="profile.siteTitle" value="${esc(p.siteTitle)}"></label>
      <label><span class="field-label">头像显示的字</span><input data-path="profile.avatar" value="${esc(p.avatar)}"></label>
      <label><span class="field-label">邮箱</span><input data-path="profile.email" value="${esc(p.email)}"></label>
      <label class="full"><span class="field-label">GitHub 链接</span><input data-path="profile.github" value="${esc(p.github)}"></label>
    </div>

    <h3 style="margin:20px 0 10px;font-family:var(--mono);font-size:15px;color:var(--cyan)">打字机句子</h3>
    ${typing || '<p class="hint">暂无</p>'}
    <button class="btn-add" data-action="add-typing">+ 添加句子</button>

    <h3 style="margin:20px 0 10px;font-family:var(--mono);font-size:15px;color:var(--cyan)">关于我（段落）</h3>
    ${about || '<p class="hint">暂无</p>'}
    <button class="btn-add" data-action="add-about">+ 添加段落</button>

    <h3 style="margin:20px 0 10px;font-family:var(--mono);font-size:15px;color:var(--cyan)">时间线</h3>
    ${timeline || '<p class="hint">暂无</p>'}
    <button class="btn-add" data-action="add-timeline">+ 添加时间线</button>
  `;
}

function renderSkills() {
  const cats = (state.skills || []).map((cat, ci) => `
    <div class="item-card">
      <div class="item-head">
        <h3>分类 ${ci + 1}</h3>
        <button class="btn-del" data-action="del-skillcat" data-idx="${ci}">删除分类</button>
      </div>
      <div class="row">
        <label><span class="field-label">图标（emoji）</span><input data-path="skills.${ci}.icon" value="${esc(cat.icon)}"></label>
        <label><span class="field-label">分类名</span><input data-path="skills.${ci}.title" value="${esc(cat.title)}"></label>
      </div>
      ${(cat.items || []).map((s, i) => `
        <div class="line">
          <input data-path="skills.${ci}.items.${i}.name" value="${esc(s.name)}" placeholder="技能名">
          <input data-path="skills.${ci}.items.${i}.level" data-type="number" type="number" min="0" max="100" value="${Number(s.level) || 0}" style="width:90px" placeholder="熟练度">
          <button class="btn-del" data-action="del-skill" data-cat="${ci}" data-idx="${i}">删除</button>
        </div>`).join('')}
      <button class="btn-add" data-action="add-skill" data-cat="${ci}">+ 添加技能</button>
    </div>`).join('');

  document.getElementById('panel-skills').innerHTML = `
    <h2>技能</h2>
    ${cats || '<p class="hint">暂无分类</p>'}
    <button class="btn-add" data-action="add-skillcat">+ 添加技能分类</button>
  `;
}

function renderProjects() {
  const list = (state.projects || []).map((p, i) => `
    <div class="item-card">
      <div class="item-head">
        <h3>项目 ${i + 1}</h3>
        <button class="btn-del" data-action="del-project" data-idx="${i}">删除</button>
      </div>
      <div class="row">
        <label><span class="field-label">标题</span><input data-path="projects.${i}.title" value="${esc(p.title)}"></label>
        <label><span class="field-label">封面图标（emoji）</span><input data-path="projects.${i}.icon" value="${esc(p.icon)}"></label>
      </div>
      <label><span class="field-label">描述</span><textarea data-path="projects.${i}.desc">${esc(p.desc)}</textarea></label>
      <div class="row">
        <label><span class="field-label">封面色</span>
          <select data-path="projects.${i}.cover">
            ${['c1', 'c2', 'c3', 'c4'].map((c) => `<option value="${c}" ${p.cover === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>
        <label><span class="field-label">标签 <span class="tags-hint">（逗号分隔）</span></span>
          <input data-array="projects.${i}.tags" value="${esc((p.tags || []).join(', '))}">
        </label>
      </div>
    </div>`).join('');

  document.getElementById('panel-projects').innerHTML = `
    <h2>项目</h2>
    ${list || '<p class="hint">暂无项目</p>'}
    <button class="btn-add" data-action="add-project">+ 添加项目</button>
  `;
}

function renderBlog() {
  const list = (state.blog || []).map((b, i) => `
    <div class="item-card">
      <div class="item-head">
        <h3>博客 ${i + 1}</h3>
        <button class="btn-del" data-action="del-blog" data-idx="${i}">删除</button>
      </div>
      <div class="row">
        <label><span class="field-label">日期</span><input data-path="blog.${i}.time" value="${esc(b.time)}" placeholder="2026-10"></label>
        <label><span class="field-label">标题</span><input data-path="blog.${i}.title" value="${esc(b.title)}"></label>
      </div>
      <label><span class="field-label">摘要</span><textarea data-path="blog.${i}.desc">${esc(b.desc)}</textarea></label>
      <label><span class="field-label">标签 <span class="tags-hint">（逗号分隔）</span></span>
        <input data-array="blog.${i}.tags" value="${esc((b.tags || []).join(', '))}">
      </label>
    </div>`).join('');

  document.getElementById('panel-blog').innerHTML = `
    <h2>博客</h2>
    ${list || '<p class="hint">暂无博客</p>'}
    <button class="btn-add" data-action="add-blog">+ 添加博客</button>
  `;
}

/* ================= 事件 ================= */
function setStatus(msg, isError) {
  const el = document.getElementById('status');
  el.textContent = msg || '';
  el.style.color = isError ? 'var(--pink)' : 'var(--cyan)';
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  ['profile', 'skills', 'projects', 'blog'].forEach((k) => {
    document.getElementById('panel-' + k).hidden = (k !== name);
  });
}

function showLoginTip(msg) {
  document.getElementById('login-tip').textContent = msg;
}

function showEditor() {
  document.getElementById('login-view').hidden = true;
  document.getElementById('editor-view').hidden = false;
}
function showLogin() {
  document.getElementById('login-view').hidden = false;
  document.getElementById('editor-view').hidden = true;
}

async function doLoad() {
  setStatus('正在从 GitHub 读取 data.js…');
  try {
    await loadFromGitHub();
    setStatus('已读取最新内容 ✓');
  } catch (e) {
    setStatus(e.message, true);
  }
}
async function doSave() {
  setStatus('正在保存并发布…');
  try {
    await saveToGitHub();
    setStatus('已保存 ✓ 个人站约 1 分钟内自动更新。');
  } catch (e) {
    setStatus(e.message, true);
  }
}

function bindEvents() {
  // 登录
  document.getElementById('login-btn').addEventListener('click', async () => {
    const pwd = document.getElementById('login-password').value;
    const token = document.getElementById('login-token').value.trim();
    if (pwd !== CONFIG.password) { showLoginTip('密码错误'); return; }
    if (!token) { showLoginTip('请输入 GitHub Token'); return; }
    setAuth({ password: pwd, token });
    showEditor();
    await doLoad();
  });
  document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-token').focus();
  });
  document.getElementById('login-token').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });

  // 顶部按钮
  document.getElementById('load-btn').addEventListener('click', doLoad);
  document.getElementById('save-btn').addEventListener('click', doSave);
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem(LS_KEY);
    state = null; fileSha = null;
    showLogin();
  });

  // Tab 切换
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

  // 输入同步回 state
  document.getElementById('editor-view').addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.array) {
      const arr = el.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
      setPath(state, el.dataset.array, arr);
    } else if (el.dataset.path) {
      let v = el.value;
      if (el.dataset.type === 'number') v = Math.max(0, Math.min(100, Number(v) || 0));
      setPath(state, el.dataset.path, v);
    }
  });

  // 添加 / 删除
  document.getElementById('editor-view').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !state) return;
    const a = btn.dataset.action;
    const idx = Number(btn.dataset.idx);
    const cat = Number(btn.dataset.cat);

    if (a === 'add-typing') { state.profile.typing.push(''); renderProfile(); }
    else if (a === 'del-typing') { state.profile.typing.splice(idx, 1); renderProfile(); }
    else if (a === 'add-about') { state.profile.about.push(''); renderProfile(); }
    else if (a === 'del-about') { state.profile.about.splice(idx, 1); renderProfile(); }
    else if (a === 'add-timeline') { state.profile.timeline.push({ time: '', text: '' }); renderProfile(); }
    else if (a === 'del-timeline') { state.profile.timeline.splice(idx, 1); renderProfile(); }
    else if (a === 'add-skillcat') { state.skills.push({ icon: '', title: '', items: [] }); renderSkills(); }
    else if (a === 'del-skillcat') { state.skills.splice(idx, 1); renderSkills(); }
    else if (a === 'add-skill') { state.skills[cat].items.push({ name: '', level: 50 }); renderSkills(); }
    else if (a === 'del-skill') { state.skills[cat].items.splice(idx, 1); renderSkills(); }
    else if (a === 'add-project') { state.projects.push({ title: '', desc: '', tags: [], cover: 'c1', icon: '' }); renderProjects(); }
    else if (a === 'del-project') { state.projects.splice(idx, 1); renderProjects(); }
    else if (a === 'add-blog') { state.blog.push({ time: '', title: '', desc: '', tags: [] }); renderBlog(); }
    else if (a === 'del-blog') { state.blog.splice(idx, 1); renderBlog(); }
  });
}

/* ================= 启动 ================= */
bindEvents();
if (getToken()) {
  // 已登录：直接进入编辑页并加载
  showEditor();
  document.getElementById('login-password').value = getAuth().password || '';
  doLoad();
}
