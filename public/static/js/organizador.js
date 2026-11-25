// ==============================
//      ORGANIZADOR DE JOGOS (versão web)
//      Mesma lógica do organizador do app Sorte Analisada Lite.
//      Roda inteiramente no navegador: nada é enviado nem armazenado.
// ==============================
(function () {
    "use strict";

    var QTD_JOGOS = 10;
    var TAMANHO = 40;   // px — deve bater com o CSS (.num)
    var ESPACO = 8;     // px — deve bater com o gap da grade
    var COLUNAS_MIN = 4;

    // padrao = dezenas de um jogo simples; extra = quantos números a mais o pool pode ter
    var LOTERIAS = {
        megasena:   { nome: "Mega-Sena",    max: 60, padrao: 6,  extra: 2, colunas: [6] },
        quina:      { nome: "Quina",        max: 80, padrao: 5,  extra: 2, colunas: [8, 5] },
        duplasena:  { nome: "Dupla-Sena",   max: 50, padrao: 6,  extra: 2, colunas: [5] },
        diadesorte: { nome: "Dia de Sorte", max: 31, padrao: 7,  extra: 2, colunas: [7] },
        lotofacil:  { nome: "Lotofácil",    max: 25, padrao: 15, extra: 1, colunas: [5] }
    };

    // ---------- utilidades ----------
    function inteiroAleatorio(maxExclusivo) {
        var c = window.crypto || window.msCrypto;
        if (c && c.getRandomValues) {
            var limite = Math.floor(0x100000000 / maxExclusivo) * maxExclusivo;
            var buf = new Uint32Array(1);
            var x;
            do {
                c.getRandomValues(buf);
                x = buf[0];
            } while (x >= limite);
            return x % maxExclusivo;
        }
        return Math.floor(Math.random() * maxExclusivo);
    }

    function embaralhar(lista) {
        var a = lista.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = inteiroAleatorio(i + 1);
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    // Todas as combinações de "k" itens de "lista" (o pool é pequeno: no máximo 36 combinações)
    function combinacoes(lista, k) {
        var saida = [];
        (function escolher(inicio, atual) {
            if (atual.length === k) { saida.push(atual.slice()); return; }
            for (var i = inicio; i < lista.length; i++) {
                atual.push(lista[i]);
                escolher(i + 1, atual);
                atual.pop();
            }
        })(0, []);
        return saida;
    }

    function fmt(n) { return String(n).padStart(2, "0"); }

    function textoJogo(jogo) { return jogo.map(fmt).join(" - "); }

    function criar(tag, classe, texto) {
        var el = document.createElement(tag);
        if (classe) el.className = classe;
        if (texto !== undefined) el.textContent = texto;
        return el;
    }

    function copiarTexto(texto) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(texto);
        }
        return new Promise(function (resolve, reject) {
            var area = document.createElement("textarea");
            area.value = texto;
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            area.select();
            try {
                document.execCommand("copy") ? resolve() : reject(new Error("copy"));
            } catch (e) {
                reject(e);
            } finally {
                document.body.removeChild(area);
            }
        });
    }

    // ---------- aplicação ----------
    function iniciar() {
        var select = document.getElementById("org-loteria");
        var intro = document.getElementById("org-intro");
        var grade = document.getElementById("org-grade");
        var contador = document.getElementById("org-contador");
        var btnGerar = document.getElementById("org-gerar");
        var btnLimpar = document.getElementById("org-limpar");
        var areaJogos = document.getElementById("org-jogos");
        var status = document.getElementById("org-status");
        if (!select || !grade || !btnGerar || !btnLimpar || !areaJogos) return;

        var loteria = select.value;
        var selecionados = [];
        var jogos = [];
        var pool = [];
        var jogosProntos = false;
        var botoes = {};
        var colunasAtuais = 0;

        function config() { return LOTERIAS[loteria]; }
        function maximo() { return config().padrao + config().extra; }

        function avisar(texto) { if (status) status.textContent = texto; }

        function calcularColunas() {
            var largura = grade.parentElement.clientWidth || window.innerWidth - 32;
            var cabem = Math.max(COLUNAS_MIN, Math.floor((largura + ESPACO) / (TAMANHO + ESPACO)));
            var preferidas = config().colunas;
            for (var i = 0; i < preferidas.length; i++) {
                if (preferidas[i] <= cabem) return preferidas[i];
            }
            return cabem;
        }

        function atualizarContador() {
            contador.textContent = selecionados.length + " escolhido(s) · o organizador completa até " +
                maximo() + " números para formar o conjunto";
        }

        function pintar(n) {
            var b = botoes[n];
            if (!b) return;
            var sel = selecionados.indexOf(n) !== -1;
            var auto = jogosProntos && !sel && pool.indexOf(n) !== -1;
            b.className = "num" + (sel ? " sel" : "") + (auto ? " auto" : "");
            b.setAttribute("aria-pressed", sel ? "true" : "false");
            b.setAttribute("aria-label", "Número " + n + (sel ? ", escolhido" : auto ? ", sorteado para completar" : ""));
        }

        function montarGrade() {
            grade.innerHTML = "";
            botoes = {};
            colunasAtuais = calcularColunas();
            grade.style.gridTemplateColumns = "repeat(" + colunasAtuais + ", " + TAMANHO + "px)";
            intro.textContent = "Escolha os seus " + maximo() + " números ou deixe o sistema completar!";
            for (var n = 1; n <= config().max; n++) {
                (function (num) {
                    var b = criar("button", "num", fmt(num));
                    b.type = "button";
                    b.addEventListener("click", function () { alternar(num); });
                    botoes[num] = b;
                    grade.appendChild(b);
                    pintar(num);
                })(n);
            }
            grade.classList.toggle("travada", jogosProntos);
            atualizarContador();
        }

        function alternar(n) {
            if (jogosProntos) return;
            var i = selecionados.indexOf(n);
            if (i !== -1) {
                selecionados.splice(i, 1);
            } else {
                if (selecionados.length >= maximo()) {
                    avisar("Limite de " + maximo() + " números atingido.");
                    return;
                }
                selecionados.push(n);
            }
            pintar(n);
            atualizarContador();
        }

        function exibirJogos() {
            areaJogos.innerHTML = "";
            if (!jogos.length) return;

            var resumo = criar("p", "org-pool");
            resumo.appendChild(criar("strong", null, "Conjunto desta rodada: "));
            resumo.appendChild(document.createTextNode(pool.map(fmt).join(" - ")));
            areaJogos.appendChild(resumo);

            jogos.forEach(function (jogo, i) {
                var linha = criar("div", "jogo");
                linha.appendChild(criar("span", "jogo-numero", "Jogo " + fmt(i + 1)));
                linha.appendChild(criar("span", "jogo-texto", textoJogo(jogo)));
                var btn = criar("button", "botao-mini", "Copiar");
                btn.type = "button";
                btn.addEventListener("click", function () { copiarComFeedback(textoJogo(jogo), btn, "Copiar"); });
                linha.appendChild(btn);
                areaJogos.appendChild(linha);
            });

            var todos = criar("button", "botao-copiar botao-copiar-todos");
            todos.type = "button";
            var rotulo = '<i class="fa-solid fa-copy" aria-hidden="true"></i> Copiar todos os jogos';
            todos.innerHTML = rotulo;
            todos.addEventListener("click", function () {
                var texto = jogos.map(function (j, i) { return "Jogo " + fmt(i + 1) + ": " + textoJogo(j); }).join("\n");
                copiarComFeedback(texto, todos, rotulo, true);
            });
            areaJogos.appendChild(todos);
        }

        var timers = new WeakMap();
        function copiarComFeedback(texto, btn, rotuloOriginal, html) {
            function definir(v) { if (html) btn.innerHTML = v; else btn.textContent = v; }
            copiarTexto(texto).then(function () {
                definir("Copiado!");
                avisar("Copiado.");
            }, function () {
                definir("Não foi possível copiar");
                avisar("Não foi possível copiar.");
            }).then(function () {
                clearTimeout(timers.get(btn));
                timers.set(btn, setTimeout(function () { definir(rotuloOriginal); avisar(""); }, 2000));
            });
        }

        function gerar() {
            if (jogosProntos) return;
            var cfg = config();
            pool = selecionados.slice();
            var restantes = [];
            for (var n = 1; n <= cfg.max; n++) if (pool.indexOf(n) === -1) restantes.push(n);
            var faltam = maximo() - pool.length;
            if (faltam > 0) pool = pool.concat(embaralhar(restantes).slice(0, faltam));
            pool.sort(function (a, b) { return a - b; });

            jogos = embaralhar(combinacoes(pool, cfg.padrao)).slice(0, QTD_JOGOS).map(function (c) {
                return c.sort(function (a, b) { return a - b; });
            });

            jogosProntos = true;
            btnGerar.disabled = true;
            grade.classList.add("travada");
            for (var k in botoes) pintar(Number(k));
            exibirJogos();
            avisar(jogos.length + " jogos gerados.");
        }

        function limpar() {
            selecionados = [];
            jogos = [];
            pool = [];
            jogosProntos = false;
            btnGerar.disabled = false;
            areaJogos.innerHTML = "";
            grade.classList.remove("travada");
            for (var k in botoes) pintar(Number(k));
            atualizarContador();
            avisar("Seleção limpa.");
        }

        select.addEventListener("change", function () {
            loteria = select.value;
            limpar();
            montarGrade();
        });
        btnGerar.addEventListener("click", gerar);
        btnLimpar.addEventListener("click", limpar);

        var timerResize = null;
        window.addEventListener("resize", function () {
            clearTimeout(timerResize);
            timerResize = setTimeout(function () {
                if (calcularColunas() !== colunasAtuais) montarGrade();
            }, 120);
        });

        montarGrade();
    }

    document.addEventListener("DOMContentLoaded", iniciar);
})();
