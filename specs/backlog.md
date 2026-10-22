# Backlog futuro

> **FORA DE ESCOPO DO MVP.** Esta lista existe só para evitar decisões que fechem portas. Nada aqui deve ser implementado, nem ganhar abstrações especulativas, até ser promovido a requisito em `requirements.md` com aprovação explícita.

| Ideia | Nota arquitetural (por que não fechamos a porta) |
|---|---|
| Onboarding conversacional no primeiro uso (nome do "mestre", data de nascimento etc.), salvo localmente | O documento JSON versionado aceita novos campos via migração. |
| Horóscopo do dia com base no mapa astral | Exigiria dados/rede; a CSP e o "sem rede" teriam de ser revistos em ADR. |
| Ciclo de sono: sonolenta/dorme a partir da meia-noite | A máquina de estados de animação recebe `now`; novos estados são extensões. |
| Casinha de cogumelo: a Fai se recolhe quando não está em uso e reaparece com animação ao clicar | Idem; janela da mascote já é controlada pelo main. |
| Várias interações diferentes ao clicar | Reações são *tags* do sprite sheet + transições. |
| Lembretes de rotina (lavar roupa, limpar a casa) com comemoração | Recorrência ficaria no domínio de lembretes. |
| Comemorar commits do git e conquistas da Steam | Integrações externas no main, nunca no renderer. |
| Skins/roupinhas, incluindo versão "fado" | Arte segue a convenção de *tags*; trocar folha não muda código. |
| Funcionalidades inspiradas no Clippy | — |
| Conversa com IA como agente/assistente virtual | Chaves só no main (`safeStorage`); renderer nunca vê segredos. |
| Notícias geek sobre jogos, animes e livros favoritos | Exige rede: rever CSP/ADR-0007. |
| Avisos de status da máquina (armazenamento cheio, dicas de desempenho) | Via `DesktopIntegration`. |
| Controles ⏮ ⏯ ⏭ e "tocando agora" do Spotify/YouTube | Integração de SO (SMTC no Windows, MPRIS no Linux) via `DesktopIntegration`. |
| Versão Linux completa | Nova implementação da `DesktopIntegration` + alvo de empacotamento. |
| Iniciar com o sistema | `app.setLoginItemSettings` (Windows) / autostart `.desktop` (Linux). |
| Pós-MVP: avaliar se o produto pode ser customizável e vendável | — |
