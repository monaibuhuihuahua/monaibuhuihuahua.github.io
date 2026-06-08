(function () {
  const script = document.currentScript;
  const fileName = script.dataset.file;
  const list = document.getElementById("algorithm-list");

  function render(entry) {
    const article = document.createElement("article");
    article.className = "post-preview";
    article.innerHTML = `
      <p class="meta-line">题目链接</p>
      <h3><a href="${entry.url}" target="_blank" rel="noreferrer">${entry.url}</a></h3>
      <p><strong>题解：</strong>${entry.solution}</p>
      <p><strong>感悟：</strong>${entry.reflection}</p>
    `;
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
})();