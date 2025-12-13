document.addEventListener("DOMContentLoaded", function () {
  // Elementos principais
  const mainPage = document.getElementById("mainPage");
  const cpfPage = document.getElementById("cpfPage");
  const btnAtivar = document.getElementById("btnAtivar");
  const btnVoltar = document.getElementById("btnVoltar");
  const btnAnalisar = document.getElementById("btnAnalisar");
  const btnSimular = document.getElementById("btnSimular");

  // Elementos de formulário
  const cpfInputPage = document.getElementById("cpfInputPage");
  const termsCheck = document.getElementById("termsCheck");

  // Elementos de resultado da consulta
  const consultaResultado = document.getElementById("consultaResultado");
  const loadingInfo = document.getElementById("loadingInfo");
  const userInfo = document.getElementById("userInfo");
  const errorInfo = document.getElementById("errorInfo");
  const errorMessage = document.getElementById("errorMessage");
  const btnConfirmar = document.getElementById("btnConfirmar");
  const btnCorrigir = document.getElementById("btnCorrigir");
  const btnTentarNovamente = document.getElementById("btnTentarNovamente");

  // Campos de informação do usuário
  const nomeUsuario = document.getElementById("nomeUsuario");
  const cpfUsuario = document.getElementById("cpfUsuario");
  const sexoUsuario = document.getElementById("sexoUsuario");
  const nomeMae = document.getElementById("nomeMae");
  const dataNascimento = document.getElementById("dataNascimento"); // opcional

  // Formatar CPF enquanto digita
  function formatCPF(input) {
    let value = input.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 9) {
      value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    } else if (value.length > 6) {
      value = value.replace(/^(\d{3})(\d{3})(\d{1,3})$/, "$1.$2.$3");
    } else if (value.length > 3) {
      value = value.replace(/^(\d{3})(\d{1,3})$/, "$1.$2");
    }

    input.value = value;
  }

  // Validar CPF
  function validateCPF(cpf) {
    cpf = (cpf || "").replace(/\D/g, "");
    return cpf.length === 11;
  }

  function formatDate(dateString) {
    if (!dateString) return "Não informado";
    if (String(dateString).includes("/")) return dateString;
    if (String(dateString).length === 8) {
      return String(dateString).replace(/^(\d{4})(\d{2})(\d{2})$/, "$3/$2/$1");
    }
    return String(dateString);
  }

  // ==========================
  // CONSULTA CPF (NOVA API CPF-BRASIL)
  // ==========================
  async function consultarCPF(cpf) {
    const cpfLimpo = (cpf || "").replace(/\D/g, "");

    // UI: mostrar área e loading
    consultaResultado.classList.remove("hidden");
    loadingInfo.classList.remove("hidden");
    userInfo.classList.add("hidden");
    errorInfo.classList.add("hidden");

    consultaResultado.scrollIntoView({ behavior: "smooth", block: "center" });

    try {
      // Endpoint real
      const targetUrl = `https://api.cpf-brasil.org/cpf/${cpfLimpo}`;
      // corsproxy: atenção que ele aceita "https://corsproxy.io/?<url>"
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

      const resp = await fetch(proxyUrl, {
        method: "GET",
        headers: {
          "X-API-Key": "3d8d3fe8466255df1d61e243a2cca1b0", // <-- TROQUE AQUI
        },
      });

      if (!resp.ok) {
        // espelha comportamento do seu script original
        if (resp.status === 404) throw new Error("CPF não encontrado na base de dados");
        if (resp.status === 401) throw new Error("Erro de autenticação (API Key inválida)");
        if (resp.status === 429) throw new Error("Muitas requisições. Aguarde um momento.");
        throw new Error(`Erro na consulta: ${resp.status}`);
      }

      const json = await resp.json();

      // A CPF-Brasil retorna em json.data
      const apiData = json && json.data ? json.data : null;

      // UI: esconder loading
      loadingInfo.classList.add("hidden");

      if (!apiData || (!apiData.NOME && !apiData.CPF)) {
        errorMessage.textContent = "Não foi possível obter os dados para este CPF.";
        errorInfo.classList.remove("hidden");
        errorInfo.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // Normalização (mantém seu fluxo atual)
      const data = {
        CPF: cpfLimpo,
        NOME: apiData.NOME || "",
        NOME_MAE: apiData.NOME_MAE || "",
        NASC: apiData.NASC || "",
        SEXO: apiData.SEXO || "",
      };

      // Preencher tela
      if (nomeUsuario) nomeUsuario.textContent = data.NOME || "Não informado";

      if (cpfUsuario) {
        cpfUsuario.textContent = data.CPF
          ? data.CPF.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
          : "Não informado";
      }

      if (sexoUsuario) sexoUsuario.textContent = data.SEXO || "Não informado";
      if (nomeMae) nomeMae.textContent = data.NOME_MAE || "Não informado";

      if (dataNascimento) {
        dataNascimento.textContent = formatDate(data.NASC) || "Não informado";
      }

      // ✅ O /chat valida `dadosUsuario.nome` e `dadosUsuario.cpf`
      const dadosUsuario = {
        nome: data.NOME || "",
        cpf: data.CPF || "",
        sexo: data.SEXO || "",
        nomeMae: data.NOME_MAE || "",
        dataNascimento: data.NASC || "",
      };

      localStorage.setItem("dadosUsuario", JSON.stringify(dadosUsuario));

      // (Opcional) manter também chaves auxiliares, se você usa em outros lugares:
      if (dadosUsuario.nome) localStorage.setItem("nomeUsuario", dadosUsuario.nome);
      if (dadosUsuario.cpf) localStorage.setItem("cpfUsuario", dadosUsuario.cpf);
      localStorage.setItem("cpf", cpfLimpo);

      // Mostrar bloco de confirmação
      userInfo.classList.remove("hidden");
      setTimeout(() => {
        userInfo.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (err) {
      loadingInfo.classList.add("hidden");
      errorMessage.textContent = (err && err.message) ? err.message : "Ocorreu um erro ao consultar seus dados.";
      errorInfo.classList.remove("hidden");
      console.error("Erro na consulta:", err);
      errorInfo.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // Verificar se existe CPF na URL e salvar no localStorage
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("cpf")) {
    const cpfFromUrl = (urlParams.get("cpf") || "").replace(/\D/g, "");
    if (validateCPF(cpfFromUrl)) {
      localStorage.setItem("cpf", cpfFromUrl);
      console.log("CPF da URL salvo no localStorage:", cpfFromUrl);
    }
  }

  function showCPFPage() {
    mainPage.classList.add("fade-out");
    setTimeout(() => {
      mainPage.classList.add("hidden");
      cpfPage.classList.remove("hidden");

      void cpfPage.offsetWidth;

      cpfPage.classList.add("fade-in");
      cpfPage.classList.remove("opacity-0");

      if (cpfInputPage) cpfInputPage.focus();
    }, 400);
  }

  function showMainPage() {
    cpfPage.classList.remove("fade-in");
    cpfPage.classList.add("opacity-0");

    setTimeout(() => {
      cpfPage.classList.add("hidden");
      mainPage.classList.remove("hidden");

      void mainPage.offsetWidth;

      mainPage.classList.remove("fade-out");
    }, 400);
  }

  function processForm() {
    const cpf = (cpfInputPage?.value || "").replace(/\D/g, "");

    if (!validateCPF(cpf)) {
      alert("Por favor, digite um CPF válido (11 dígitos).");
      return;
    }

    if (termsCheck && !termsCheck.checked) {
      alert("Você precisa concordar com os Termos de Uso e Política de Privacidade para continuar.");
      return;
    }

    localStorage.setItem("cpf", cpf);
    console.log("CPF salvo no localStorage:", cpf);

    // mantém o fluxo, apenas consulta
    consultarCPF(cpf);
  }

  function redirecionarParaChat() {
    const dadosUsuarioJSON = localStorage.getItem("dadosUsuario");
    if (!dadosUsuarioJSON) {
      alert("Dados do usuário não encontrados. Por favor, tente novamente.");
      return;
    }

    try {
      const dadosUsuario = JSON.parse(dadosUsuarioJSON);
      if (!dadosUsuario.cpf) {
        alert("CPF não encontrado. Por favor, tente novamente.");
        return;
      }

      const cpf = String(dadosUsuario.cpf).replace(/\D/g, "");
      const urlAtual = new URLSearchParams(window.location.search);
      const novaUrl = new URLSearchParams();

      for (const [chave, valor] of urlAtual.entries()) {
        novaUrl.append(chave, valor);
      }

      novaUrl.set("cpf", cpf);

      window.location.href = `./chat/index.html?${novaUrl.toString()}`;
    } catch (error) {
      console.error("Erro ao processar dados para redirecionamento:", error);
      alert("Ocorreu um erro ao processar seus dados. Por favor, tente novamente.");
    }
  }

  function corrigirDados() {
    consultaResultado.classList.add("hidden");
    if (cpfInputPage) cpfInputPage.focus();
  }

  function tentarNovamente() {
    consultaResultado.classList.add("hidden");
    if (cpfInputPage) cpfInputPage.focus();
  }

  // Event Listeners
  if (btnAtivar) btnAtivar.addEventListener("click", showCPFPage);
  if (btnSimular) btnSimular.addEventListener("click", showCPFPage);
  if (btnVoltar) btnVoltar.addEventListener("click", showMainPage);

  if (btnAnalisar) {
    btnAnalisar.addEventListener("click", function () {
      console.log("Botão Analisar clicado");
      console.log("Valor do CPF antes do processamento:", cpfInputPage?.value);
      processForm();
    });
  }

  if (btnConfirmar) btnConfirmar.addEventListener("click", redirecionarParaChat);
  if (btnCorrigir) btnCorrigir.addEventListener("click", corrigirDados);
  if (btnTentarNovamente) btnTentarNovamente.addEventListener("click", tentarNovamente);

  if (cpfInputPage) {
    cpfInputPage.addEventListener("input", function () {
      formatCPF(this);
    });
  }

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
    if (!slides || slides.length === 0) return;

    if (index < 0) index = slides.length - 1;
    else if (index >= slides.length) index = 0;

    slides.forEach((slide) => slide.classList.remove("active"));
    slides[index].classList.add("active");

    indicators.forEach((indicator, i) => {
      indicator.classList.toggle("active", i === index);
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
      line.classList.toggle("active", i < index);
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
    autoSlideInterval = setInterval(nextSlide, 5000);
  }

  function resetAutoSlide() {
    clearInterval(autoSlideInterval);
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

    carousel.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true }
    );

    carousel.addEventListener(
      "touchend",
      (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;

        if (diff > 50) prevSlide();
        else if (diff < -50) nextSlide();
      },
      { passive: true }
    );

    carousel.addEventListener("mouseenter", () => clearInterval(autoSlideInterval));
    carousel.addEventListener("mouseleave", startAutoSlide);

    showSlide(0);
    startAutoSlide();
  }
});
