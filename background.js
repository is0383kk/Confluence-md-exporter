/* background.js v1.0.5 */
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.id || !/^https?:/i.test(tab.url || "")) return;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["turndown.js", "content.js"]
    });
    console.log("[Exporter] Scripts injected");
  } catch (e) {
    console.error("[Exporter] Injection error:", e);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action === "downloadMd") {
    try { sendResponse({ ok: true }); } catch {}
    // Encode content as base64 DataURL (avoid URL.createObjectURL in SW)
    try {
      const b64 = btoa(unescape(encodeURIComponent(msg.content)));
      const dataUrl = "data:text/markdown;charset=utf-8;base64," + b64;
      chrome.downloads.download({
        url: dataUrl,
        filename: msg.filename || "confluence-page.md",
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("[Exporter] downloads.download error:", chrome.runtime.lastError.message);
          return;
        }
        console.log("[Exporter] Download started id=", downloadId);
      });
    } catch (e) {
      console.error("[Exporter] DataURL download failed:", e);
    }
    return true;
  }
});
