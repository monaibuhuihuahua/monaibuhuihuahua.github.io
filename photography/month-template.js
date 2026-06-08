(function () {
  const script = document.currentScript;
  const year = script.dataset.year;
  const month = script.dataset.month;
  const journal = document.getElementById("photo-journal");

  function renderEntry(entry) {
    const article = document.createElement("article");
    article.className = "photo-entry";

    const grid = document.createElement("div");
    grid.className = "photo-grid";

    entry.images.forEach((image) => {
      const img = document.createElement("img");
      img.src = `../../assets/photography/${year}/${month}/${image.file}`;
      img.alt = image.alt || entry.title;
      grid.appendChild(img);
    });

    const copy = document.createElement("div");
    copy.className = "photo-copy";

    const meta = document.createElement("p");
    meta.className = "meta-line";
    meta.textContent = entry.date;

    const title = document.createElement("h3");
    title.textContent = entry.title;

    const text = document.createElement("p");
    text.textContent = entry.text;

    copy.append(meta, title, text);

    if (entry.note) {
      const note = document.createElement("p");
      note.className = "photo-note";
      note.textContent = entry.note;
      copy.appendChild(note);
    }

    article.append(grid, copy);
    return article;
  }

  async function loadJournal() {
    try {
      const response = await fetch(`./${month}.json`);
      const entries = await response.json();

      if (!Array.isArray(entries) || entries.length === 0) {
        const empty = document.createElement("article");
        empty.className = "photo-entry";
        empty.innerHTML = `
          <div class="photo-copy">
            <p class="meta-line">${year}.${month}</p>
            <h3>这个月还没有新的摄影记录</h3>
            <p>等你把图片放进 <code>assets/photography/${year}/${month}/</code>，再把数据写进 <code>${month}.json</code>，这里就会自动显示。</p>
          </div>
        `;
        journal.appendChild(empty);
        return;
      }

      entries.forEach((entry) => journal.appendChild(renderEntry(entry)));
    } catch (error) {
      const fallback = document.createElement("article");
      fallback.className = "photo-entry";
      fallback.innerHTML = `
        <div class="photo-copy">
          <p class="meta-line">Load Failed</p>
          <h3>暂时没有成功读取摄影记录</h3>
          <p>请确认 <code>${month}.json</code> 文件存在，并通过 GitHub Pages 或本地静态服务器访问页面。</p>
        </div>
      `;
      journal.appendChild(fallback);
    }
  }

  loadJournal();
})();
