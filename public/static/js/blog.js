// ==============================
//          COMPARTILHAMENTO
// ==============================
const compartilhamento = {
    whatsapp: (titulo, url) => {
        const texto = encodeURIComponent(`${titulo} - ${url}`);
        window.open(`https://wa.me/?text=${texto}`, "_blank", "noopener");
    },

    facebook: (url) => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener");
    },

    twitter: (titulo, url) => {
        const texto = encodeURIComponent(`${titulo} ${url}`);
        window.open(`https://twitter.com/intent/tweet?text=${texto}`, "_blank", "noopener");
    },

    threads: (titulo, url) => {
        const texto = encodeURIComponent(`${titulo} ${url}`);
        window.open(`https://www.threads.net/intent/post?text=${texto}`, "_blank", "noopener");
    },

    instagram: () => {
        if (confirm("Para compartilhar no Instagram:\n\n1. Abra o Instagram\n2. Crie uma nova publicação ou story\n3. Marque @sorteanalisadaoficial\n4. Use a hashtag #SorteAnalisada\n\nDeseja abrir o Instagram?")) {
            window.open("https://www.instagram.com/sorteanalisadaoficial?igsh=cW8zenNycWVieXF1", "_blank", "noopener");
        }
    },

    tiktok: () => {
        if (confirm("Para compartilhar no TikTok:\n\n1. Abra o TikTok\n2. Crie um vídeo mencionando a Sorte Analisada\n3. Use a hashtag #SorteAnalisada\n4. Marque @sorteanalisadaoficial\n\nDeseja abrir o TikTok?")) {
            window.open("https://www.tiktok.com/", "_blank", "noopener");
        }
    }
};

// Funções globais (chamadas via onclick no HTML)
function compartilharWhatsApp(url) {
    compartilhamento.whatsapp(document.title || "Sorte Analisada", url);
}

function compartilharFacebook(url) {
    compartilhamento.facebook(url);
}

function compartilharTwitter(url) {
    compartilhamento.twitter(document.title || "Sorte Analisada", url);
}

function compartilharThreads(url) {
    compartilhamento.threads(document.title || "Sorte Analisada", url);
}

function compartilharInstagram() {
    compartilhamento.instagram();
}

function compartilharTikTok() {
    compartilhamento.tiktok();
}

// ⚠️ IMPORTANTE: o segundo parâmetro "event" é passado via onclick="copiarLink(..., event)"
function copiarLink(url, event) {
    const botao = event?.target?.closest(".share-btn");

    const mostrarFeedback = () => {
        if (!botao) return;
        const textoOriginal = botao.innerHTML;
        botao.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
        botao.style.background = "var(--cor-sucesso)";
        setTimeout(() => {
            botao.innerHTML = textoOriginal;
            botao.style.background = "";
        }, 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(mostrarFeedback).catch(() => fallbackCopiar(url, mostrarFeedback));
    } else {
        fallbackCopiar(url, mostrarFeedback);
    }
}

function fallbackCopiar(url, callback) {
    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand("copy");
        callback();
    } catch (err) {
        alert("Falha ao copiar. Por favor, copie manualmente: " + url);
    } finally {
        document.body.removeChild(textArea);
    }
}

// ==============================
//      ARTIGOS EXPANSÍVEIS
// ==============================
function toggleArtigo(header, conteudo) {
    const artigoContainer = header.closest(".artigo-blog");
    const resumo = artigoContainer.querySelector(".artigo-resumo");
    const icon = header.querySelector("i");
    const isExpandido = conteudo.classList.contains("artigo-expandido");

    if (isExpandido) {
        // Fechar
        conteudo.classList.remove("artigo-expandido");
        header.setAttribute("aria-expanded", "false");
        if (resumo) resumo.style.display = "block";
        if (icon) icon.className = "fa-solid fa-chevron-down";
    } else {
        // Abrir
        conteudo.classList.add("artigo-expandido");
        header.setAttribute("aria-expanded", "true");
        if (resumo) resumo.style.display = "none";
        if (icon) icon.className = "fa-solid fa-chevron-up";

        // Scroll suave apenas se o topo do artigo estiver fora da viewport
        const rect = artigoContainer.getBoundingClientRect();
        if (rect.top < 0) {
            setTimeout(() => {
                artigoContainer.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 300);
        }
    }
}

function configurarArtigos() {
    const artigos = document.querySelectorAll(".artigo-blog");

    artigos.forEach((artigo) => {
        const header = artigo.querySelector(".artigo-blog-header");
        const conteudo = artigo.querySelector(".artigo-conteudo");
        if (!header || !conteudo) return;

        // Estado inicial: fechado
        conteudo.classList.remove("artigo-expandido");
        header.setAttribute("aria-expanded", "false");

        // Clique no header
        header.addEventListener("click", (e) => {
            // Ignorar cliques em links/compartilhamento dentro do conteúdo
            if (e.target.closest("a") || e.target.closest(".share-container")) return;
            toggleArtigo(header, conteudo);
        });

        // Acessibilidade: teclado
        header.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleArtigo(header, conteudo);
            }
        });
    });
}

// ==============================
//      INICIALIZAÇÃO
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    configurarArtigos();
});