// TubeMind AI - Background Service Worker

// 1. Onboarding Automático pós-Instalação
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?tutorial=true') });
  }
});

// 2. Ação ao Clicar no Ícone da Extensão
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes("youtube.com/watch")) {
    // Se o usuário estiver assistindo a um vídeo, tenta alternar a sidebar na aba atual
    chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" }).catch((err) => {
      console.warn("Script de conteúdo não está pronto ou injetado na aba ativa: ", err);
      // Fallback: abrir a página de opções
      chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
    });
  } else {
    // Caso contrário, abre a página de opções/configurações
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

// 3. Ouvinte de Mensagens Especializadas (ex: Abrir Opções, Proxy Fetch)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "open_options") {
    chrome.runtime.openOptionsPage();
    sendResponse({ status: "success" });
  } else if (request.action === "fetch_url") {
    // Chrome Web Store Compliance: Strict URL host validation to prevent SSRF / remote request injection
    try {
      const parsedUrl = new URL(request.url);
      const hostname = parsedUrl.hostname.toLowerCase();
      const isAllowed = hostname === '4u.ia.br' || hostname.endsWith('.youtube.com') || hostname === 'youtube.com';
      if (!isAllowed) {
        sendResponse({ success: false, error: "URL not allowed by security policy." });
        return true;
      }
    } catch (e) {
      sendResponse({ success: false, error: "Invalid request URL." });
      return true;
    }

    fetch(request.url, {
      method: "GET",
      credentials: "include",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then(text => {
        sendResponse({ success: true, text: text });
      })
      .catch(err => {
        console.error("Background fetch_url error:", err);
        sendResponse({ success: false, error: err.toString() });
      });
    return true; // Keep channel open for async response
  }
});
