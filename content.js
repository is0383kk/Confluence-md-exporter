/* content.js v1.0.5 */
(() => {
  console.log("[Exporter] content.js injected on", location.href);
  const selectors = [
    ".ak-renderer-document",
    ".wiki-content",
    "#main-content",
    "#content",
    "#content-body",
    ".ia-wiki-content",
    "article",
  ];
  function pickElement(doc) {
    for (const s of selectors) {
      const el = doc.querySelector(s);
      if (el) return el;
    }
    return null;
  }
  let el = pickElement(document);
  if (!el && window === top) {
    const frames = Array.from(document.querySelectorAll("iframe"));
    for (const f of frames) {
      try {
        if (!f.contentDocument) continue;
        const candidate = pickElement(f.contentDocument);
        if (candidate) {
          el = candidate;
          break;
        }
      } catch {}
    }
  }
  if (!el) {
    console.warn("[Exporter] No content element found. Using <body> fallback.");
    el = document.body;
  }
  const safe = (s) => (s || "").replace(/[/\\?%*:|"<>]/g, "_").trim();
  const title = document.title || "confluence-page";
  const url = new URL(location.href);
  const pageId = url.searchParams.get("pageId") || "";
  const filename = safe(title) + (pageId ? `_${pageId}` : "") + ".md";
  if (typeof TurndownService === "undefined") {
    alert(
      "TurndownService が未定義です。turndown.js が先に注入されているか確認してください。"
    );
    return;
  }
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
  });
  turndownService.addRule("preserveBr", {
    filter: "br",
    replacement: () => "  \n",
  });
  turndownService.addRule("imageWithAlt", {
    filter: "img",
    replacement: (content, node) => {
      const alt = node.getAttribute("alt") || "";
      const src = node.getAttribute("src") || "";
      if (!src) return "";
      const abs = new URL(src, location.origin).href;
      return `![${alt}](${abs})`;
    },
  });
  turndownService.addRule("confluencePrismCodeBlock", {
    filter: function (node) {
      if (!node || node.nodeType !== 1) return false;
      const el = /** @type {HTMLElement} */ (node);
      // 1) Atlassian/DSのコードブロックspan
      if (el.matches("span[data-ds--code--code-block]")) return true;
      // 2) styleでpre相当のcode
      if (el.matches('code[style*="white-space: pre"]')) return true;
      return false;
    },
    replacement: function (_content, node) {
      // nodeがspanまたはcodeのどちらでもOKにする
      const host = /** @type {HTMLElement} */ (node);
      const codeEl = host.matches("code")
        ? host
        : host.querySelector("code") || host;

      // 言語推定（class="language-xxx" または data-code-lang）
      let lang = "";
      const cls =
        (codeEl.getAttribute("class") || "") +
        " " +
        (host.getAttribute("class") || "");
      const m = cls.match(/language-([a-z0-9+\-#]+)/i);
      if (m) lang = m[1].toLowerCase();
      if (!lang) {
        const dataLang =
          host.getAttribute("data-code-lang") ||
          codeEl.getAttribute("data-code-lang");
        if (dataLang) lang = String(dataLang).toLowerCase();
      }

      // テキスト抽出＆正規化（\u00A0 を半角空白へ）
      let text = (codeEl.textContent || "").replace(/\u00a0/g, " ");
      // 末尾の余分な改行や空白を落とす
      text = text.replace(/\s+$/g, "");

      // フェンス付き出力
      const fenceInfo = lang ? lang : "";
      return "```" + fenceInfo + "\n" + text + "\n```\n\n";
    },
  });
  const md = turndownService.turndown(el.innerHTML);
  if (!md || !md.trim()) {
    alert("Markdown変換結果が空でした。本文セレクタを見直してください。");
    return;
  }
  chrome.runtime.sendMessage(
    { action: "downloadMd", filename, content: md },
    (resp) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "[Exporter] sendMessage error:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("[Exporter] Background ack:", resp);
      }
    }
  );
})();
