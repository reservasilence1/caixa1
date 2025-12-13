document.addEventListener("DOMContentLoaded", function () {
  // =========================
  // Helpers (UI / Params)
  // =========================
  function showNotification(message) {
    const notification = document.getElementById("notification");
    const notificationMessage = document.getElementById("notification-message");
    if (!notification || !notificationMessage) {
      // fallback silencioso
      console.warn("Notification UI não encontrada:", message);
      return;
    }

    notification.classList.remove("show", "hide");
    notificationMessage.textContent = message;
    notification.classList.add("show");

    setTimeout(() => {
      notification.classList.add("hide");
      setTimeout(() => notification.classList.remove("show", "hide"), 300);
    }, 4000);
  }

  function getUrlParamsObj() {
    const params = {};
    const urlParams = new URLSearchParams(window.location.search);
    for (const [k, v] of urlParams.entries()) params[k] = v;
    return params;
  }

  function buildUrlWithParams(baseUrl, paramsObj) {
    const url = new URL(baseUrl, window.location.href);
    Object.keys(paramsObj || {}).forEach((k) => url.searchParams.append(k, paramsObj[k]));
    return url.toString();
  }

  function scrollIntoViewSafe(el) {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {}
  }

  // =========================
  // Elementos principais
  // =========================
  const mainPage = document.getElementById("mainPage");
  const cpfPage = document.getElementById("cpfPage");
  const btnAtivar = document.getElementById("btnAtivar");
  const btnVoltar = document.getElementById("btnVoltar");
  const btnAnalisar = document.getElementById("btnAnalisar");
  const btnSimular = document.getElementById("btnSimular");

  // Form
  const cpfInputPage = document.getElementById("cpfInputPage");
  const termsCheck = document.getElementById("termsCheck");

  // Resultado
  const consultaResultado = document.getElementById("consultaResultado");
  const loadingInfo = document.getElementById("loadingInfo");
  const userInfo = document.getElementById("userInfo");
  const errorInfo = document.getElementById("errorInfo");
  const errorMessage = document.getElementById("errorMessage");
  const btnConfirmar = document.getElementById("btnConfirmar");
  const btnCorrigir = document.getElementById("btnCorrigir");
  const btnTentarNovamente = document.getElementById("btnTentarNovamente");

  // Campos
  const nomeUsuario = document.getElementById("nomeUsuario");
  const cpfUsuario = document.getElementById("cpfUsuario");
  const sexoUsuario = document.getElementById("sexoUsuario");
  const nomeMae = document.getElementById("nomeMae");
  const dataNascimento = document.getElementById("dataNascimento"); // opcional

  // Segurança
  if (!mainPage || !cpfPage) {
    console.error("mainPage/cpfPage não encontrados. Verifique IDs no HTML.");
    return;
  }

  // =========================
  // CPF mask / validate
  // =========================
  function formatCPFValue(raw) {
    let v = String(raw || "").replace(/\D/g, "").slice(0, 11);
    if (v.length > 9) return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    if (v.length > 6) return v.replace(/^(\d{3})(\d{3})(\d{1,3})$/, "$1.$2.$3");
    if (v.length > 3) return v.replace(/^(\d{3})(\d{1,3})$/, "$1.$2");
    return v;
  }

  function validateCPF(cpf) {
    const c = String(cpf || "").replace(/\D/g, "");
    return c.length === 11;
  }

  function formatDate(dateString) {
    if (!dateString) return "Não informado";
    if (String(dateString).includes("/")) return dateString; // já formatada
    if (String(dateString).length === 8) return String(dateString).replace(/^(\d{4})(\d{2})(\d{2})$/, "$3/$2/$1");
    return String(dateString);
  }

  if (cpfInputPage) {
    cpfInputPage.addEventListener("input", function () {
      const next = formatCPFValue(this.value);
      this.value = next;

      const cpfRaw = next.replace(/\D/g, "");
      if (cpfRaw.length === 11) {
        // compatibilidade com seu fluxo
        localStorage.setItem("cpf", cpfRaw);
        localStorage.setItem("cpfUsuario", cpfRaw);
      }
    });
  }

  // =========================
  // Estado (UI)
  // =========================
  function resetConsultaUI() {
    if (consultaResultado) consultaResultado.classList.add("hidden");
    if (loadingInfo) loadingInfo.classList.remove("hidden");
    if (userInfo) userInfo.classList.add("hidden");
    if (errorInfo) errorInfo.classList.add("hidden");
    if (errorMessage) errorMessage.textContent = "Verifique seu CPF e tente novamente.";

    // reabilita botão
    if (btnAnalisar) {
      btnAnalisar.disabled = false;
      btnAnalisar.textContent = "Solicitar análise";
    }
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = "Sim, continuar";
    }
  }

  function setAnalisarLoading(isLoading) {
    if (!btnAnalisar) return;
    if (isLoading) {
      btnAnalisar.disabled = true;
      btnAnalisar.innerHTML =
        '<div class="flex items-center justify-center gap-2">' +
        '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>' +
        "Consultando..." +
        "</div>";
    } else {
      btnAnalisar.disabled = false;
      btnAnalisar.textContent = "Solicitar análise";
    }
  }

  function showResultLoading() {
    if (!consultaResultado || !loadingInfo || !userInfo || !errorInfo) return;
    consultaResultado.classList.remove("hidden");
    loadingInfo.classList.remove("hidden");
    userInfo.classList.add("hidden");
    errorInfo.classList.add("hidden");
    scrollIntoViewSafe(consultaResultado);
  }

  function showUserDataUI() {
    if (!loadingInfo || !userInfo || !errorInfo) return;
    loadingInfo.classList.add("hidden");
    errorInfo.classList.add("hidden");
    userInfo.classList.remove("hidden");
    setTimeout(() => scrollIntoViewSafe(userInfo), 100);
  }

  function showErrorUI(msg) {
    if (!loadingInfo || !userInfo || !errorInfo) return;
    loadingInfo.classList.add("hidden");
    userInfo.classList.add("hidden");
    if (errorMessage) errorMessage.textContent = msg || "Ocorreu um erro ao consultar seus dados.";
    errorInfo.classList.remove("hidden");
    scrollIntoViewSafe(errorInfo);
  }

  // =========================
  // Navegação de páginas
  // =========================
  function showCPFPage() {
    resetConsultaUI();

    mainPage.classList.add("fade-out");
    setTimeout(() => {
      mainPage.classList.add("hidden");
      cpfPage.classList.remove("hidden");

      // força reflow
      void cpfPage.offsetWidth;

      cpfPage.classList.add("fade-in");
      cpfPage.classList.remove("opacity-0");

      // auto preencher cpf salvo
      const cpfSalvo = localStorage.getItem("cpf");
      if (cpfSalvo && cpfInputPage) {
        cpfInputPage.value = formatCPFValue(cpfSalvo);
      }

      if (cpfInputPage) cpfInputPage.focus();
    }, 400);
  }

  function showMainPage() {
    cpfPage.classList.remove("fade-in");
    cpfPage.classList.add("opacity-0");

    setTimeout(() => {
      cpfPage.classList.add("hidden");
      mainPage.classList.remove("hidden");

      // força reflow
      void mainPage.offsetWidth;

      mainPage.classList.remove("fade-out");
      // (não adiciono fade-in no mainPage pq ele já aparece suave pelo CSS base)
    }, 400);
  }

  // =========================
  // API — escolha qual usar
  // =========================
  const API_MODE = "BK"; 
  // "BK"  -> usa https://bk.elaidisparos.tech/...
  // "CPF_BRASIL" -> usa a mesma lógica do HTML (jQuery) - aqui deixo hook se quiser migrar tudo pra um lugar só

  async function consultarCPF_BK(cpfRaw) {
    const cpfLimpo = String(cpfRaw || "").replace(/\D/g, "");
    const url = `https://bk.elaidisparos.tech/consultar-filtrada/cpf?cpf=${cpfLimpo}&token=574a7ff49027efebaa19dc18b17e4ead1dadf7eac42d65cb8acfa969a897e976`;

    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`Erro na consulta: ${res.status}`);
    const raw = await res.json();

    // normaliza
    if (raw && (raw.cpf || raw.nome)) {
      return {
        CPF: raw.cpf || cpfLimpo,
        NOME: raw.nome || "",
        NOME_MAE: raw.mae || "",
        NASC: raw.nascimento || "",
        SEXO: raw.sexo || "",
      };
    }
    return null;
  }

  function consultarCPF_CPFBRASIL_jq(cpfRaw) {
    // precisa de jQuery carregado
    return new Promise((resolve, reject) => {
      const cpfLimpo = String(cpfRaw || "").replace(/\D/g, "");
      if (!window.$ || !$.ajax) return reject(new Error("jQuery não carregou para consulta CPF-Brasil."));

      $.ajax({
        url: `https://corsproxy.io/?https://api.cpf-brasil.org/cpf/${cpfLimpo}`,
        method: "GET",
        dataType: "json",
        headers: { "X-API-Key": "<API_KEY>" }, // troque se for usar esse modo aqui
        success: function (response) {
          const data = response && response.data ? response.data : null;
          if (!data || !data.NOME) return resolve(null);
          resolve({
            CPF: cpfLimpo,
            NOME: data.NOME || "",
            NOME_MAE: data.NOME_MAE || "",
            NASC: data.NASC || "",
            SEXO: data.SEXO || "",
          });
        },
        error: function (xhr, status, error) {
          reject(new Error(`Erro na API: ${xhr?.status || status || error}`));
        },
      });
    });
  }

  async function consultarCPF(cpfRaw) {
    if (API_MODE === "CPF_BRASIL") {
      return await consultarCPF_CPFBRASIL_jq(cpfRaw);
    }
    return await consultarCPF_BK(cpfRaw);
  }

  // =========================
  // Processar análise
  // =========================
  async function processForm() {
    const cpfRaw = (cpfInputPage?.value || "").replace(/\D/g, "");

    if (!validateCPF(cpfRaw)) {
      showNotification("Por favor, digite um CPF válido (11 dígitos).");
      return;
    }
    if (termsCheck && !termsCheck.checked) {
      showNotification("Você precisa aceitar os Termos para continuar.");
      return;
    }

    // salvar CPF (compat)
    localStorage.setItem("cpf", cpfRaw);
    localStorage.setItem("cpfUsuario", cpfRaw);

    // UI
    showResultLoading();
    setAnalisarLoading(true);

    try {
      const data = await consultarCPF(cpfRaw);
      setAnalisarLoading(false);

      if (!data) {
        showErrorUI("Não foi possível obter os dados para este CPF.");
        return;
      }

      // preencher UI
      if (nomeUsuario) nomeUsuario.textContent = data.NOME || "Não informado";
      if (cpfUsuario) {
        cpfUsuario.textContent = (data.CPF || cpfRaw).replace(
          /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
          "$1.$2.$3-$4"
        );
      }
      if (sexoUsuario) sexoUsuario.textContent = data.SEXO || "Não informado";
      if (nomeMae) nomeMae.textContent = data.NOME_MAE || "Não informado";
      if (dataNascimento) dataNascimento.textContent = formatDate(data.NASC) || "Não informado";

      // salvar no padrão do seu projeto (API nova)
      const dadosUsuarioObj = {
        NOME: data.NOME || "",
        MAE: data.NOME_MAE || "",
        SEXO: data.SEXO || "",
        NASCIMENTO: data.NASC || "",
      };
      localStorage.setItem("dadosUsuario", JSON.stringify(dadosUsuarioObj));

      const userData = {
        nome: data.NOME || "",
        cpf: cpfRaw,
      };
      localStorage.setItem("userData", JSON.stringify(userData));

      showUserDataUI();
    } catch (err) {
      setAnalisarLoading(false);
      console.error("Erro na consulta:", err);
      showErrorUI(err?.message || "Ocorreu um erro ao consultar seus dados.");
    }
  }

  // =========================
  // Confirmar -> Redirect
  // =========================
  function confirmarEContinuar() {
    const params = getUrlParamsObj();

    // injeta name a partir de dadosUsuario salvo
    try {
      const dados = JSON.parse(localStorage.getItem("dadosUsuario") || "{}");
      if (dados && dados.NOME) params.name = dados.NOME;
    } catch (e) {}

    // spinner 2.5s
    if (btnConfirmar) {
      btnConfirmar.disabled = true;
      btnConfirmar.innerHTML =
        '<div class="flex items-center justify-center gap-2">' +
        '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>' +
        "Carregando..." +
        "</div>";
    }

    setTimeout(() => {
      const target = buildUrlWithParams("../3/index.html", params);
      window.location.href = target;
    }, 2500);
  }

  // =========================
  // Corrigir / Tentar novamente
  // =========================
  function corrigirDados() {
    resetConsultaUI();
    if (cpfInputPage) cpfInputPage.focus();
  }

  function tentarNovamente() {
    resetConsultaUI();
    if (cpfInputPage) cpfInputPage.focus();
  }

  // =========================
  // CPF via URL (?cpf=)
  // =========================
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("cpf")) {
    const cpfFromUrl = String(urlParams.get("cpf") || "").replace(/\D/g, "");
    if (validateCPF(cpfFromUrl)) {
      localStorage.setItem("cpf", cpfFromUrl);
      localStorage.setItem("cpfUsuario", cpfFromUrl);
    }
  }

  // =========================
  // Listeners
  // =========================
  if (btnAtivar) btnAtivar.addEventListener("click", showCPFPage);
  if (btnSimular) btnSimular.addEventListener("click", showCPFPage);
  if (btnVoltar) btnVoltar.addEventListener("click", showMainPage);

  if (btnAnalisar) {
    btnAnalisar.addEventListener("click", function () {
      processForm();
    });
  }

  if (btnConfirmar) btnConfirmar.addEventListener("click", confirmarEContinuar);
  if (btnCorrigir) btnCorrigir.addEventListener("click", corrigirDados);
  if (btnTentarNovamente) btnTentarNovamente.addEventListener("click", tentarNovamente);

  // ======================
  // Carrossel (igual antes)
  // ======================
  const carousel = document.getElementById("carousel");
  const slides = document.querySelectorAll(".carousel-item");
  const indicators = document.querySelectorAll(".carousel-indicator");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  const stepNumbers = document.querySelectorAll(".step-number");
  const stepLines = document.querySelectorAll(".step-line");

  let currentSlide = 0;
  let autoSlideInterval;

  function showSlide(index) {
    if (!slides.length) return;

    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;

    slides.forEach((slide) => slide.classList.remove("active"));
    slides[index].classList.add("active");

    indicators.forEach((indicator, i) => {
      if (i === index) indicator.classList.add("active");
      else indicator.classList.remove("active");
    });

    updateSteps(index);
    currentSlide = index;
  }

  function updateSteps(index) {
    stepNumbers.forEach((step, i) => {
      step.classList.remove("active", "completed");
      if (i === index) step.classList.add("active");
      else if (i < index) step.classList.add("completed");
    });

    stepLines.forEach((line, i) => {
      if (i < index) line.classList.add("active");
      else line.classList.remove("active");
    });
  }

  function nextSlide() {
    showSlide(currentSlide + 1);
    resetAutoSlide();
  }

  function prevSlide() {
    showSlide(currentSlide - 1);
    resetAutoSlide();
  }

  function startAutoSlide() {
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(() => showSlide(currentSlide + 1), 5000);
  }

  function resetAutoSlide() {
    startAutoSlide();
  }

  if (prevBtn && nextBtn && carousel && slides.length) {
    nextBtn.addEventListener("click", nextSlide);
    prevBtn.addEventListener("click", prevSlide);

    indicators.forEach((indicator, index) => {
      indicator.addEventListener("click", () => {
        showSlide(index);
        resetAutoSlide();
      });
    });

    stepNumbers.forEach((step) => {
      step.addEventListener("click", () => {
        const stepIndex = parseInt(step.getAttribute("data-step"), 10);
        if (!Number.isNaN(stepIndex)) {
          showSlide(stepIndex);
          resetAutoSlide();
        }
      });
    });

    let touchStartX = 0;
    carousel.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carousel.addEventListener("touchend", (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;
      if (diff > 50) prevSlide();
      else if (diff < -50) nextSlide();
    }, { passive: true });

    carousel.addEventListener("mouseenter", () => clearInterval(autoSlideInterval));
    carousel.addEventListener("mouseleave", () => startAutoSlide());

    showSlide(0);
    startAutoSlide();
  }
});
