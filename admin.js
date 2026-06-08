let rootHandle = null;

const pickRootButton = document.getElementById("pick-root");
const rootStatus = document.getElementById("root-status");
const saveStatus = document.getElementById("save-status");
const form = document.getElementById("entry-form");

function setStatus(element, text) {
  element.textContent = text;
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

async function copyImage(targetDir, file) {
  const fileHandle = await targetDir.getFileHandle(file.name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(await file.arrayBuffer());
  await writable.close();
  return file.name;
}

function padMonth(month) {
  return String(month).padStart(2, "0");
}

function monthLabel(year, month) {
  return `${year} 年 ${Number(month)} 月`;
}

function englishMonthName(month) {
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return names[Number(month) - 1] || "Month";
}

function buildMonthHtml(year, month) {
  const monthPadded = padMonth(month);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${monthLabel(year, monthPadded)}摄影记录 | monaibuhuihuahua</title>
  <meta name="description" content="monaibuhuihuahua 的 ${monthLabel(year, monthPadded)}摄影记录。">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../styles.css">
</head>
<body>
  <div class="page-shell content-page">
    <a class="back-link" href="../">返回摄影归档</a>
    <section class="content-card">
      <p class="eyebrow">${englishMonthName(monthPadded)} ${year}</p>
      <h1>${monthLabel(year, monthPadded)}</h1>
      <p>这个页面会自动读取同目录下的 <code>${monthPadded}.json</code>。你只需要维护图片和 JSON 数据。</p>
    </section>
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

  const writable = await htmlHandle.createWritable();
  await writable.write(buildMonthHtml(year, monthPadded));
  await writable.close();
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
  } catch (error) {
    setStatus(rootStatus, "还没有选择目录，或者浏览器不支持这个功能。");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!rootHandle) {
    setStatus(saveStatus, "请先选择博客根目录。");
    return;
  }

  try {
    const year = document.getElementById("year").value.trim();
    const month = padMonth(document.getElementById("month").value.trim());
    const date = document.getElementById("date").value.trim();
    const title = document.getElementById("title").value.trim();
    const text = document.getElementById("text").value.trim();
    const imageInput = document.getElementById("images");
    const files = Array.from(imageInput.files || []);

    if (!files.length) {
      setStatus(saveStatus, "请至少选择一张照片。");
      return;
    }

    setStatus(saveStatus, "正在复制图片并写入 JSON...");

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
      images.push({
        file: savedName,
        alt: `${date} 摄影记录`
      });
    }

    const current = await getFileJson(jsonHandle);
    current.push({
      date,
      title,
      text,
      images
    });

    await writeJson(jsonHandle, current);

    form.reset();
    document.getElementById("year").value = year;
    document.getElementById("month").value = String(Number(month));
    setStatus(saveStatus, `保存成功：已写入 ${year}/${month}.json，必要目录和页面已自动创建，并复制 ${images.length} 张照片。`);
  } catch (error) {
    setStatus(saveStatus, `保存失败：${error.message}`);
  }
});
