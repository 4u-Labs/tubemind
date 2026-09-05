// TubeMind AI - Injected Script (Page Context)
(function() {
  if (window.TubeMindAI_Injected_Loaded) return;
  window.TubeMindAI_Injected_Loaded = true;

  window.TubeMindAI_PoTokens = window.TubeMindAI_PoTokens || {};

  // Função para extrair o PoToken simulando o clique duplo do Glasp
  function getPoToken(videoId) {
    if (window.TubeMindAI_PoTokens[videoId]) {
      return Promise.resolve(window.TubeMindAI_PoTokens[videoId]);
    }

    const sT = "#movie_player > div.ytp-chrome-bottom > div.ytp-chrome-controls > div.ytp-right-controls > button.ytp-subtitles-button.ytp-button";
    const iT = "#movie_player > div.ytp-chrome-bottom > div.ytp-chrome-controls > div.ytp-right-controls > div.ytp-right-controls-left > button.ytp-subtitles-button.ytp-button";
    const btn = document.querySelector('#movie_player button.ytp-subtitles-button') || 
                document.querySelector('button.ytp-subtitles-button') ||
                document.querySelector(sT) ||
                document.querySelector(iT);
                
    if (!btn) {
      console.warn("[TubeMind Injected] Subtitle button not found in DOM.");
      return Promise.resolve("");
    }

    return new Promise((resolve) => {
      let resolved = false;
      
      function done(token) {
        if (resolved) return;
        resolved = true;
        if (token) {
          window.TubeMindAI_PoTokens[videoId] = token;
        }
        resolve(token || "");
      }
      
      const clickHandler = async () => {
        try {
          performance.clearResourceTimings();
          // Polling leve de recursos por até 1 segundo (20 passos de 50ms)
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 50));
            const entries = performance.getEntriesByType("resource");
            const timedtextEntry = entries.filter(e => e.name && e.name.includes("/api/timedtext")).pop();
            if (timedtextEntry) {
              try {
                const url = new URL(timedtextEntry.name);
                const pot = url.searchParams.get("pot");
                if (pot) {
                  done(pot);
                  break;
                }
              } catch (err) {}
            }
          }
        } catch (e) {
          console.error("[TubeMind Injected] Error in clickHandler:", e);
        }
        done("");
      };
      
      btn.addEventListener('click', clickHandler, { once: true });
      
      // Simula o clique duplo rápido para ativar e desativar legendas
      btn.click();
      btn.click();
      
      // Timeout de segurança após 1.2 segundos
      setTimeout(() => {
        done("");
      }, 1200);
    });
  }

  document.addEventListener('TubeMind_RequestPlayerResponse', (e) => {
    try {
      const targetVideoId = e.detail?.targetVideoId;
      if (!targetVideoId) return;

      let attempts = 0;
      const maxAttempts = 50; // Tenta por até 5 segundos

      function checkResponse() {
        try {
          let response = null;
          
          // 1. Tenta obter do player do YouTube (mais confiável e atualizado em SPAs)
          const player = document.getElementById('movie_player');
          if (player && typeof player.getPlayerResponse === 'function') {
            const pResp = player.getPlayerResponse();
            if (pResp?.videoDetails?.videoId === targetVideoId) {
              if (pResp.captions || attempts >= 40) {
                response = pResp;
              }
            }
          }
          
          // 2. Fallback para a variável global do window
          if (!response && window.ytInitialPlayerResponse) {
            const globalResp = window.ytInitialPlayerResponse;
            if (globalResp?.videoDetails?.videoId === targetVideoId) {
              if (globalResp.captions || attempts >= 40) {
                response = globalResp;
              }
            }
          }
          
          if (response) {
            if (response.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
              const tracks = response.captions.playerCaptionsTracklistRenderer.captionTracks;
              if (tracks && tracks.length > 0) {
                let selectedTrack = tracks.find(t => t.languageCode && t.languageCode.startsWith('pt')) || 
                                     tracks.find(t => t.languageCode && t.languageCode.startsWith('en')) || 
                                     tracks[0];
                if (selectedTrack && selectedTrack.baseUrl) {
                  let baseUrl = selectedTrack.baseUrl.replace(/&amp;/g, '&');
                  
                  // Executa o bypass de PoToken
                  getPoToken(targetVideoId).then(pot => {
                    let finalUrl = baseUrl;
                    if (pot) {
                      finalUrl += `&pot=${pot}&c=WEB`;
                    }

                    let jsonUrl = finalUrl;
                    if (!jsonUrl.includes('fmt=')) {
                      jsonUrl += jsonUrl.includes('?') ? '&fmt=json3' : '?fmt=json3';
                    }

                    fetch(jsonUrl)
                      .then(res => {
                        if (!res.ok) throw new Error();
                        return res.text();
                      })
                      .catch(() => {
                        return fetch(finalUrl)
                          .then(res => {
                            if (!res.ok) throw new Error();
                            return res.text();
                          })
                          .catch(() => "");
                      })
                      .then(text => {
                        document.dispatchEvent(new CustomEvent('TubeMind_InjectedPlayerResponse', {
                          detail: { targetVideoId, response, transcriptText: text }
                        }));
                      });
                  });
                  return true;
                }
              }
            }

            // Se o player response não tiver legendas configuradas
            document.dispatchEvent(new CustomEvent('TubeMind_InjectedPlayerResponse', {
              detail: { targetVideoId, response, transcriptText: "" }
            }));
            return true;
          }
        } catch (err) {
          console.error("Error in TubeMind injected checkResponse:", err);
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkResponse, 100);
        } else {
          // Se falhar após o tempo limite, despacha o que estiver na variável global ou null
          document.dispatchEvent(new CustomEvent('TubeMind_InjectedPlayerResponse', {
            detail: { targetVideoId, response: window.ytInitialPlayerResponse || null, transcriptText: "" }
          }));
        }
        return false;
      }

      checkResponse();
    } catch (err) {
      console.error("Error in TubeMind request listener:", err);
    }
  });
})();
