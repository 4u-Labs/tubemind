// TubeMind AI - Options and Onboarding Control Logic

document.addEventListener('DOMContentLoaded', () => {
  // --- Year Helper ---
  document.getElementById('current-year').textContent = new Date().getFullYear();

  // --- EASTER EGG LOGO (5 CLIQUES PARA O DEV BACKDOOR) ---
  const logoLink = document.getElementById('logo-link');
  if (logoLink) {
    logoLink.addEventListener('click', function(e) {
      e.preventDefault();
      const now = Date.now();
      let clicks = parseInt(localStorage.getItem('logo_clicks') || '0');
      let lastClick = parseInt(localStorage.getItem('logo_last_click') || '0');

      if (now - lastClick < 2000) {
        clicks++;
      } else {
        clicks = 1;
      }

      localStorage.setItem('logo_clicks', clicks);
      localStorage.setItem('logo_last_click', now);

      if (clicks >= 5) {
        localStorage.removeItem('logo_clicks');
        localStorage.removeItem('logo_last_click');
        
        // Revela a seção da API Key privada!
        const apiKeySection = document.querySelector('.advanced-api-key');
        if (apiKeySection) {
          if (apiKeySection.style.display === 'none' || apiKeySection.style.display === '') {
            apiKeySection.style.display = 'block';
            alert("🔧 [TubeMind AI] Modo Desenvolvedor Ativado! Seção de API Key privada agora visível.");
          } else {
            apiKeySection.style.display = 'none';
            alert("🔧 [TubeMind AI] Modo Desenvolvedor Desativado.");
          }
        }
      }
    });
  }

  // --- Element Selectors ---
  const form = document.getElementById('settings-form');
  const selectLang = document.getElementById('select-lang');
  const selectTheme = document.getElementById('select-theme');
  const selectFontSize = document.getElementById('select-fontsize');
  const chkAutoOpen = document.getElementById('chk-autoopen');
  const txtApiKey = document.getElementById('txt-apikey');
  const saveStatus = document.getElementById('save-status');

  // --- Elementos de Autenticação (Keep AI) ---
  const loggedOutContainer = document.getElementById('auth-logged-out');
  const loggedInContainer = document.getElementById('auth-logged-in');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const authEmailInput = document.getElementById('auth-email');
  const authPasswordInput = document.getElementById('auth-password');
  const btnLogin = document.getElementById('btn-login');
  const btnRegister = document.getElementById('btn-register');
  const authStatusMsg = document.getElementById('auth-status-msg');
  const userEmailDisplay = document.getElementById('user-email-display');
  const userCreditsDisplay = document.getElementById('user-credits-display');
  const btnSyncCredits = document.getElementById('btn-sync-credits');
  const btnLogout = document.getElementById('btn-logout');

  // --- Localization Dictionary ---
  const dict = {
    pt: {
      welcomeTitle: "Bem-vindo ao Futuro do YouTube",
      welcomeDesc: "O TubeMind AI foi instalado com sucesso. Agora, sempre que você assistir a qualquer vídeo no YouTube, uma barra lateral inteligente será integrada automaticamente no topo dos recomendados, oferecendo resumos, análises aprofundadas e uma transcrição indexada com saltos de tempo instantâneos.",
      slide1Title: "Integração Nativa",
      slide1Desc: "A barra fica fixa acima das recomendações. O layout do YouTube é preservado e não obstrui o player principal.",
      slide2Title: "Timestamps Interativos",
      slide2Desc: "Navegue pelas falas do vídeo clicando diretamente nos carimbos de tempo na aba de Transcrição.",
      slide3Title: "Design Premium",
      slide3Desc: "Visual minimalista e discreto que se camufla perfeitamente na página do YouTube com suporte total ao Modo Escuro.",
      titleSettings: "Configurações Gerais",
      lblLang: "Idioma da Interface",
      lblTheme: "Tema Visual",
      lblFontsize: "Tamanho da Fonte (Dropdown)",
      lblAutoopen: "Abrir barra automaticamente ao carregar vídeos",
      lblApikey: "API Key Externa (Opcional Gemini/OpenAI)",
      infoApikey: "Deixe em branco para usar a conexão oficial do ecossistema.",
      btnSave: "Salvar Preferências",
      statusSaved: "Preferências salvas com sucesso!",
      statusPremium: "Membro do Ecossistema 4U",
      optFontSmall: "Pequeno (13px)",
      optFontMedium: "Médio (14px)",
      optFontLarge: "Grande (16px)"
    },
    en: {
      welcomeTitle: "Welcome to the Future of YouTube",
      welcomeDesc: "TubeMind AI has been successfully installed. Now, whenever you watch any YouTube video, a smart sidebar will be automatically integrated right next to the video player, delivering quick summaries, in-depth analyses, and an indexed transcript with instant jumps.",
      slide1Title: "Native Integration",
      slide1Desc: "The sidebar stays fixed above recommendations. YouTube's layout is preserved and does not obstruct the main player.",
      slide2Title: "Interactive Timestamps",
      slide2Desc: "Navigate through video transcript lines by clicking directly on the timestamps in the Transcript tab.",
      slide3Title: "Premium Design",
      slide3Desc: "Sleek, minimalist design that blends perfectly into YouTube's dark mode.",
      titleSettings: "General Settings",
      lblLang: "Interface Language",
      lblTheme: "Visual Theme",
      lblFontsize: "Font Size (Dropdown)",
      lblAutoopen: "Open sidebar automatically when loading videos",
      lblApikey: "External API Key (Optional Gemini/OpenAI)",
      infoApikey: "Leave blank to use the official ecosystem gateway connection.",
      btnSave: "Save Preferences",
      statusSaved: "Preferences saved successfully!",
      statusPremium: "Member of the 4U Ecosystem",
      optFontSmall: "Small (13px)",
      optFontMedium: "Medium (14px)",
      optFontLarge: "Large (16px)"
    }
  };

  // --- Dynamic Translation Updater ---
  function updatePageLanguage(lang) {
    const texts = dict[lang] || dict.pt;
    
    document.getElementById('title-welcome').textContent = texts.welcomeTitle;
    document.getElementById('desc-welcome').textContent = texts.welcomeDesc;
    
    document.getElementById('slide1-title').textContent = texts.slide1Title;
    document.getElementById('slide1-desc').textContent = texts.slide1Desc;
    document.getElementById('slide2-title').textContent = texts.slide2Title;
    document.getElementById('slide2-desc').textContent = texts.slide2Desc;
    document.getElementById('slide3-title').textContent = texts.slide3Title;
    document.getElementById('slide3-desc').textContent = texts.slide3Desc;
    
    document.getElementById('title-settings').textContent = texts.titleSettings;
    document.getElementById('lbl-lang').textContent = texts.lblLang;
    document.getElementById('lbl-theme').textContent = texts.lblTheme;
    document.getElementById('lbl-fontsize').textContent = texts.lblFontsize;
    document.getElementById('lbl-autoopen').textContent = texts.lblAutoopen;
    document.getElementById('lbl-apikey').textContent = texts.lblApikey;
    document.getElementById('info-apikey').textContent = texts.infoApikey;
    document.getElementById('btn-save').textContent = texts.btnSave;
    document.getElementById('txt-premium').textContent = texts.statusPremium;
    
    // Select options localization
    const fontSizeSelect = document.getElementById('select-fontsize');
    fontSizeSelect.options[0].text = texts.optFontSmall;
    fontSizeSelect.options[1].text = texts.optFontMedium;
    fontSizeSelect.options[2].text = texts.optFontLarge;
  }

  // --- Load Saved Settings ---
  function loadSettings() {
    chrome.storage.local.get({
      language: 'pt',
      theme: 'cyberpunk',
      fontSize: 'medium',
      autoOpen: true,
      apiKey: '',
      userToken: '',
      userEmail: '',
      userCredits: 0
    }, (items) => {
      selectLang.value = items.language;
      selectTheme.value = items.theme;
      selectFontSize.value = items.fontSize;
      chkAutoOpen.checked = items.autoOpen;
      txtApiKey.value = items.apiKey;

      updatePageLanguage(items.language);

      // Atualiza interface do usuário baseada em login
      if (items.userToken) {
        updateAuthUI(true, items.userEmail, items.userCredits, items.userToken);
        // Tenta sincronizar os créditos no primeiro carregamento
        syncUserCredits(items.userToken);
      } else {
        updateAuthUI(false, '', 0, '');
      }
    });
  }

  // --- Save Settings ---
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const newSettings = {
      language: selectLang.value,
      theme: selectTheme.value,
      fontSize: selectFontSize.value,
      autoOpen: chkAutoOpen.checked,
      apiKey: txtApiKey.value
    };

    chrome.storage.local.set(newSettings, () => {
      updatePageLanguage(newSettings.language);

      // Exibe toast de sucesso
      saveStatus.textContent = dict[newSettings.language].statusSaved;
      saveStatus.classList.remove('hidden');
      
      setTimeout(() => {
        saveStatus.classList.add('hidden');
      }, 3000);
    });
  });

  // --- Monitor Dynamic Language Select Change ---
  selectLang.addEventListener('change', () => {
    updatePageLanguage(selectLang.value);
  });

  // --- LÓGICA DE CONTAS E CRÉDITOS (Keep AI Server Proxy) ---
  
  // Alternar abas do formulário
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    btnLogin.style.display = 'block';
    btnRegister.style.display = 'none';
    hideAuthMsg();
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    btnRegister.style.display = 'block';
    btnLogin.style.display = 'none';
    hideAuthMsg();
  });

  // Ações de Autenticação
  btnLogin.addEventListener('click', () => {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!email || !password) {
      showAuthMsg('Preencha todos os campos.', 'error');
      return;
    }

    showAuthMsg('Verificando credenciais...', 'loading');

    fetch('https://4u.ia.br/app/tubemind/api/auth.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password })
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Credenciais incorretas.'); });
      }
      return res.json();
    })
    .then(data => {
      chrome.storage.local.set({
        userToken: data.token,
        userEmail: data.email,
        userCredits: data.credits
      }, () => {
        updateAuthUI(true, data.email, data.credits, data.token);
        showAuthMsg('Logado com sucesso!', 'success');
      });
    })
    .catch(err => {
      showAuthMsg(err.message || 'Erro ao fazer login.', 'error');
    });
  });

  btnRegister.addEventListener('click', () => {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!email || password.length < 6) {
      showAuthMsg('Senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }

    showAuthMsg('Criando conta no 4uLabs...', 'loading');

    fetch('https://4u.ia.br/app/tubemind/api/auth.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', email, password })
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Falha ao registrar.'); });
      }
      return res.json();
    })
    .then(data => {
      chrome.storage.local.set({
        userToken: data.token,
        userEmail: data.email,
        userCredits: data.credits
      }, () => {
        updateAuthUI(true, data.email, data.credits, data.token);
        showAuthMsg('Conta criada com sucesso!', 'success');
      });
    })
    .catch(err => {
      showAuthMsg(err.message || 'Erro ao registrar conta.', 'error');
    });
  });

  btnSyncCredits.addEventListener('click', () => {
    chrome.storage.local.get('userToken', (items) => {
      if (items.userToken) {
        showAuthMsg('Sincronizando créditos...', 'loading');
        syncUserCredits(items.userToken, true);
      }
    });
  });

  btnLogout.addEventListener('click', () => {
    chrome.storage.local.set({
      userToken: '',
      userEmail: '',
      userCredits: 0
    }, () => {
      updateAuthUI(false, '', 0, '');
      hideAuthMsg();
      closeCheckout(); // Fecha painel de Pix se deslogar
    });
  });

  // --- LÓGICA DE RECARGA PIX IN-APP (Checkout Seamless) ---
  const btnShowCheckout = document.getElementById('btn-show-checkout');
  const checkoutPanel = document.getElementById('checkout-panel');
  const packageCards = document.querySelectorAll('.package-card');
  const btnGeneratePix = document.getElementById('btn-generate-pix');
  const pixResultContainer = document.getElementById('pix-result-container');
  const pixQrImg = document.getElementById('pix-qr-img');
  const pixCopyPasteCode = document.getElementById('pix-copy-paste-code');
  const btnCopyPix = document.getElementById('btn-copy-pix');
  const btnVerifyPix = document.getElementById('btn-verify-pix');
  
  let selectedPackageIndex = null;
  let pixPollInterval = null;
  let activePaymentId = null;

  if (btnShowCheckout && checkoutPanel) {
    btnShowCheckout.addEventListener('click', () => {
      if (checkoutPanel.style.display === 'none' || checkoutPanel.style.display === '') {
        checkoutPanel.style.display = 'block';
        btnShowCheckout.textContent = '❌ Cancelar Recarga';
        // Auto-selecionar pacote bronze por padrão
        selectPackage(0);
      } else {
        closeCheckout();
      }
    });
  }

  function selectPackage(index) {
    selectedPackageIndex = index;
    packageCards.forEach((card, idx) => {
      if (idx === index) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  packageCards.forEach((card) => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-index'));
      selectPackage(idx);
    });
  });

  function closeCheckout() {
    if (checkoutPanel) checkoutPanel.style.display = 'none';
    if (btnShowCheckout) btnShowCheckout.textContent = '🛒 Recarregar Créditos (PIX)';
    if (pixResultContainer) pixResultContainer.style.display = 'none';
    if (pixPollInterval) {
      clearInterval(pixPollInterval);
      pixPollInterval = null;
    }
  }

  // Copiar código Pix Copia e Cola
  if (btnCopyPix && pixCopyPasteCode) {
    btnCopyPix.addEventListener('click', () => {
      navigator.clipboard.writeText(pixCopyPasteCode.value).then(() => {
        const originalText = btnCopyPix.textContent;
        btnCopyPix.textContent = 'Copiado!';
        setTimeout(() => {
          btnCopyPix.textContent = originalText;
        }, 2000);
      });
    });
  }

  // Gerar cobrança PIX no Mercado Pago via backend central do TubeMind
  if (btnGeneratePix) {
    btnGeneratePix.addEventListener('click', () => {
      if (selectedPackageIndex === null) {
        alert('Por favor, selecione um pacote de créditos.');
        return;
      }

      chrome.storage.local.get(['userToken'], (items) => {
        const token = items.userToken;
        if (!token) {
          alert('Por favor, conecte-se à sua conta antes de recarregar.');
          return;
        }

        btnGeneratePix.textContent = '⚡ Gerando cobrança Pix...';
        btnGeneratePix.disabled = true;

        fetch('https://4u.ia.br/app/tubemind/api/mp_create.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            token: token,
            package_index: selectedPackageIndex
          })
        })
        .then(res => {
          if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || 'Erro ao gerar Pix.'); });
          }
          return res.json();
        })
        .then(data => {
          btnGeneratePix.textContent = '⚡ Gerar QR Code Pix';
          btnGeneratePix.disabled = false;
          
          if (data.success) {
            activePaymentId = data.payment_id;
            pixQrImg.src = `data:image/jpeg;base64,${data.qr_code_base64}`;
            pixCopyPasteCode.value = data.qr_code;
            
            pixResultContainer.style.display = 'block';
            pixResultContainer.scrollIntoView({ behavior: 'smooth' });

            // Iniciar Polling de Verificação automática
            startPixPolling(data.payment_id, token);
          }
        })
        .catch(err => {
          btnGeneratePix.textContent = '⚡ Gerar QR Code Pix';
          btnGeneratePix.disabled = false;
          alert(err.message || 'Erro de conexão ao gerar o Pix.');
        });
      });
    });
  }

  // Polling para verificar pagamento automaticamente a cada 4 segundos
  function startPixPolling(paymentId, token) {
    if (pixPollInterval) clearInterval(pixPollInterval);
    pixPollInterval = setInterval(() => {
      verifyPixPayment(paymentId, token);
    }, 4000);
  }

  function verifyPixPayment(paymentId, token, showManualAlert = false) {
    if (!paymentId) return;

    fetch(`https://4u.ia.br/app/tubemind/api/check_payment.php?payment_id=${paymentId}`, {
      method: 'GET'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.status === 'approved') {
        if (pixPollInterval) {
          clearInterval(pixPollInterval);
          pixPollInterval = null;
        }

        // Sucesso de Pagamento! Exibir animação e atualizar saldo
        showPaymentSuccessAnimation();
        
        // Sincroniza créditos com o storage local e UI
        syncUserCredits(token);
      } else if (showManualAlert) {
        alert('Seu pagamento Pix ainda está pendente ou sendo processado.');
      }
    })
    .catch(() => {
      if (showManualAlert) {
        alert('Erro de conexão ao verificar pagamento.');
      }
    });
  }

  // Verificar pagamento manualmente no clique do botão
  if (btnVerifyPix) {
    btnVerifyPix.addEventListener('click', () => {
      chrome.storage.local.get(['userToken'], (items) => {
        if (activePaymentId && items.userToken) {
          btnVerifyPix.textContent = 'Verificando...';
          verifyPixPayment(activePaymentId, items.userToken, true);
          setTimeout(() => {
            btnVerifyPix.textContent = '✓ Verificar Pagamento';
          }, 1500);
        }
      });
    });
  }

  function showPaymentSuccessAnimation() {
    pixResultContainer.innerHTML = `
      <div class="checkout-success-anim" style="padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <span style="font-size: 3rem; filter: drop-shadow(0 0 10px #10b981);">🎉</span>
        <h4 style="color: #10b981; font-weight: 700; margin: 0; font-size: 1.1rem;">Recarga Concluída!</h4>
        <p style="font-size: 0.82rem; color: var(--text-dim); margin: 0; line-height: 1.4;">Seus créditos foram creditados com sucesso na sua carteira 4uLabs.</p>
      </div>
    `;

    setTimeout(() => {
      closeCheckout();
    }, 4500);
  }

  // Métodos Auxiliares
  function syncUserCredits(token, showSuccess = false) {
    fetch('https://4u.ia.br/app/tubemind/api/auth.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync', token })
    })
    .then(res => {
      if (!res.ok) throw new Error();
      return res.json();
    })
    .then(data => {
      chrome.storage.local.set({
        userCredits: data.credits
      }, () => {
        userCreditsDisplay.textContent = data.credits;
        if (showSuccess) {
          showAuthMsg('Créditos sincronizados com sucesso!', 'success');
        }
      });
    })
    .catch(() => {
      if (showSuccess) {
        showAuthMsg('Erro ao sincronizar saldo do servidor.', 'error');
      }
    });
  }

  function updateAuthUI(isLoggedIn, email, credits, token) {
    if (isLoggedIn) {
      loggedOutContainer.style.display = 'none';
      loggedInContainer.style.display = 'block';
      userEmailDisplay.textContent = email;
      userCreditsDisplay.textContent = credits;
    } else {
      loggedOutContainer.style.display = 'block';
      loggedInContainer.style.display = 'none';
      authEmailInput.value = '';
      authPasswordInput.value = '';
      userEmailDisplay.textContent = '---';
      userCreditsDisplay.textContent = '0';
    }
  }

  function showAuthMsg(text, type) {
    authStatusMsg.textContent = text;
    authStatusMsg.className = 'save-status';
    
    if (type === 'error') {
      authStatusMsg.style.cssText = 'color: #ef4444; background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.2); display: block;';
    } else if (type === 'success') {
      authStatusMsg.style.cssText = 'color: #10b981; background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.2); display: block;';
    } else {
      // Loading
      authStatusMsg.style.cssText = 'color: var(--secondary); background: rgba(6, 182, 212, 0.08); border-color: rgba(6, 182, 212, 0.2); display: block;';
    }
  }

  function hideAuthMsg() {
    authStatusMsg.className = 'save-status hidden';
    authStatusMsg.style.display = 'none';
  }

  // --- Onboarding Slider Animations ---
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  let currentSlide = 0;
  let slideInterval;

  function showSlide(index) {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    currentSlide = index;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }

  function nextSlide() {
    let next = currentSlide + 1;
    if (next >= slides.length) next = 0;
    showSlide(next);
  }

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      clearInterval(slideInterval);
      showSlide(idx);
      startSlideShow(); 
    });
  });

  function startSlideShow() {
    slideInterval = setInterval(nextSlide, 5000);
  }

  // Initialize
  loadSettings();
  startSlideShow();
});
