let rootHandle = null;

const pickRootButton = document.getElementById("pick-root");
const rootStatus = document.getElementById("root-status");
const photoForm = document.getElementById("photo-form");
const algorithmForm = document.getElementById("algorithm-form");
const photoStatus = document.getElementById("photo-status");
const algoStatus = document.getElementById("algo-status");
const tabButtons = document.querySelectorAll(".admin-tab");

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

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((tab) => tab.classList.remove("is-active"));
    button.classList.add("is-active");
    const tab = button.dataset.tab;
    photoForm.classList.toggle("is-hidden", tab !== "photography");
    algorithmForm.classList.toggle("is-hidden", tab !== "algorithms");
  });
});

photoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!rootHandle) {
    setStatus(photoStatus, "请先选择博客根目录。");
    return;
  }

  try {
    const year = document.getElementById("year").value.trim();
    const month = padMonth(document.getElementById("month").value.trim());
    const date = document.getElementById("date").value.trim();
    const title = document.getElementById("title").value.trim();
    const text = document.getElementById("text").value.trim();
    const files = Array.from(document.getElementById("images").files || []);

    if (!files.length) {
      setStatus(photoStatus, "请至少选择一张照片。");
      return;
    }

    const assetsDir = await getDirectory(rootHandle, "assets");
    const photographyAssetsDir = await getDirectory(assetsDir, "photography");
    const yearAssetsDir = await getDirectory(photographyAssetsDir, year);
    const monthAssetsDir = await getDirectory(yearAssetsDir, month);

    const photographyDir = await getDirectory(rootHandle, "photography");
    const yearDir = await getDirectory(photographyDir, year);
    await ensureMonthPage(yearDir, year, month);
    const jsonHandle = await yearDir.getFileHandle(`${month}.json`, { create: true });

    const images = [];
    for (const file of files) {
      const savedName = await copyImage(monthAssetsDir, file);
      images.push({ file: savedName, alt: `${date} 摄影记录` });
    }

    const current = await getFileJson(jsonHandle);
    current.push({ date, title, text, images });
    await writeJson(jsonHandle, current);
    await rebuildPhotographyIndex(photographyDir);

    photoForm.reset();
    document.getElementById("year").value = year;
    document.getElementById("month").value = String(Number(month));
    setStatus(photoStatus, `已保存到 ${year}/${month}。`);
  } catch (error) {
    setStatus(photoStatus, `保存失败：${error.message}`);
  }
});

algorithmForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!rootHandle) {
    setStatus(algoStatus, "请先选择博客根目录。");
    return;
  }

  try {
    const type = document.getElementById("algo-type").value.trim();
    const url = document.getElementById("algo-url").value.trim();
    const solution = document.getElementById("algo-solution").value.trim();
    const reflection = document.getElementById("algo-reflection").value.trim();

    const algorithmsDir = await getDirectory(rootHandle, "algorithms");
    await ensureAlgorithmTemplate(algorithmsDir);

    const fileBase = slugify(type);
    const fileName = `${fileBase}.json`;
    const jsonHandle = await algorithmsDir.getFileHandle(fileName, { create: true });
    const current = await getFileJson(jsonHandle);

    current.push({ type, url, solution, reflection });
    await writeJson(jsonHandle, current);
    await rebuildAlgorithmTypePage(algorithmsDir, type, fileName);

    const typeEntries = [];
    for await (const [name, handle] of algorithmsDir.entries()) {
      if (handle.kind !== "file" || !name.endsWith(".json")) {
        continue;
      }
      const json = await getFileJson(handle);
      const title = json[0]?.type || name.replace(".json", "");
      typeEntries.push({
        type: name === fileName ? type : title,
        fileName: name
      });
    }

    const deduped = [];
    const seen = new Set();
    for (const entry of typeEntries) {
      if (seen.has(entry.fileName)) {
        continue;
      }
      seen.add(entry.fileName);
      deduped.push(entry);
    }

    await rebuildAlgorithmsIndex(algorithmsDir, deduped);
    algorithmForm.reset();
    setStatus(algoStatus, `已保存到题型：${type}`);
  } catch (error) {
    setStatus(algoStatus, `保存失败：${error.message}`);
  }
});
