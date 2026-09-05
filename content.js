// TubeMind AI - Injected Content Script (Integrated Edition)

(function() {
  // Evitar dupla injeção do script
  if (window.TubeMindAI_Loaded) return;
  window.TubeMindAI_Loaded = true;

  // --- Estado Global do Widget ---
  let isPanelExpanded = false;
  let activeTab = null; // 'transcript' | 'summary' | 'detailed'
  let currentVideoId = null;
  let simulatedAILoading = false;
  let timeUpdateListener = null;
  let aiInsightsLoaded = false;
  let freeTranscriptLoaded = false;

  // Preferências padrão do usuário
  let userSettings = {
    language: 'pt',
    theme: 'cyberpunk',
    fontSize: 'medium',
    autoOpen: true,
    apiKey: '',
    userToken: '',
    userCredits: 0
  };

  // --- Traduções Internas da UI ---
  const uiTexts = {
    pt: {
      searchPlaceholder: "Pesquisar na transcrição...",
      statusIdle: "Aguardando...",
      statusExtracting: "Extraindo Legendas...",
      statusProcessing: "Analisando com GPT...",
      statusFinalizing: "Gerando Insights...",
      statusReady: "Pronto",
      tabTranscript: "Transcrição",
      tabSummary: "Resumo IA",
      tabDetailed: "Detalhes",
      emptySearchResults: "Nenhuma fala encontrada.",
      summaryTitle: "Destaques do Vídeo",
      detailedTopics: "Tópicos Abordados",
      detailedChapters: "Capítulos e Cronograma",
      detailedSentiment: "Análise de Sentimento",
      detailedResources: "Recursos & Links"
    },
    en: {
      searchPlaceholder: "Search transcript...",
      statusIdle: "Waiting...",
      statusExtracting: "Extracting Captions...",
      statusProcessing: "GPT Processing...",
      statusFinalizing: "Generating Insights...",
      statusReady: "Ready",
      tabTranscript: "Transcript",
      tabSummary: "AI Summary",
      tabDetailed: "Details",
      emptySearchResults: "No matches found.",
      summaryTitle: "Video Takeaways",
      detailedTopics: "Topics Covered",
      detailedChapters: "Chapters & Timeline",
      detailedSentiment: "Sentiment Analysis",
      detailedResources: "Resources & Links"
    }
  };

  // --- Inicialização ---
  function init() {
    chrome.storage.local.get(userSettings, (settings) => {
      userSettings = settings;
      
      // Escutar atualizações do storage
      chrome.storage.onChanged.addListener((changes) => {
        for (let key in changes) {
          userSettings[key] = changes[key].newValue;
        }
        applyVisualPreferences();
        updateStaticUITranslations();
      });

      // Ouvintes SPA
      registerSPAListeners();
      
      // Primeira execução
      checkWatchPage();
    });
  }

  // --- Monitoramento SPA (Single Page Application) ---
  function registerSPAListeners() {
    window.addEventListener("yt-navigate-finish", () => {
      checkWatchPage();
    });

    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        checkWatchPage();
      }
    }, 1000);
  }

  // --- Verificação de Página Ativa ---
  function checkWatchPage() {
    const isWatch = window.location.href.includes("youtube.com/watch");
    const videoId = getQueryParam("v");

    if (isWatch && videoId) {
      if (videoId !== currentVideoId || !document.getElementById("tubemind-inline-container")) {
        currentVideoId = videoId;
        aiInsightsLoaded = false;
        
        // Polling leve para aguardar a coluna secundária renderizar no DOM
        const injectInterval = setInterval(() => {
          const secondaryInner = document.querySelector("#secondary-inner");
          if (secondaryInner) {
            clearInterval(injectInterval);
            injectInlineWidget(secondaryInner);
            
            // 1. Carregar transcrição local grátis e instantaneamente
            loadFreeTranscript();
            
            // 2. Se autoOpen ativo, expandir aba de transcrição (Totalmente grátis e sem custo de créditos!)
            chrome.storage.local.get({ autoOpen: true }, (items) => {
              if (items.autoOpen) {
                const chips = document.querySelectorAll(".tm-chip");
                if (chips && chips.length > 0) {
                  // Limpar outros chips/abas ativos primeiro
                  chips.forEach(c => c.classList.remove("active"));
                  const contents = document.querySelectorAll(".tm-tab-content");
                  contents.forEach(c => c.classList.remove("active"));

                  chips[0].classList.add("active"); // Transcrição
                  activeTab = "transcript";
                  document.getElementById("pane-transcript").classList.add("active");
                  updatePanelTitleText("transcript");
                  expandPanel();
                }
              }
            });
          }
        }, 300);
        
        // Timeout de segurança após 10 segundos
        setTimeout(() => clearInterval(injectInterval), 10000);
      }
    } else {
      removeWidget();
      currentVideoId = null;
    }
  }

  // --- Carregar Transcrição Local Gratuita ---
  function loadFreeTranscript() {
    freeTranscriptLoaded = false;
    const transContainer = document.getElementById("transcript-container");
    if (!transContainer) return;

    const activeId = currentVideoId;

    // Skeletons da Transcrição
    transContainer.innerHTML = `
      <div class="tm-transcript-item" style="opacity: 0.65;">
        <div class="tm-skeleton" style="width: 44px; height: 16px; flex-shrink: 0;"></div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px;">
          <div class="tm-skeleton" style="width: 95%; height: 12px;"></div>
          <div class="tm-skeleton" style="width: 50%; height: 12px;"></div>
        </div>
      </div>
    `;

    getYouTubeTranscript(activeId).then(transcriptData => {
      // Se o usuário navegou para outro vídeo durante o carregamento, cancela a renderização
      if (activeId !== currentVideoId) return;

      const fullTranscriptLines = transcriptData.lines;

      if (fullTranscriptLines && fullTranscriptLines.length > 0) {
        renderTranscript(fullTranscriptLines);
        setupVideoPlayerSync(fullTranscriptLines);
        freeTranscriptLoaded = true;
      } else {
        transContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--tm-text-dim); font-size: 0.8rem;">Nenhuma fala disponível neste vídeo.</div>`;
      }
    });
  }

  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  function removeWidget() {
    const el = document.getElementById("tubemind-inline-container");
    if (el) el.remove();
    isPanelExpanded = false;
    activeTab = null;
  }

  // --- Injeção do Widget Inline ---
  function injectInlineWidget(container) {
    removeWidget();

    const widget = document.createElement("div");
    widget.id = "tubemind-inline-container";

    widget.innerHTML = `
      <!-- Barra Horizontal Compacta -->
      <div class="tm-inline-bar">
        <div class="tm-inline-brand">
          <div class="tm-logo-dot"></div>
          <h2 class="tm-title">TubeMind AI</h2>
        </div>
        <div class="tm-inline-chips">
          <button class="tm-chip" data-tab="transcript">Transcrição</button>
          <button class="tm-chip" data-tab="summary">Resumo IA</button>
          <button class="tm-chip" data-tab="detailed">Detalhes</button>
        </div>
      </div>

      <!-- Painel Dropdown Deslizante -->
      <div class="tm-inline-panel" id="tm-dropdown-panel">
        
        <!-- Cabeçalho Interno do Painel -->
        <div class="tm-panel-header">
          <span class="tm-panel-title" id="tm-panel-title-text">Transcrição</span>
          <div class="tm-status-tag">
            <div class="tm-status-dot"></div>
            <span class="tm-status-text">Pronto</span>
          </div>
        </div>

        <!-- Painel: 1. Transcrição -->
        <section class="tm-tab-content" id="pane-transcript">
          <div class="tm-action-bar" style="display: flex !important; gap: 8px !important; align-items: center !important; margin-bottom: 4px !important; flex-shrink: 0 !important;">
            <div class="tm-search-box" style="flex: 1 !important; margin-bottom: 0 !important; position: relative !important;">
              <span class="tm-search-icon">🔍</span>
              <input type="text" class="tm-search-input" placeholder="Pesquisar...">
            </div>
            <button class="tm-copy-btn" id="tm-copy-transcript-btn" title="Copiar transcrição completa">
              <span class="tm-copy-icon">📋</span> <span class="tm-copy-text">Copiar</span>
            </button>
          </div>
          <div class="tm-transcript-list" id="transcript-container">
            <!-- Inserido dinamicamente -->
          </div>
        </section>

        <!-- Painel: 2. Resumo -->
        <section class="tm-tab-content" id="pane-summary">
          <div class="tm-summary-card">
            <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 8px !important; width: 100% !important; border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important; padding-bottom: 6px !important;">
              <p class="tm-bullet-title" id="summary-card-title" style="margin: 0 !important;">Principais Destaques</p>
              <button class="tm-copy-btn" id="tm-copy-summary-btn" title="Copiar resumo completo">
                <span class="tm-copy-icon">📋</span> <span class="tm-copy-text">Copiar</span>
              </button>
            </div>
            <blockquote class="tm-summary-blockquote" id="summary-exec">
              Carregando insights...
            </blockquote>
            <div class="tm-bullets-list" id="summary-bullets-container">
              <!-- Balão de pontos chave -->
            </div>
          </div>
        </section>

        <!-- Painel: 3. Detalhes -->
        <section class="tm-tab-content" id="pane-detailed">
          <div class="tm-accordion">
            
            <div class="tm-accordion-item">
              <div class="tm-accordion-header">
                <span class="tm-acc-title">Tópicos Abordados</span>
                <span class="tm-accordion-chevron">▼</span>
              </div>
              <div class="tm-accordion-content" id="acc-topics-content"></div>
            </div>

            <div class="tm-accordion-item">
              <div class="tm-accordion-header">
                <span class="tm-acc-title">Capítulos e Cronograma</span>
                <span class="tm-accordion-chevron">▼</span>
              </div>
              <div class="tm-accordion-content" id="acc-chapters-content"></div>
            </div>

            <div class="tm-accordion-item">
              <div class="tm-accordion-header">
                <span class="tm-acc-title">Análise de Sentimento</span>
                <span class="tm-accordion-chevron">▼</span>
              </div>
              <div class="tm-accordion-content" id="acc-sentiment-content"></div>
            </div>

            <div class="tm-accordion-item">
              <div class="tm-accordion-header">
                <span class="tm-acc-title">Recursos & Links</span>
                <span class="tm-accordion-chevron">▼</span>
              </div>
              <div class="tm-accordion-content" id="acc-resources-content"></div>
            </div>

          </div>
        </section>

      </div>
    `;

    // Inserir como primeiro filho no `#secondary-inner`
    container.insertBefore(widget, container.firstChild);

    // Configurar interações
    setupWidgetInteractions(widget);
    applyVisualPreferences();
    updateStaticUITranslations();
  }

  // --- Lógica de Interações ---
  function setupWidgetInteractions(widget) {
    const chips = widget.querySelectorAll(".tm-chip");
    const panel = widget.querySelector("#tm-dropdown-panel");
    const contents = widget.querySelectorAll(".tm-tab-content");

    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const tab = chip.getAttribute("data-tab");

        // Se clicar no chip ativo, recolhe o dropdown
        if (isPanelExpanded && activeTab === tab) {
          collapsePanel();
        } else {
          // Ativa o chip e expande o painel
          chips.forEach(c => c.classList.remove("active"));
          contents.forEach(c => c.classList.remove("active"));

          chip.classList.add("active");
          activeTab = tab;
          
          const paneId = `pane-${tab}`;
          document.getElementById(paneId).classList.add("active");

          updatePanelTitleText(tab);

          if (!isPanelExpanded) {
            expandPanel();
          }

          // Se clicou em resumo ou detalhes e ainda não carregamos do servidor, dispara
          if ((tab === 'summary' || tab === 'detailed') && !aiInsightsLoaded) {
            loadVideoInsights();
          }
        }
      });
    });

    // Accordions (Aba Detalhes)
    setupAccordionListeners();

    // Pesquisa na Transcrição
    const searchInput = widget.querySelector(".tm-search-input");
    searchInput.addEventListener("input", (e) => {
      filterTranscript(e.target.value.toLowerCase());
    });

    // --- Ouvintes do Botão de Cópia ---
    const copyTranscriptBtn = widget.querySelector("#tm-copy-transcript-btn");
    if (copyTranscriptBtn) {
      copyTranscriptBtn.addEventListener("click", () => {
        const items = widget.querySelectorAll(".tm-transcript-item");
        if (!items || items.length === 0) return;
        
        let textToCopy = "";
        items.forEach(item => {
          const time = item.querySelector(".tm-timestamp")?.textContent || "";
          const text = item.querySelector(".tm-transcript-text")?.textContent || "";
          if (text) {
            textToCopy += `[${time}] ${text}\n`;
          }
        });
        
        if (textToCopy) {
          navigator.clipboard.writeText(textToCopy.trim()).then(() => {
            showCopySuccess(copyTranscriptBtn);
          }).catch(err => {
            console.error("Erro ao copiar transcrição:", err);
          });
        }
      });
    }

    const copySummaryBtn = widget.querySelector("#tm-copy-summary-btn");
    if (copySummaryBtn) {
      copySummaryBtn.addEventListener("click", () => {
        const execSummary = widget.querySelector("#summary-exec");
        if (!execSummary) return;
        
        const execText = execSummary.innerText || "";
        // Evitar copiar banners de erro, login ou carregamento
        if (execText.includes("Carregando") || execText.includes("Login Requerido") || execText.includes("Degustação Concluída") || execText.includes("Créditos Esgotados")) {
          return;
        }
        
        const videoTitle = extractVideoTitle();
        let textToCopy = `Resumo do Vídeo: ${videoTitle}\n\n`;
        textToCopy += `Visão Geral:\n${execText}\n\n`;
        
        const bullets = widget.querySelectorAll(".tm-bullet-content");
        if (bullets && bullets.length > 0) {
          textToCopy += `Pontos Chave:\n`;
          bullets.forEach(b => {
            textToCopy += `• ${b.innerText}\n`;
          });
        }
        
        navigator.clipboard.writeText(textToCopy.trim()).then(() => {
          showCopySuccess(copySummaryBtn);
        }).catch(err => {
          console.error("Erro ao copiar resumo:", err);
        });
      });
    }
  }

  // Função auxiliar para animação e feedback visual de sucesso ao copiar
  function showCopySuccess(btn) {
    const icon = btn.querySelector(".tm-copy-icon");
    const text = btn.querySelector(".tm-copy-text");
    if (!icon || !text) return;
    
    const originalIcon = icon.textContent;
    const originalText = text.textContent;
    
    icon.textContent = "✓";
    text.textContent = "Copiado!";
    btn.classList.add("copied");
    
    setTimeout(() => {
      icon.textContent = originalIcon;
      text.textContent = originalText;
      btn.classList.remove("copied");
    }, 2000);
  }


  // --- Expandir / Recolher Painel ---
  function expandPanel() {
    const panel = document.getElementById("tm-dropdown-panel");
    if (panel) {
      panel.classList.add("expanded");
      isPanelExpanded = true;
    }
  }

  function collapsePanel() {
    const panel = document.getElementById("tm-dropdown-panel");
    const chips = document.querySelectorAll(".tm-chip");
    if (panel) {
      panel.classList.remove("expanded");
      chips.forEach(c => c.classList.remove("active"));
      isPanelExpanded = false;
      activeTab = null;
    }
  }

  function updatePanelTitleText(tab) {
    const titleEl = document.getElementById("tm-panel-title-text");
    if (!titleEl) return;

    const texts = uiTexts[userSettings.language] || uiTexts.pt;
    if (tab === 'transcript') titleEl.textContent = texts.tabTranscript;
    else if (tab === 'summary') titleEl.textContent = texts.tabSummary;
    else if (tab === 'detailed') titleEl.textContent = texts.tabDetailed;
  }

  // --- Aplicar Preferências de Estilo ---
  function applyVisualPreferences() {
    const widget = document.getElementById("tubemind-inline-container");
    if (!widget) return;

    widget.className = "";
    widget.classList.add(`theme-${userSettings.theme}`);
    widget.classList.add(`font-${userSettings.fontSize}`);
  }

  // --- Atualizar Traduções Estáticas ---
  function updateStaticUITranslations() {
    const widget = document.getElementById("tubemind-inline-container");
    if (!widget) return;

    const texts = uiTexts[userSettings.language] || uiTexts.pt;

    const chips = widget.querySelectorAll(".tm-chip");
    chips[0].textContent = texts.tabTranscript;
    chips[1].textContent = texts.tabSummary;
    chips[2].textContent = texts.tabDetailed;

    widget.querySelector(".tm-search-input").setAttribute("placeholder", texts.searchPlaceholder);
    widget.querySelector("#summary-card-title").textContent = texts.summaryTitle;

    widget.querySelectorAll(".tm-acc-title")[0].textContent = texts.detailedTopics;
    widget.querySelectorAll(".tm-acc-title")[1].textContent = texts.detailedChapters;
    widget.querySelectorAll(".tm-acc-title")[2].textContent = texts.detailedSentiment;
    widget.querySelectorAll(".tm-acc-title")[3].textContent = texts.detailedResources;

    if (activeTab) {
      updatePanelTitleText(activeTab);
    }
  }

  // --- Filtro de Transcrição ---
  function filterTranscript(query) {
    const items = document.querySelectorAll(".tm-transcript-item");
    const container = document.getElementById("transcript-container");
    const lang = userSettings.language;
    const emptyText = uiTexts[lang]?.emptySearchResults || uiTexts.pt.emptySearchResults;
    
    const existingEmpty = container.querySelector(".tm-empty-msg");
    if (existingEmpty) existingEmpty.remove();

    let visibleCount = 0;

    items.forEach(item => {
      const text = item.querySelector(".tm-transcript-text").textContent.toLowerCase();
      if (text.includes(query)) {
        item.style.display = "flex";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });

    if (visibleCount === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "tm-empty-msg";
      emptyMsg.style.cssText = "font-size: 0.82rem; color: var(--tm-text-dim); text-align: center; margin-top: 15px;";
      emptyMsg.textContent = emptyText;
      container.appendChild(emptyMsg);
    }
  }

  // --- Auxiliar para Parsing do XML de Legendas ---
  function parseXmlTranscript(xmlText) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      let textNodes = xmlDoc.getElementsByTagName("text");
      if (!textNodes || textNodes.length === 0) {
        textNodes = xmlDoc.getElementsByTagName("p");
      }
      
      let lines = [];
      let currentParagraph = "";
      let paragraphStartTime = null;
      
      for (let node of textNodes) {
        const startAttr = node.getAttribute("start") || node.getAttribute("t");
        let startSec = startAttr ? parseFloat(startAttr) : 0;
        
        if (node.getAttribute("t") && !node.getAttribute("start")) {
          startSec = startSec / 1000;
        }
        
        const cleanText = node.textContent
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        
        if (!cleanText) continue;

        if (paragraphStartTime === null) {
          paragraphStartTime = Math.floor(startSec);
        }

        currentParagraph += (currentParagraph ? " " : "") + cleanText;

        const currentDuration = startSec - paragraphStartTime;
        const endsWithSentenceBoundary = /[.!?]$/.test(cleanText);

        if (currentDuration >= 40 || (currentDuration >= 20 && endsWithSentenceBoundary)) {
          lines.push({
            start: paragraphStartTime,
            text: currentParagraph
          });
          currentParagraph = "";
          paragraphStartTime = null;
        }
      }

      if (currentParagraph) {
        lines.push({
          start: paragraphStartTime !== null ? paragraphStartTime : 0,
          text: currentParagraph
        });
      }

      let rawTranscript = "";
      lines.forEach(line => {
        const minutes = Math.floor(line.start / 60);
        const seconds = Math.floor(line.start % 60);
        const timeStr = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
        rawTranscript += `${timeStr} ${line.text} `;
      });

      return {
        text: rawTranscript.trim().substring(0, 10000),
        lines: lines
      };
    } catch (e) {
      console.error("Error parsing XML transcript:", e);
      return { text: "", lines: [] };
    }
  }

  // --- Parser Duplo de Transcrição (Suporta JSON e XML de forma transparente) ---
  function parseTranscript(text) {
    try {
      if (text && text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (data.events) {
          let lines = [];
          let currentParagraph = "";
          let paragraphStartTime = null;

          for (let event of data.events) {
            let segmentText = "";
            if (event.segs) {
              segmentText = event.segs.map(s => {
                if (typeof s === 'string') return s;
                if (s && typeof s === 'object') {
                  return s.utf8 || s.text || "";
                }
                return "";
              }).join("").trim();
            } else if (event.utf8) {
              segmentText = event.utf8.trim();
            } else if (event.text) {
              segmentText = event.text.trim();
            }
            if (!segmentText) continue;

            const startSec = (event.tStartMs || 0) / 1000;

            if (paragraphStartTime === null) {
              paragraphStartTime = Math.floor(startSec);
            }

            currentParagraph += (currentParagraph ? " " : "") + segmentText;

            const currentDuration = startSec - paragraphStartTime;
            const endsWithSentenceBoundary = /[.!?]$/.test(segmentText);

            if (currentDuration >= 40 || (currentDuration >= 20 && endsWithSentenceBoundary)) {
              lines.push({
                start: paragraphStartTime,
                text: currentParagraph
              });
              currentParagraph = "";
              paragraphStartTime = null;
            }
          }

          if (currentParagraph) {
            lines.push({
              start: paragraphStartTime !== null ? paragraphStartTime : 0,
              text: currentParagraph
            });
          }

          let rawTranscript = "";
          lines.forEach(line => {
            const minutes = Math.floor(line.start / 60);
            const seconds = Math.floor(line.start % 60);
            const timeStr = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
            rawTranscript += `${timeStr} ${line.text} `;
          });

          return {
            text: rawTranscript.trim().substring(0, 10000),
            lines: lines
          };
        }
      }
    } catch (e) {
      console.warn("Failed to parse transcript as JSON, falling back to XML:", e);
    }
    return parseXmlTranscript(text);
  }

  // --- Auxiliar para Fetch seguro via Background Service Worker (Bypass CORS e CSP) ---
  function fetchFromBackground(url) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "fetch_url", url: url }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response.text);
        } else {
          reject(new Error(response?.error || "Fetch failed"));
        }
      });
    });
  }

  // --- Funções Auxiliares para Extração de Player Response (DOM/HTML) ---
  function extractJsonObject(str) {
    let braceCount = 0;
    let inString = false;
    let escape = false;
    let end = -1;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            end = i;
            break;
          }
        }
      }
    }

    if (end !== -1) {
      return str.substring(0, end + 1);
    }
    return null;
  }

  function extractPlayerResponseFromHtml(htmlText) {
    const regexes = [
      /ytInitialPlayerResponse\s*=\s*({.+?});/,
      /ytInitialPlayerResponse\s*=\s*({.+?})\s*</,
      /window\[['"]ytInitialPlayerResponse['"]\]\s*=\s*({.+?});/,
      /window\[['"]ytInitialPlayerResponse['"]\]\s*=\s*({.+?})\s*</,
      /ytInitialPlayerResponse\s*=\s*({.+?})$/m
    ];

    for (let regex of regexes) {
      const match = htmlText.match(regex);
      if (match && match[1]) {
        try {
          return JSON.parse(match[1].trim());
        } catch (e) {
          try {
            const cleaned = extractJsonObject(match[1]);
            if (cleaned) {
              return JSON.parse(cleaned);
            }
          } catch (err) {}
        }
      }
    }

    const index = htmlText.indexOf("ytInitialPlayerResponse");
    if (index !== -1) {
      const subset = htmlText.substring(index);
      const startBrace = subset.indexOf("{");
      if (startBrace !== -1) {
        const objStr = extractJsonObject(subset.substring(startBrace));
        if (objStr) {
          try {
            return JSON.parse(objStr);
          } catch (e) {}
        }
      }
    }

    return null;
  }

  function processPlayerResponseCaptions(playerResponse) {
    if (!playerResponse || !playerResponse.captions || !playerResponse.captions.playerCaptionsTracklistRenderer) {
      return Promise.reject("No captions renderer");
    }

    const tracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
    if (!tracks || tracks.length === 0) {
      return Promise.reject("No caption tracks");
    }

    // Selecionar trilha recomendada (Português, depois Inglês, ou a primeira)
    let selectedTrack = tracks.find(t => t.languageCode && t.languageCode.startsWith('pt')) || 
                        tracks.find(t => t.languageCode && t.languageCode.startsWith('en')) || 
                        tracks[0];

    if (!selectedTrack || !selectedTrack.baseUrl) {
      return Promise.reject("No selected track");
    }

    // Limpar o baseUrl
    let baseUrl = selectedTrack.baseUrl.replace(/&amp;/g, '&');

    return fetchFromBackground(baseUrl)
      .then(rawText => {
        const parsed = parseTranscript(rawText);
        if (parsed && parsed.lines && parsed.lines.length > 0) {
          return parsed;
        }
        throw new Error("Empty parsed transcript");
      });
  }

  // --- Função para Injetar o Script Externo de Forma Segura (CSP-compliant) ---
  function injectPageScript(callback) {
    const existing = document.getElementById('tubemind-injected-script');
    if (existing) {
      if (callback) callback();
      return;
    }
    try {
      const script = document.createElement('script');
      script.id = 'tubemind-injected-script';
      script.src = chrome.runtime.getURL('inject.js');
      script.onload = () => {
        if (callback) callback();
      };
      script.onerror = () => {
        console.warn("Failed to load injected script via onload");
        if (callback) callback();
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.warn("Failed to inject Page Script:", e);
      if (callback) callback();
    }
  }

  // --- Algoritmo de Extração de Legendas XML do YouTube (Custo Zero) ---
  function getYouTubeTranscript(targetVideoId) {
    return new Promise((resolve) => {
      let isResolved = false;

      function safeResolve(data) {
        if (!isResolved) {
          isResolved = true;
          resolve(data);
        }
      }

      // ENGINE C: DOM Script & HTML Fetch Parser (100% CSP-Immune, extremely fast)
      try {
        let domResponseFound = false;
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
          const text = scripts[i].textContent;
          if (text && text.includes("ytInitialPlayerResponse")) {
            const playerResponse = extractPlayerResponseFromHtml(text);
            if (playerResponse && playerResponse.videoDetails?.videoId === targetVideoId) {
              domResponseFound = true;
              processPlayerResponseCaptions(playerResponse)
                .then(parsed => {
                  if (parsed && parsed.lines && parsed.lines.length > 0) {
                    safeResolve(parsed);
                  }
                })
                .catch(() => {});
              break;
            }
          }
        }

        // Se não encontrou no DOM atual (SPA transition), busca o HTML da página do vídeo
        if (!domResponseFound) {
          fetchFromBackground(`https://www.youtube.com/watch?v=${targetVideoId}`)
            .then(htmlText => {
              const playerResponse = extractPlayerResponseFromHtml(htmlText);
              if (playerResponse && playerResponse.videoDetails?.videoId === targetVideoId) {
                return processPlayerResponseCaptions(playerResponse);
              }
              throw new Error();
            })
            .then(parsed => {
              if (parsed && parsed.lines && parsed.lines.length > 0) {
                safeResolve(parsed);
              }
            })
            .catch(() => {});
        }
      } catch (e) {
        console.warn("TubeMind Engine C warning:", e);
      }

      // ENGINE A: Injected Script Context Player Response (Assíncrono e CSP-compliant)
      injectPageScript(() => {
        // Escuta a resposta enviada pelo script injetado (Page Context)
        const listener = (event) => {
          if (event.detail?.targetVideoId !== targetVideoId) return;
          document.removeEventListener('TubeMind_InjectedPlayerResponse', listener);
          
          const playerResponse = event.detail.response;
          if (!playerResponse || !playerResponse.captions || !playerResponse.captions.playerCaptionsTracklistRenderer) {
            // Deixa as outras engines tentarem caso o playerResponse não tenha captions
            return;
          }

          const tracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
          if (!tracks || tracks.length === 0) {
            return;
          }

          // Selecionar trilha recomendada (Português, depois Inglês, ou a primeira)
          let selectedTrack = tracks.find(t => t.languageCode && t.languageCode.startsWith('pt')) || 
                              tracks.find(t => t.languageCode && t.languageCode.startsWith('en')) || 
                              tracks[0];

          if (!selectedTrack || !selectedTrack.baseUrl) {
            return;
          }

          // Limpeza e normalização do baseUrl
          let baseUrl = selectedTrack.baseUrl.replace(/&amp;/g, '&');

          // Tenta usar a transcrição já buscada no Page Context (imune a PoToken/CSP/Assinaturas)
          const transcriptText = event.detail.transcriptText;
          if (transcriptText) {
            const parsed = parseTranscript(transcriptText);
            if (parsed && parsed.lines && parsed.lines.length > 0) {
              safeResolve(parsed);
              return;
            }
          }

          // Fallback: faz o fetch robusto via background se não veio no evento ou falhou no parsing
          fetchFromBackground(baseUrl)
            .then(rawText => {
              const parsed = parseTranscript(rawText);
              if (parsed && parsed.lines && parsed.lines.length > 0) {
                safeResolve(parsed);
              } else {
                console.warn("TubeMind Engine A: Parsed transcript was empty");
              }
            })
            .catch(err => {
              console.error("TubeMind Engine A fetch error:", err);
            });
        };

        document.addEventListener('TubeMind_InjectedPlayerResponse', listener);

        // Dispara o evento solicitando os dados para o script injetado
        document.dispatchEvent(new CustomEvent('TubeMind_RequestPlayerResponse', {
          detail: { targetVideoId }
        }));
      });

      // ENGINE B: Direct Same-Origin Fetch Fallback Chain (100% imune a CSP e bloqueios de script)
      // Tenta buscar diretamente trilhas de legendas conhecidas via timedtext em paralelo
      function tryFetchDirectTrack(lang, kind) {
        let url = `https://www.youtube.com/api/timedtext?fmt=srv1&v=${targetVideoId}&lang=${lang}`;
        if (kind) url += `&kind=${kind}`;
        return fetchFromBackground(url)
          .then(rawText => {
            const parsed = parseTranscript(rawText);
            if (parsed && parsed.lines && parsed.lines.length > 0) {
              return parsed;
            }
            throw new Error();
          });
      }

      const directFetches = [
        tryFetchDirectTrack('pt-BR', 'asr'),
        tryFetchDirectTrack('pt-BR', null),
        tryFetchDirectTrack('pt', 'asr'),
        tryFetchDirectTrack('pt', null),
        tryFetchDirectTrack('en', 'asr'),
        tryFetchDirectTrack('en', null),
        tryFetchDirectTrack('es', 'asr'),
        tryFetchDirectTrack('es', null),
        // Fallback manual geral usando type=list
        fetchFromBackground(`https://www.youtube.com/api/timedtext?type=list&v=${targetVideoId}`)
          .then(xmlText => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const tracks = xmlDoc.getElementsByTagName("track");
            
            if (!tracks || tracks.length === 0) {
              throw new Error("No manual tracks");
            }
            
            let selectedTrack = null;
            for (let i = 0; i < tracks.length; i++) {
              const lang = tracks[i].getAttribute("lang_code");
              if (lang && lang.startsWith("pt")) {
                selectedTrack = tracks[i];
                break;
              }
            }
            if (!selectedTrack) {
              for (let i = 0; i < tracks.length; i++) {
                const lang = tracks[i].getAttribute("lang_code");
                if (lang && lang.startsWith("en")) {
                  selectedTrack = tracks[i];
                  break;
                }
              }
            }
            if (!selectedTrack) {
              selectedTrack = tracks[0];
            }
            
            const langCode = selectedTrack.getAttribute("lang_code");
            const name = selectedTrack.getAttribute("name");
            const kind = selectedTrack.getAttribute("kind");
            
            let fetchUrl = `https://www.youtube.com/api/timedtext?fmt=srv1&v=${targetVideoId}&lang=${langCode}`;
            if (name) fetchUrl += `&name=${encodeURIComponent(name)}`;
            if (kind) fetchUrl += `&kind=${encodeURIComponent(kind)}`;
            
            return fetchFromBackground(fetchUrl);
          })
          .then(rawText => {
            if (rawText) {
              const parsed = parseTranscript(rawText);
              if (parsed && parsed.lines && parsed.lines.length > 0) {
                return parsed;
              }
            }
            throw new Error();
          })
      ];

      // Resolve com a primeira ENGINE ou requisição direta que obtiver sucesso!
      Promise.any(directFetches)
        .then(parsed => {
          if (parsed && parsed.lines && parsed.lines.length > 0) {
            safeResolve(parsed);
          }
        })
        .catch(() => {
          // Apenas loga erro das requisições diretas em segundo plano
        });

      // Timeout final de segurança (se absolutamente nada funcionar em 5.5 segundos, resolve vazio)
      setTimeout(() => {
        safeResolve({ text: "", lines: [] });
      }, 5500);
    });
  }

  // --- Carregar e Processar Insights pelo Servidor ---
  function loadVideoInsights() {
    if (simulatedAILoading || aiInsightsLoaded) return;
    simulatedAILoading = true;

    const widget = document.getElementById("tubemind-inline-container");
    if (!widget) {
      simulatedAILoading = false;
      return;
    }

    // 1. Ler credenciais do usuário e do visitante do storage local
    chrome.storage.local.get({
      userToken: '',
      guestToken: '',
      autoOpen: true
    }, (items) => {
      
      let token = items.userToken;
      let isGuestRequest = false;

      // Se o usuário não está logado, gera e usa um token de visitante anônimo (Sem Fricção!)
      if (!token) {
        isGuestRequest = true;
        token = items.guestToken;
        if (!token) {
          token = 'guest_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          chrome.storage.local.set({ guestToken: token });
        }
      }

      const videoTitle = extractVideoTitle();
      const channelName = extractChannelName();

      setProcessingStatus("loading", "statusProcessing");
      renderLoadingSkeletons();

      // Expandir painel na aba Resumo IA se autoOpen ativo
      if (items.autoOpen && !isPanelExpanded) {
        const chips = widget.querySelectorAll(".tm-chip");
        chips[1].classList.add("active"); // Resumo IA
        activeTab = "summary";
        document.getElementById("pane-summary").classList.add("active");
        updatePanelTitleText("summary");
        expandPanel();
      }

      // Buscar transcrição real e disparar para o servidor
      const activeId = currentVideoId;
      getYouTubeTranscript(activeId).then(transcriptData => {
        if (activeId !== currentVideoId) return;

        const transcriptText = transcriptData.text;
        const fullTranscriptLines = transcriptData.lines;

        // Renderizar imediatamente a transcrição real completa!
        if (fullTranscriptLines.length > 0) {
          renderTranscript(fullTranscriptLines);
          setupVideoPlayerSync(fullTranscriptLines);
        }

        const authHeader = isGuestRequest ? `Guest ${token}` : `Bearer ${token}`;

        fetch("https://4u.ia.br/app/tubemind/index.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader
          },
          body: JSON.stringify({
            token: token,
            is_guest: isGuestRequest,
            video_id: currentVideoId,
            video_title: videoTitle,
            channel_name: channelName,
            transcript: transcriptText
          })
        })
        .then(res => {
          if (!res.ok) {
            return res.json().then(errData => {
              if (res.status === 402) {
                if (errData.error === "guest_limit_reached") {
                  throw new Error("guest_limit_reached");
                } else {
                  throw new Error("credits_exhausted");
                }
              }
              if (res.status === 401 || res.status === 403) {
                throw new Error("auth_expired");
              }
              throw new Error(errData.error || errData.message || "server_error");
            }).catch(() => {
              if (res.status === 402) throw new Error("credits_exhausted");
              if (res.status === 401 || res.status === 403) throw new Error("auth_expired");
              throw new Error("server_error");
            });
          }
          return res.json();
        })
        .then(result => {
          if (result.success && result.data) {
            const aiData = result.data;
            
            // Renderizar resumos e detalhes retornados pelo servidor
            renderSummary(aiData.summaryExec || '', aiData.bullets || []);
            renderDetails(aiData.accordion || { topics: '', chapters: '', sentiment: '', resources: '' });

            // Se não conseguimos carregar a transcrição real (vídeo sem legenda), usamos a da IA
            if (fullTranscriptLines.length === 0 && aiData.transcript && aiData.transcript.length > 0) {
              renderTranscript(aiData.transcript);
              setupVideoPlayerSync(aiData.transcript);
            }

            setProcessingStatus("ready", "statusReady");
            aiInsightsLoaded = true;

            // Salva créditos premium localmente se não for visitante
            if (!isGuestRequest) {
              chrome.storage.local.set({ userCredits: result.credits_left });
            }
          } else {
            throw new Error("invalid_data");
          }
          simulatedAILoading = false;
        })
        .catch(err => {
          simulatedAILoading = false;

          if (err.message === "guest_limit_reached") {
            renderGuestLimitReachedUI();
          } else if (err.message === "credits_exhausted") {
            renderCreditsExhaustedUI();
          } else if (err.message === "auth_expired") {
            renderAuthRequiredUI(true);
          } else {
            const displayMsg = (err.message !== "server_error" && err.message !== "Failed to fetch") ? err.message : null;
            renderServerErrorUI(displayMsg);
          }
        });
      });
    });
  }

  function extractVideoTitle() {
    const s1 = document.querySelector("h1.ytd-watch-metadata yt-formatted-string");
    const s2 = document.querySelector("ytd-watch-metadata #title yt-formatted-string");
    const s3 = document.querySelector("#container > h1 > yt-formatted-string");
    return (s1 || s2 || s3)?.innerText || "Vídeo do YouTube";
  }

  function extractChannelName() {
    const s1 = document.querySelector("#upload-info #channel-name a");
    const s2 = document.querySelector("ytd-channel-name yt-formatted-string a");
    const s3 = document.querySelector("#owner-name a");
    return (s1 || s2 || s3)?.innerText || "Canal Criador";
  }

  function setProcessingStatus(state, textKey) {
    const widget = document.getElementById("tubemind-inline-container");
    if (!widget) return;

    const dot = widget.querySelector(".tm-status-dot");
    const textEl = widget.querySelector(".tm-status-text");
    const lang = userSettings.language;
    const label = uiTexts[lang]?.[textKey] || uiTexts.pt[textKey];

    if (state === "loading") {
      dot.className = "tm-status-dot loading";
    } else {
      dot.className = "tm-status-dot";
    }
    
    textEl.textContent = label;
  }

  function renderLoadingSkeletons() {
    const bulletContainer = document.getElementById("summary-bullets-container");
    const execSummary = document.getElementById("summary-exec");
    const paneDetailed = document.getElementById("pane-detailed");

    // Skeletons do Resumo
    execSummary.innerHTML = `
      <div class="tm-skeleton" style="width: 100%; height: 12px; margin-bottom: 5px;"></div>
      <div class="tm-skeleton" style="width: 92%; height: 12px; margin-bottom: 5px;"></div>
      <div class="tm-skeleton" style="width: 35%; height: 12px;"></div>
    `;

    let bulletHTML = "";
    for (let i = 0; i < 3; i++) {
      bulletHTML += `
        <div class="tm-bullet-item" style="align-items: center; opacity: 0.65;">
          <div class="tm-skeleton" style="width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;"></div>
          <div class="tm-skeleton" style="width: 85%; height: 12px;"></div>
        </div>
      `;
    }
    bulletContainer.innerHTML = bulletHTML;

    // Skeletons do Detalhes (Accordion)
    if (paneDetailed) {
      paneDetailed.innerHTML = `
        <div class="tm-accordion">
          <div class="tm-accordion-item">
            <div class="tm-accordion-header">
              <span class="tm-acc-title">Tópicos Abordados</span>
              <span class="tm-accordion-chevron">▼</span>
            </div>
            <div class="tm-accordion-content" id="acc-topics-content">
              <div class="tm-skeleton" style="width: 90%; height: 12px; margin: 10px 0;"></div>
              <div class="tm-skeleton" style="width: 70%; height: 12px; margin: 10px 0;"></div>
            </div>
          </div>
          <div class="tm-accordion-item">
            <div class="tm-accordion-header">
              <span class="tm-acc-title">Capítulos e Cronograma</span>
              <span class="tm-accordion-chevron">▼</span>
            </div>
            <div class="tm-accordion-content" id="acc-chapters-content">
              <div class="tm-skeleton" style="width: 85%; height: 12px; margin: 10px 0;"></div>
              <div class="tm-skeleton" style="width: 60%; height: 12px; margin: 10px 0;"></div>
            </div>
          </div>
          <div class="tm-accordion-item">
            <div class="tm-accordion-header">
              <span class="tm-acc-title">Análise de Sentimento</span>
              <span class="tm-accordion-chevron">▼</span>
            </div>
            <div class="tm-accordion-content" id="acc-sentiment-content">
              <div class="tm-skeleton" style="width: 40%; height: 12px; margin: 10px 0;"></div>
            </div>
          </div>
          <div class="tm-accordion-item">
            <div class="tm-accordion-header">
              <span class="tm-acc-title">Recursos & Links</span>
              <span class="tm-accordion-chevron">▼</span>
            </div>
            <div class="tm-accordion-content" id="acc-resources-content">
              <div class="tm-skeleton" style="width: 95%; height: 12px; margin: 10px 0;"></div>
            </div>
          </div>
        </div>
      `;
      setupAccordionListeners();
    }
  }

  function setupAccordionListeners() {
    const widget = document.getElementById("tubemind-inline-container");
    if (!widget) return;
    const accHeaders = widget.querySelectorAll(".tm-accordion-header");
    accHeaders.forEach(header => {
      header.addEventListener("click", () => {
        const item = header.parentElement;
        const isActive = item.classList.contains("active");
        
        widget.querySelectorAll(".tm-accordion-item").forEach(i => i.classList.remove("active"));

        if (!isActive) {
          item.classList.add("active");
        }
      });
    });
  }

  // --- Banners de Estado da Conta & Créditos (Keep AI Integrado) ---

  function renderGuestLimitReachedUI() {
    setProcessingStatus("ready", "statusReady");

    const bannerHTML = `
      <div style="padding: 24px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; background: rgba(62, 166, 255, 0.03); border-radius: 12px; border: 1px dashed rgba(62,166,255,0.25); margin: 10px 0;">
        <span style="font-size: 2.2rem; filter: drop-shadow(0 0 10px rgba(62,166,255,0.25));">📊</span>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <h3 style="font-size: 0.85rem; font-weight: 700; color: #3ea6ff; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">Degustação Concluída</h3>
          <p style="font-size: 0.78rem; color: var(--tm-text-dim); line-height: 1.4; margin: 0;">Você usou seu 1 resumo diário como visitante hoje. Crie sua conta Keep AI gratuitamente para liberar <b>3 resumos todos os dias!</b></p>
        </div>
        <button id="tm-btn-open-register" class="tm-timestamp" style="font-size: 0.8rem; font-weight: 600; padding: 8px 20px; border-radius: 8px; align-self: center; margin-top: 5px;">Criar Conta Grátis</button>
      </div>
    `;

    document.getElementById("summary-exec").innerHTML = bannerHTML;
    document.getElementById("summary-bullets-container").innerHTML = "";

    const paneDetailed = document.getElementById("pane-detailed");
    if (paneDetailed) {
      paneDetailed.innerHTML = bannerHTML;
    }

    setTimeout(() => {
      const btnRegisters = document.querySelectorAll("#tm-btn-open-register");
      btnRegisters.forEach(btn => {
        btn.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "open_options" });
        });
      });
    }, 100);
  }


  function renderAuthRequiredUI(isExpired = false) {
    setProcessingStatus("ready", "statusReady");

    const message = isExpired ? 
      "Sua sessão do Keep AI expirou! Por favor, reconecte." : 
      "Faça login na sua conta do Keep AI para gerar resumos de vídeos.";

    const bannerHTML = `
      <div style="padding: 24px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; background: rgba(255,255,255,0.01); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1); margin: 10px 0;">
        <span style="font-size: 2.2rem; filter: drop-shadow(0 0 10px rgba(62,166,255,0.2));">🔒</span>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <h3 style="font-size: 0.85rem; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">Login Requerido</h3>
          <p style="font-size: 0.78rem; color: var(--tm-text-dim); line-height: 1.4; margin: 0;">${message}</p>
        </div>
        <button id="tm-btn-open-login" class="tm-timestamp" style="font-size: 0.8rem; font-weight: 600; padding: 8px 20px; border-radius: 8px; align-self: center; margin-top: 5px;">Conectar Conta</button>
      </div>
    `;

    document.getElementById("summary-exec").innerHTML = bannerHTML;
    document.getElementById("summary-bullets-container").innerHTML = "";

    const paneDetailed = document.getElementById("pane-detailed");
    if (paneDetailed) {
      paneDetailed.innerHTML = bannerHTML;
    }

    // Ouvintes
    setTimeout(() => {
      const btnLogins = document.querySelectorAll("#tm-btn-open-login");
      btnLogins.forEach(btn => {
        btn.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "open_options" });
        });
      });
    }, 100);
  }

  function renderCreditsExhaustedUI() {
    setProcessingStatus("ready", "statusReady");

    const buyUrl = userSettings.userToken
      ? `https://4u.ia.br/app/keepai/?token=${encodeURIComponent(userSettings.userToken)}&action=buy`
      : 'https://4u.ia.br/app/keepai/?from=tubemind';

    const bannerHTML = `
      <div style="padding: 24px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; background: rgba(239, 68, 68, 0.03); border-radius: 12px; border: 1px dashed rgba(239,68,68,0.2); margin: 10px 0;">
        <span style="font-size: 2.2rem; filter: drop-shadow(0 0 10px rgba(239,68,68,0.25));">⚠️</span>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <h3 style="font-size: 0.85rem; font-weight: 700; color: #ef4444; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">Créditos Esgotados</h3>
          <p style="font-size: 0.78rem; color: var(--tm-text-dim); line-height: 1.4; margin: 0;">Você gastou todas as suas fichas de resumo do Keep AI. Recarregue no portal para continuar.</p>
        </div>
        <a href="${buyUrl}" target="_blank" class="tm-timestamp" style="font-size: 0.8rem; font-weight: 600; padding: 8px 20px; border-radius: 8px; text-decoration: none; align-self: center; margin-top: 5px;">Recarregar via PIX</a>
      </div>
    `;

    document.getElementById("summary-exec").innerHTML = bannerHTML;
    document.getElementById("summary-bullets-container").innerHTML = "";

    const paneDetailed = document.getElementById("pane-detailed");
    if (paneDetailed) {
      paneDetailed.innerHTML = bannerHTML;
    }
  }

  function renderServerErrorUI(customMessage = null) {
    setProcessingStatus("ready", "statusReady");

    const message = customMessage || "Não conseguimos nos conectar à API de IA. Verifique sua conexão e tente novamente.";

    const bannerHTML = `
      <div style="padding: 24px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; background: rgba(255,255,255,0.01); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.08); margin: 10px 0;">
        <span style="font-size: 2.2rem; filter: drop-shadow(0 0 8px rgba(255,255,255,0.1));">❌</span>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <h3 style="font-size: 0.85rem; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">Erro de Processamento</h3>
          <p style="font-size: 0.78rem; color: var(--tm-text-dim); line-height: 1.4; margin: 0;">${message}</p>
        </div>
        <button id="tm-btn-retry" class="tm-timestamp" style="font-size: 0.8rem; font-weight: 600; padding: 8px 20px; border-radius: 8px; align-self: center; margin-top: 5px;">Tentar Novamente</button>
      </div>
    `;

    document.getElementById("summary-exec").innerHTML = bannerHTML;
    document.getElementById("summary-bullets-container").innerHTML = "";

    setTimeout(() => {
      const btnRetries = document.querySelectorAll("#tm-btn-retry");
      btnRetries.forEach(btn => {
        btn.addEventListener("click", () => {
          loadVideoInsights();
        });
      });
    }, 100);
  }

  // --- Renderizadores ---
  function renderTranscript(transcriptData) {
    const container = document.getElementById("transcript-container");
    let html = "";

    if (transcriptData.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--tm-text-dim); font-size: 0.8rem;">Nenhuma fala disponível neste vídeo.</div>`;
      return;
    }

    transcriptData.forEach((line) => {
      const minutes = Math.floor(line.start / 60);
      const seconds = line.start % 60;
      const displayTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      html += `
        <div class="tm-transcript-item" data-start="${line.start}">
          <span class="tm-timestamp">${displayTime}</span>
          <span class="tm-transcript-text">${line.text}</span>
        </div>
      `;
    });

    container.innerHTML = html;

    const timestamps = container.querySelectorAll(".tm-timestamp");
    timestamps.forEach(btn => {
      btn.addEventListener("click", () => {
        const item = btn.parentElement;
        const seconds = parseInt(item.getAttribute("data-start"));
        seekYouTubeVideo(seconds);
      });
    });
  }

  function renderSummary(execText, bullets) {
    document.getElementById("summary-exec").innerHTML = execText;

    const bulletsContainer = document.getElementById("summary-bullets-container");
    let html = "";
    
    bullets.forEach(bullet => {
      html += `
        <div class="tm-bullet-item">
          <span class="tm-bullet-icon">✦</span>
          <span class="tm-bullet-content">${bullet}</span>
        </div>
      `;
    });
    
    bulletsContainer.innerHTML = html;
  }

  function renderDetails(accData) {
    document.getElementById("acc-topics-content").innerHTML = accData.topics;
    document.getElementById("acc-chapters-content").innerHTML = accData.chapters;
    document.getElementById("acc-sentiment-content").innerHTML = accData.sentiment;
    document.getElementById("acc-resources-content").innerHTML = accData.resources;
  }

  function seekYouTubeVideo(seconds) {
    const video = document.querySelector("video");
    if (video) {
      video.currentTime = seconds;
      video.play();
    }
  }

  // --- Sincronização em Tempo Real das Falas ---
  function setupVideoPlayerSync(transcriptData) {
    const video = document.querySelector("video");
    if (!video) return;

    if (timeUpdateListener) {
      video.removeEventListener("timeupdate", timeUpdateListener);
    }

    const items = document.querySelectorAll(".tm-transcript-item");
    const container = document.getElementById("pane-transcript");

    timeUpdateListener = () => {
      const currentTime = video.currentTime;
      let activeIndex = -1;

      for (let i = 0; i < transcriptData.length; i++) {
        if (currentTime >= transcriptData[i].start) {
          activeIndex = i;
        } else {
          break;
        }
      }

      if (activeIndex !== -1) {
        items.forEach((item, index) => {
          if (index === activeIndex) {
            if (!item.classList.contains("playing")) {
              item.classList.add("playing");
              
              // Rolagem automática se a aba de transcrição estiver ativa
              const isTranscriptActive = container.classList.contains("active");
              if (isTranscriptActive) {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }
          } else {
            item.classList.remove("playing");
          }
        });
      }
    };

    video.addEventListener("timeupdate", timeUpdateListener);
  }

  // --- Escutador de Mensagens ---
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle_sidebar") {
      const widget = document.getElementById("tubemind-inline-container");
      if (widget) {
        if (isPanelExpanded) {
          collapsePanel();
        } else {
          const chips = widget.querySelectorAll(".tm-chip");
          const contents = widget.querySelectorAll(".tm-tab-content");
          
          chips.forEach(c => c.classList.remove("active"));
          contents.forEach(c => c.classList.remove("active"));

          chips[1].classList.add("active");
          activeTab = "summary";
          document.getElementById("pane-summary").classList.add("active");
          updatePanelTitleText("summary");
          expandPanel();

          if (!aiInsightsLoaded) {
            loadVideoInsights();
          }
        }
        sendResponse({ status: "toggled", state: isPanelExpanded });
      }
    }
  });

  // Inicializar
  init();

})();
