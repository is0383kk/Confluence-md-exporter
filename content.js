/* content.js v1.0.8 */
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
  turndownService.addRule("confluenceTable", {
    filter: function (node) {
      return (
        node && node.nodeType === 1 && node.tagName.toLowerCase() === "table"
      );
    },
    replacement: function (_content, node) {
      // sticky/floating ヘッダー等、非表示の複製要素を判定
      const isHidden = (el) => {
        if (!el || el.nodeType !== 1) return false;
        const style = el.getAttribute("style") || "";
        if (/display\s*:\s*none/i.test(style)) return true;
        if (el.classList && el.classList.contains("tableFloatingHeader")) {
          return true;
        }
        return false;
      };
      // セル内で改行として扱うブロック要素
      const blockTags = new Set([
        "p",
        "div",
        "li",
        "ul",
        "ol",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "pre",
        "table",
        "tr",
      ]);
      // ブロック境界と <br> を改行(\n)に変換しつつテキストを抽出
      const extractText = (n) => {
        let s = "";
        n.childNodes.forEach((c) => {
          if (c.nodeType === 3) {
            s += c.nodeValue;
          } else if (c.nodeType === 1) {
            const tag = c.tagName.toLowerCase();
            if (tag === "br") {
              s += "\n";
            } else if (blockTags.has(tag)) {
              s += "\n" + extractText(c) + "\n";
            } else {
              s += extractText(c);
            }
          }
        });
        return s;
      };
      // セル内改行は Markdown テーブルで表現できる <br> に、| はエスケープ
      const cellText = (cell) => {
        const lines = extractText(cell)
          .split("\n")
          .map((l) => l.replace(/\s+/g, " ").trim())
          .filter((l) => l.length > 0);
        return lines.join("<br>").replace(/\|/g, "\\|");
      };
      const rowCells = (tr) =>
        Array.from(tr.querySelectorAll("th,td")).map(cellText);
      // 表示されている thead を見出しとして採用（複製 thead は除外）
      const headThead = Array.from(node.querySelectorAll("thead")).filter(
        (t) => !isHidden(t)
      )[0];
      // 本文行: thead 配下の行と非表示行を除外
      const bodyRows = Array.from(node.querySelectorAll("tr")).filter((tr) => {
        if (tr.closest("thead")) return false;
        if (isHidden(tr) || isHidden(tr.parentElement)) return false;
        return true;
      });
      // thead が無い場合は先頭の本文行を見出しに転用
      const headerRow = headThead
        ? headThead.querySelector("tr")
        : bodyRows.shift();
      if (!headerRow) return "";
      const header = rowCells(headerRow);
      if (!header.length) return "";
      let out = "| " + header.join(" | ") + " |\n";
      out += "|" + header.map(() => "---").join("|") + "|\n";
      bodyRows.forEach((tr) => {
        out += "| " + rowCells(tr).join(" | ") + " |\n";
      });
      return out + "\n\n";
    },
  });
  turndownService.addRule("drawioMacro", {
    filter: function (node) {
      return (
        node &&
        node.nodeType === 1 &&
        node.classList &&
        node.classList.contains("drawio-macro")
      );
    },
    replacement: function (_content, node) {
      const svg = node.querySelector("svg");
      if (!svg) return "";
      const clone = svg.cloneNode(true);
      // 親マクロ／SVG から図のサイズを求め、単体表示用に viewBox とサイズを補正する
      const px = (v) => {
        const n = parseFloat(v || "");
        return Number.isFinite(n) ? n : 0;
      };
      const w =
        px(svg.style.minWidth) ||
        px(node.style.width) ||
        px(svg.getAttribute("width"));
      const h =
        px(svg.style.minHeight) ||
        px(node.style.height) ||
        px(svg.getAttribute("height"));
      if (!clone.getAttribute("viewBox") && w && h) {
        clone.setAttribute("viewBox", `0 0 ${w} ${h}`);
      }
      if (w) clone.setAttribute("width", String(w));
      if (h) clone.setAttribute("height", String(h));
      // width:100% などレンダラ依存の inline style を除去（サイズは属性で指定済み）
      clone.removeAttribute("style");
      const xml = new XMLSerializer().serializeToString(clone);
      return "\n\n" + xml + "\n\n";
    },
  });
  // 変換前に Confluence のコードブロック周りの UI コントロールを除去する
  const clone = el.cloneNode(true);
  clone
    .querySelectorAll(".codeHeader, .expand-control, button, span[hidden]")
    .forEach((n) => n.remove());
  // draw.io 図を囲む強調要素(strong/b/em/i)をアンラップする
  // （図はブロック要素で、** などで囲むと Markdown が壊れるため）
  clone.querySelectorAll(".drawio-macro").forEach((macro) => {
    let p = macro.parentElement;
    while (p && p !== clone && /^(strong|b|em|i)$/i.test(p.tagName)) {
      const parent = p.parentNode;
      while (p.firstChild) parent.insertBefore(p.firstChild, p);
      parent.removeChild(p);
      p = macro.parentElement;
    }
  });
  const md = turndownService.turndown(clone.innerHTML);
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
