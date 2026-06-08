let rootHandle = null;
let editingPhotoIndex = null;
let editingThoughtIndex = null;
let editingAlgoIndex = null;
const DEFAULT_ROOT_PATH = "C:\\Users\\a2556\\Desktop\\blog";

const pickRootButton = document.getElementById("pick-root");
const rootStatus = document.getElementById("root-status");
const photoForm = document.getElementById("photo-form");
const thoughtForm = document.getElementById("thought-form");
const algorithmForm = document.getElementById("algorithm-form");
const photoStatus = document.getElementById("photo-status");
const thoughtStatus = document.getElementById("thought-status");
const algoStatus = document.getElementById("algo-status");
const tabButtons = document.querySelectorAll(".admin-tab");
const photographyPanel = document.getElementById("photography-panel");
const thoughtsPanel = document.getElementById("thoughts-panel");
const algorithmsPanel = document.getElementById("algorithms-panel");
const photoRecords = document.getElementById("photo-records");
const thoughtRecords = document.getElementById("thought-records");
const algoRecords = document.getElementById("algo-records");
const loadPhotoRecordsButton = document.getElementById("load-photo-records");
const loadThoughtRecordsButton = document.getElementById("load-thought-records");
const loadAlgoRecordsButton = document.getElementById("load-algo-records");

function setStatus(element, text) {
  element.textContent = text;
}

function padMonth(month) {
  return String(month).padStart(2, "0");
}

function englishMonthName(month) {
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return names[Number(month) - 1] || "Month";
}

function monthLabel(year, month) {
  return `${year} 年 ${Number(month)} 月`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function slugify(text) {
  const normalized = text.trim().toLowerCase();
  const slug = normalized
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

async function verifyPermission(handle, readWrite) {
  const options = { mode: readWrite ? "readwrite" : "read" };
  if ((await handle.queryPermission(options)) === "granted") {
    return true;
  }
  return (await handle.requestPermission(options)) === "granted";
}

async function getDirectory(parentHandle, name) {
  return parentHandle.getDirectoryHandle(name, { create: true });
}

async function getFileJson(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    return text.trim() ? JSON.parse(text) : [];
  } catch {
    return [];
  }
}

async function writeJson(fileHandle, data) {
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

async function writeText(fileHandle, text) {
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

async function copyImage(targetDir, file) {
  const fileHandle = await targetDir.getFileHandle(file.name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(await file.arrayBuffer());
  await writable.close();
  return file.name;
}

async function deleteImageIfExists(targetDir, fileName) {
  try {
    await targetDir.removeEntry(fileName);
  } catch {
    // Ignore missing files so edits stay resilient.
  }
}

function buildMonthHtml(year, month) {
  const monthPadded = padMonth(month);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${monthLabel(year, monthPadded)}摄影记录 | monaibuhuihuahua</title>
  <meta name="description" content="monaibuhuihua 的 ${monthLabel(year, monthPadded)}摄影记录。">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../styles.css">
</head>
<body>
  <div class="page-shell content-page">
    <a class="back-link" href="../">返回摄影归档</a>
    <section id="photo-journal" class="photo-journal"></section>
    <script src="../month-template.js" data-year="${year}" data-month="${monthPadded}"></script>
  </div>
</body>
</html>`;
}

async function ensureMonthPage(yearDir, year, month) {
  const monthPadded = padMonth(month);
  const htmlHandle = await yearDir.getFileHandle(`${monthPadded}.html`, { create: true });
  const file = await htmlHandle.getFile();
  const current = await file.text();
  if (current.trim()) {
    return;
  }
  await writeText(htmlHandle, buildMonthHtml(year, monthPadded));
}

async function rebuildPhotographyIndex(photographyDir) {
  const archives = [];
  for await (const [yearName, yearHandle] of photographyDir.entries()) {
    if (yearHandle.kind !== "directory" || !/^\d{4}$/.test(yearName)) {
      continue;
    }
    const months = [];
    for await (const [fileName, fileHandle] of yearHandle.entries()) {
      if (fileHandle.kind !== "file" || !/^\d{2}\.html$/.test(fileName)) {
        continue;
      }
      months.push(fileName.replace(".html", ""));
    }
    months.sort((a, b) => Number(a) - Number(b));
    archives.push({ year: yearName, months });
  }

  archives.sort((a, b) => Number(a.year) - Number(b.year));

  const yearSections = archives.map(({ year, months }) => {
    const links = months.map((month) => `            <a href="./${year}/${month}.html">${Number(month)} 月</a>`).join("\n");
    return `        <article>
          <p class="eyebrow">${escapeHtml(year)}</p>
          <h2>${escapeHtml(year)}</h2>
          <div class="year-links">
${links}
          </div>
        </article>`;
  }).join("\n\n");

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>生活摄影 | monaibuhuihuahua</title>
  <meta name="description" content="monaibuhuihuahua 的生活摄影栏目，按年份和月份整理。">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <div class="page-shell content-page">
    <a class="back-link" href="../">返回主页</a>
    <section class="section-block">
      <div class="about-grid">
${yearSections}
      </div>
    </section>
  </div>
</body>
</html>`;

  const indexHandle = await photographyDir.getFileHandle("index.html", { create: true });
  await writeText(indexHandle, html);
}

function buildAlgorithmTypeHtml(typeName, fileName) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(typeName)} | monaibuhuihuahua</title>
  <meta name="description" content="monaibuhuihuahua 的 ${escapeHtml(typeName)} 题型整理。">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <div class="page-shell content-page">
    <a class="back-link" href="./">返回算法归档</a>
    <section class="content-card">
      <p class="eyebrow">Algorithm Type</p>
      <h1>${escapeHtml(typeName)}</h1>
    </section>
    <section id="algorithm-list" class="post-list"></section>
    <script src="./type-template.js" data-file="${escapeHtml(fileName)}"></script>
  </div>
</body>
</html>`;
}

async function rebuildAlgorithmsIndex(algorithmsDir, typeEntries) {
  typeEntries.sort((a, b) => a.type.localeCompare(b.type, "zh-CN"));
  const cards = typeEntries.map((entry) => {
    return `        <article>
          <p class="eyebrow">Type</p>
          <h2>${escapeHtml(entry.type)}</h2>
          <div class="year-links">
            <a href="./${escapeHtml(entry.fileName.replace(".json", ".html"))}">进入题型</a>
          </div>
        </article>`;
  }).join("\n\n");

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>算法题 | monaibuhuihuahua</title>
  <meta name="description" content="monaibuhuihuahua 的算法题栏目，按题型整理。">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <div class="page-shell content-page">
    <a class="back-link" href="../">返回主页</a>
    <section class="section-block">
      <div class="about-grid">
${cards}
      </div>
    </section>
  </div>
</body>
</html>`;

  const indexHandle = await algorithmsDir.getFileHandle("index.html", { create: true });
  await writeText(indexHandle, html);
}

const thoughtsTemplateJs = `(function () {
  const script = document.currentScript;
  const fileName = script.dataset.file;
  const list = document.getElementById("thought-list");

  function render(entry) {
    const article = document.createElement("article");
    article.className = "post-preview";
    article.innerHTML = \`
      <p class="meta-line">\${entry.date}</p>
      <h3>\${entry.title}</h3>
      <p>\${entry.content}</p>
    \`;
    return article;
  }

  async function load() {
    try {
      const response = await fetch("./" + fileName);
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        const empty = document.createElement("article");
        empty.className = "post-preview";
        empty.innerHTML = "<p>还没有记录。</p>";
        list.appendChild(empty);
        return;
      }
      data.forEach((entry) => list.appendChild(render(entry)));
    } catch {
      const fallback = document.createElement("article");
      fallback.className = "post-preview";
      fallback.innerHTML = "<p>读取失败。</p>";
      list.appendChild(fallback);
    }
  }

  load();
})();`;

async function ensureThoughtTemplate(thoughtsDir) {
  const jsHandle = await thoughtsDir.getFileHandle("thoughts-template.js", { create: true });
  const current = await (await jsHandle.getFile()).text();
  if (current.trim()) {
    return;
  }
  await writeText(jsHandle, thoughtsTemplateJs);
}

async function rebuildThoughtsIndex(thoughtsDir) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>生活感悟 | monaibuhuihuahua</title>
  <meta name="description" content="monaibuhuihuahua 的生活感悟栏目。">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <div class="page-shell content-page">
    <a class="back-link" href="../">返回主页</a>
    <section id="thought-list" class="post-list"></section>
    <script src="./thoughts-template.js" data-file="thoughts.json"></script>
  </div>
</body>
</html>`;

  const indexHandle = await thoughtsDir.getFileHandle("index.html", { create: true });
  await writeText(indexHandle, html);
}

const algorithmTemplateJs = `(function () {
  const script = document.currentScript;
  const fileName = script.dataset.file;
  const list = document.getElementById("algorithm-list");

  function render(entry) {
    const article = document.createElement("article");
    article.className = "post-preview";
    article.innerHTML = \`
      <p class="meta-line">题目链接</p>
      <h3><a href="\${entry.url}" target="_blank" rel="noreferrer">\${entry.url}</a></h3>
      <p><strong>题解：</strong>\${entry.solution}</p>
      <p><strong>感悟：</strong>\${entry.reflection}</p>
    \`;
    return article;
  }

  async function load() {
    try {
      const response = await fetch("./" + fileName);
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        const empty = document.createElement("article");
        empty.className = "post-preview";
        empty.innerHTML = "<p>这个题型下还没有记录。</p>";
        list.appendChild(empty);
        return;
      }
      data.forEach((entry) => list.appendChild(render(entry)));
    } catch {
      const fallback = document.createElement("article");
      fallback.className = "post-preview";
      fallback.innerHTML = "<p>暂时没有成功读取题型记录。</p>";
      list.appendChild(fallback);
    }
  }

  load();
})();`;

async function ensureAlgorithmTemplate(algorithmsDir) {
  const jsHandle = await algorithmsDir.getFileHandle("type-template.js", { create: true });
  const current = await (await jsHandle.getFile()).text();
  if (current.trim()) {
    return;
  }
  await writeText(jsHandle, algorithmTemplateJs);
}

async function rebuildAlgorithmTypePage(algorithmsDir, typeName, fileName) {
  const htmlHandle = await algorithmsDir.getFileHandle(fileName.replace(".json", ".html"), { create: true });
  await writeText(htmlHandle, buildAlgorithmTypeHtml(typeName, fileName));
}

async function getPhotoJsonHandle() {
  const year = document.getElementById("year").value.trim();
  const month = padMonth(document.getElementById("month").value.trim());
  const photographyDir = await getDirectory(rootHandle, "photography");
  const yearDir = await getDirectory(photographyDir, year);
  await ensureMonthPage(yearDir, year, month);
  const jsonHandle = await yearDir.getFileHandle(`${month}.json`, { create: true });
  return { year, month, photographyDir, jsonHandle };
}

async function renderPhotoRecords() {
  if (!rootHandle) {
    setStatus(photoStatus, "请先选择博客根目录。");
    return;
  }

  const { year, month, jsonHandle } = await getPhotoJsonHandle();
  const records = await getFileJson(jsonHandle);
  photoRecords.innerHTML = "";

  if (!records.length) {
    photoRecords.innerHTML = `<article class="admin-record-item"><p>${year} 年 ${Number(month)} 月还没有记录。</p></article>`;
    return;
  }

  records.forEach((entry, index) => {
    const article = document.createElement("article");
    article.className = "admin-record-item";
    article.innerHTML = `
      <p class="meta-line">${escapeHtml(entry.date || "")}</p>
      <h3>${escapeHtml(entry.title || "未命名记录")}</h3>
      <p>${escapeHtml(entry.text || "")}</p>
      <div class="admin-record-actions">
        <button type="button" data-index="${index}" data-action="edit-photo">编辑</button>
        <button type="button" data-index="${index}" data-action="delete-photo">删除</button>
      </div>
    `;
    photoRecords.appendChild(article);
  });
}

async function getAlgorithmJsonHandle() {
  const type = document.getElementById("algo-type").value.trim();
  if (!type) {
    throw new Error("请先填写题型。");
  }
  const algorithmsDir = await getDirectory(rootHandle, "algorithms");
  await ensureAlgorithmTemplate(algorithmsDir);
  const fileBase = slugify(type);
  const fileName = `${fileBase}.json`;
  const jsonHandle = await algorithmsDir.getFileHandle(fileName, { create: true });
  return { type, fileName, algorithmsDir, jsonHandle };
}

async function renderAlgorithmRecords() {
  if (!rootHandle) {
    setStatus(algoStatus, "请先选择博客根目录。");
    return;
  }

  const { type, jsonHandle } = await getAlgorithmJsonHandle();
  const records = await getFileJson(jsonHandle);
  algoRecords.innerHTML = "";

  if (!records.length) {
    algoRecords.innerHTML = `<article class="admin-record-item"><p>${escapeHtml(type)} 还没有记录。</p></article>`;
    return;
  }

  records.forEach((entry, index) => {
    const article = document.createElement("article");
    article.className = "admin-record-item";
    article.innerHTML = `
      <p class="meta-line">题目链接</p>
      <h3>${escapeHtml(entry.url || "未填写链接")}</h3>
      <p><strong>题解：</strong>${escapeHtml(entry.solution || "")}</p>
      <p><strong>感悟：</strong>${escapeHtml(entry.reflection || "")}</p>
      <div class="admin-record-actions">
        <button type="button" data-index="${index}" data-action="edit-algo">编辑</button>
        <button type="button" data-index="${index}" data-action="delete-algo">删除</button>
      </div>
    `;
    algoRecords.appendChild(article);
  });
}

pickRootButton.addEventListener("click", async () => {
  try {
    rootHandle = await window.showDirectoryPicker();
    const ok = await verifyPermission(rootHandle, true);
    if (!ok) {
      setStatus(rootStatus, "目录权限没有授权成功。");
      return;
    }
    setStatus(rootStatus, `已连接目录：${rootHandle.name}`);
  } catch {
    setStatus(rootStatus, "还没有选择目录。");
  }
});

async function ensureRootHandle() {
  if (rootHandle) {
    return rootHandle;
  }
  throw new Error(`当前未连接目录。默认使用 ${DEFAULT_ROOT_PATH}，请先点击“更换博客根目录”授权一次。`);
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((tab) => tab.classList.remove("is-active"));
    button.classList.add("is-active");
    const tab = button.dataset.tab;
    photographyPanel.classList.toggle("is-hidden", tab !== "photography");
    thoughtsPanel.classList.toggle("is-hidden", tab !== "thoughts");
    algorithmsPanel.classList.toggle("is-hidden", tab !== "algorithms");
  });
});

loadPhotoRecordsButton.addEventListener("click", () => {
  renderPhotoRecords().catch((error) => setStatus(photoStatus, error.message));
});

async function renderThoughtRecords() {
  if (!rootHandle) {
    setStatus(thoughtStatus, `请先授权默认目录：${DEFAULT_ROOT_PATH}`);
    return;
  }

  const thoughtsDir = await getDirectory(rootHandle, "thoughts");
  await ensureThoughtTemplate(thoughtsDir);
  const jsonHandle = await thoughtsDir.getFileHandle("thoughts.json", { create: true });
  const records = await getFileJson(jsonHandle);
  thoughtRecords.innerHTML = "";

  if (!records.length) {
    thoughtRecords.innerHTML = `<article class="admin-record-item"><p>还没有记录。</p></article>`;
    return;
  }

  records.forEach((entry, index) => {
    const article = document.createElement("article");
    article.className = "admin-record-item";
    article.innerHTML = `
      <p class="meta-line">${escapeHtml(entry.date || "")}</p>
      <h3>${escapeHtml(entry.title || "未命名")}</h3>
      <p>${escapeHtml(entry.content || "")}</p>
      <div class="admin-record-actions">
        <button type="button" data-index="${index}" data-action="edit-thought">编辑</button>
        <button type="button" data-index="${index}" data-action="delete-thought">删除</button>
      </div>
    `;
    thoughtRecords.appendChild(article);
  });
}

loadThoughtRecordsButton.addEventListener("click", () => {
  renderThoughtRecords().catch((error) => setStatus(thoughtStatus, error.message));
});

loadAlgoRecordsButton.addEventListener("click", () => {
  renderAlgorithmRecords().catch((error) => setStatus(algoStatus, error.message));
});

photoRecords.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const index = Number(target.dataset.index);
  const action = target.dataset.action;
  const { year, month, photographyDir, jsonHandle } = await getPhotoJsonHandle();
  const records = await getFileJson(jsonHandle);

  if (action === "edit-photo") {
    const entry = records[index];
    editingPhotoIndex = index;
    document.getElementById("date").value = entry.date || "";
    document.getElementById("title").value = entry.title || "";
    document.getElementById("text").value = entry.text || "";
    setStatus(photoStatus, `正在编辑 ${year}/${month} 的第 ${index + 1} 条记录。重新保存即可覆盖。`);
    return;
  }

  if (action === "delete-photo") {
    records.splice(index, 1);
    await writeJson(jsonHandle, records);
    await rebuildPhotographyIndex(photographyDir);
    if (editingPhotoIndex === index) {
      editingPhotoIndex = null;
      photoForm.reset();
    }
    await renderPhotoRecords();
    setStatus(photoStatus, `已删除 ${year}/${month} 的第 ${index + 1} 条记录。`);
  }
});

thoughtRecords.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const index = Number(target.dataset.index);
  const action = target.dataset.action;
  const thoughtsDir = await getDirectory(rootHandle, "thoughts");
  await ensureThoughtTemplate(thoughtsDir);
  const jsonHandle = await thoughtsDir.getFileHandle("thoughts.json", { create: true });
  const records = await getFileJson(jsonHandle);

  if (action === "edit-thought") {
    const entry = records[index];
    editingThoughtIndex = index;
    document.getElementById("thought-title").value = entry.title || "";
    document.getElementById("thought-date").value = entry.date || "";
    document.getElementById("thought-content").value = entry.content || "";
    setStatus(thoughtStatus, `正在编辑第 ${index + 1} 条生活感悟。`);
    return;
  }

  if (action === "delete-thought") {
    records.splice(index, 1);
    await writeJson(jsonHandle, records);
    await rebuildThoughtsIndex(thoughtsDir);
    if (editingThoughtIndex === index) {
      editingThoughtIndex = null;
      thoughtForm.reset();
    }
    await renderThoughtRecords();
    setStatus(thoughtStatus, `已删除第 ${index + 1} 条生活感悟。`);
  }
});

algoRecords.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const index = Number(target.dataset.index);
  const action = target.dataset.action;
  const { type, fileName, algorithmsDir, jsonHandle } = await getAlgorithmJsonHandle();
  const records = await getFileJson(jsonHandle);

  if (action === "edit-algo") {
    const entry = records[index];
    editingAlgoIndex = index;
    document.getElementById("algo-url").value = entry.url || "";
    document.getElementById("algo-solution").value = entry.solution || "";
    document.getElementById("algo-reflection").value = entry.reflection || "";
    setStatus(algoStatus, `正在编辑题型 ${type} 的第 ${index + 1} 条记录。重新保存即可覆盖。`);
    return;
  }

  if (action === "delete-algo") {
    records.splice(index, 1);
    await writeJson(jsonHandle, records);
    await rebuildAlgorithmTypePage(algorithmsDir, type, fileName);

    const typeEntries = [];
    for await (const [name, handle] of algorithmsDir.entries()) {
      if (handle.kind !== "file" || !name.endsWith(".json")) {
        continue;
      }
      const json = await getFileJson(handle);
      const title = json[0]?.type || name.replace(".json", "");
      typeEntries.push({ type: title, fileName: name });
    }

    await rebuildAlgorithmsIndex(algorithmsDir, typeEntries);
    if (editingAlgoIndex === index) {
      editingAlgoIndex = null;
      algorithmForm.reset();
    }
    await renderAlgorithmRecords();
    setStatus(algoStatus, `已删除题型 ${type} 的第 ${index + 1} 条记录。`);
  }
});

photoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!rootHandle) {
    setStatus(photoStatus, `请先授权默认目录：${DEFAULT_ROOT_PATH}`);
    return;
  }

  try {
    const { year, month, photographyDir, jsonHandle } = await getPhotoJsonHandle();
    const date = document.getElementById("date").value.trim();
    const title = document.getElementById("title").value.trim();
    const text = document.getElementById("text").value.trim();
    const files = Array.from(document.getElementById("images").files || []);
    const records = await getFileJson(jsonHandle);

    let images = records[editingPhotoIndex]?.images || [];
    if (files.length) {
      const assetsDir = await getDirectory(rootHandle, "assets");
      const photographyAssetsDir = await getDirectory(assetsDir, "photography");
      const yearAssetsDir = await getDirectory(photographyAssetsDir, year);
      const monthAssetsDir = await getDirectory(yearAssetsDir, month);

      if (editingPhotoIndex !== null) {
        const oldImages = records[editingPhotoIndex]?.images || [];
        for (const image of oldImages) {
          if (image?.file) {
            await deleteImageIfExists(monthAssetsDir, image.file);
          }
        }
      }

      images = [];
      for (const file of files) {
        const savedName = await copyImage(monthAssetsDir, file);
        images.push({ file: savedName, alt: `${date} 摄影记录` });
      }
    }

    if (!images.length) {
      setStatus(photoStatus, "请至少保留一张照片。");
      return;
    }

    const entry = { date, title, text, images };
    if (editingPhotoIndex !== null) {
      records[editingPhotoIndex] = entry;
    } else {
      records.push(entry);
    }

    await writeJson(jsonHandle, records);
    await rebuildPhotographyIndex(photographyDir);
    photoForm.reset();
    document.getElementById("year").value = year;
    document.getElementById("month").value = String(Number(month));
    const wasEditing = editingPhotoIndex !== null;
    editingPhotoIndex = null;
    await renderPhotoRecords();
    setStatus(photoStatus, wasEditing ? `已更新 ${year}/${month} 的记录。` : `已保存到 ${year}/${month}。`);
  } catch (error) {
    setStatus(photoStatus, `保存失败：${error.message}`);
  }
});

thoughtForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!rootHandle) {
    setStatus(thoughtStatus, `请先授权默认目录：${DEFAULT_ROOT_PATH}`);
    return;
  }

  try {
    const title = document.getElementById("thought-title").value.trim();
    const date = document.getElementById("thought-date").value.trim();
    const content = document.getElementById("thought-content").value.trim();
    const thoughtsDir = await getDirectory(rootHandle, "thoughts");
    await ensureThoughtTemplate(thoughtsDir);
    const jsonHandle = await thoughtsDir.getFileHandle("thoughts.json", { create: true });
    const records = await getFileJson(jsonHandle);
    const entry = { title, date, content };

    if (editingThoughtIndex !== null) {
      records[editingThoughtIndex] = entry;
    } else {
      records.push(entry);
    }

    await writeJson(jsonHandle, records);
    await rebuildThoughtsIndex(thoughtsDir);
    thoughtForm.reset();
    const wasEditing = editingThoughtIndex !== null;
    editingThoughtIndex = null;
    await renderThoughtRecords();
    setStatus(thoughtStatus, wasEditing ? "已更新生活感悟。" : "已保存生活感悟。");
  } catch (error) {
    setStatus(thoughtStatus, `保存失败：${error.message}`);
  }
});

algorithmForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!rootHandle) {
    setStatus(algoStatus, `请先授权默认目录：${DEFAULT_ROOT_PATH}`);
    return;
  }

  try {
    const { type, fileName, algorithmsDir, jsonHandle } = await getAlgorithmJsonHandle();
    const url = document.getElementById("algo-url").value.trim();
    const solution = document.getElementById("algo-solution").value.trim();
    const reflection = document.getElementById("algo-reflection").value.trim();
    const records = await getFileJson(jsonHandle);

    const entry = { type, url, solution, reflection };
    if (editingAlgoIndex !== null) {
      records[editingAlgoIndex] = entry;
    } else {
      records.push(entry);
    }

    await writeJson(jsonHandle, records);
    await ensureAlgorithmTemplate(algorithmsDir);
    await rebuildAlgorithmTypePage(algorithmsDir, type, fileName);

    const typeEntries = [];
    for await (const [name, handle] of algorithmsDir.entries()) {
      if (handle.kind !== "file" || !name.endsWith(".json")) {
        continue;
      }
      const json = await getFileJson(handle);
      const title = json[0]?.type || name.replace(".json", "");
      typeEntries.push({ type: title, fileName: name });
    }

    await rebuildAlgorithmsIndex(algorithmsDir, typeEntries);
    algorithmForm.reset();
    const currentType = type;
    document.getElementById("algo-type").value = currentType;
    const wasEditing = editingAlgoIndex !== null;
    editingAlgoIndex = null;
    await renderAlgorithmRecords();
    setStatus(algoStatus, wasEditing ? `已更新题型 ${type} 的记录。` : `已保存到题型：${type}`);
  } catch (error) {
    setStatus(algoStatus, `保存失败：${error.message}`);
  }
});
