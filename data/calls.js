// data/calls.js
// Banco de chamadas com perguntas (FASE A).
// Todas as chamadas aqui possuem questions.address/situation/danger definidas.

window.CALLS = [
  // =========================
  // BRASIL - POLÍCIA (190) - LEVES
  // =========================
  {
    id: "br_pol_lost_child_01",
    locale: "BR",
    title: "Criança perdida em local público",
    severity: "leve",
    text: "Perdi meu filho por alguns minutos no shopping. Estou na entrada principal.",
    truth: {
      type: "police",
      isPrank: false,
      address: "Shopping Aurora - Entrada Principal",
      situation: "Responsável perdeu contato visual com a criança. Local público com grande fluxo.",
      danger: "Risco moderado (criança pode se afastar). Não há ameaça direta relatada.",
      flags: { weapon: false, injured: false, fire: false, multiple: false }
    },
    recommended: {
      police: ["pm_area"], // patrulha/área resolve
      fire: []
    },
    questions: {
      required: ["address", "situation", "danger"],
      address: {
        q: "Perguntar: Qual é o local exato (shopping/entrada/andar)?",
        a: "É no Shopping Aurora, entrada principal. Eu tô bem na porta da frente."
      },
      situation: {
        q: "Perguntar: Como a criança se perdeu e há quanto tempo?",
        a: "Foi rapidinho, uns 3 minutos. Eu virei e ele sumiu no meio das pessoas."
      },
      danger: {
        q: "Perguntar: Idade/roupa da criança e se alguém suspeito se aproximou?",
        a: "Ele tem 6 anos, camiseta azul e tênis branco. Não vi ninguém suspeito."
      },
      optional: [
        {
          id: "desc",
          q: "Perguntar: Nome da criança e características (altura/cabelo)?",
          a: "O nome dele é Lucas, baixinho, cabelo castanho curto.",
          reveals: { description: true }
        },
        {
          id: "last_seen",
          q: "Perguntar: Onde foi visto pela última vez?",
          a: "Perto da praça de alimentação, do lado do quiosque de sorvete.",
          reveals: { lastSeen: true }
        }
      ]
    }
  },

  {
    id: "br_pol_noise_01",
    locale: "BR",
    title: "Perturbação do sossego (som alto)",
    severity: "leve",
    text: "Meu vizinho está com som altíssimo e não deixa ninguém dormir.",
    truth: {
      type: "police",
      isPrank: false,
      address: "Rua das Acácias, 88 - Apto 12",
      situation: "Som alto em residência/apartamento. Possível conflito entre vizinhos.",
      danger: "Baixo risco imediato, mas pode escalar para discussão/agressão.",
      flags: { weapon: false, injured: false, fire: false, multiple: false }
    },
    recommended: { police: ["pm_area"], fire: [] },
    questions: {
      required: ["address", "situation", "danger"],
      address: { q: "Perguntar: Qual o endereço exato?", a: "Rua das Acácias, 88, apartamento 12." },
      situation: { q: "Perguntar: O que está acontecendo?", a: "Som muito alto e gritaria desde cedo." },
      danger: { q: "Perguntar: Houve ameaça ou briga?", a: "Ainda não, mas já discutimos e ele xingou." },
      optional: [
        { id: "time", q: "Perguntar: Há quanto tempo está assim?", a: "Há umas 2 horas.", reveals: { duration: true } }
      ]
    }
  },

  // =========================
  // BRASIL - POLÍCIA (190) - MÉDIOS / GRAVES
  // =========================
  {
    id: "br_pol_suspect_01",
    locale: "BR",
    title: "Suspeito rondando residência",
    severity: "medio",
    text: "Tem um homem rondando a minha casa, olhando as janelas. Estou com medo.",
    truth: {
      type: "police",
      isPrank: false,
      address: "Rua das Palmeiras, 210 - Vila Nova",
      situation: "Homem rondando residência, tentando observar portas e janelas.",
      danger: "Possível tentativa de invasão. Chamador está dentro da casa.",
      flags: { weapon: false, injured: false, fire: false, multiple: false }
    },
    recommended: { police: ["pm_area"], fire: [] },
    questions: {
      required: ["address", "situation", "danger"],
      address: {
        q: "Perguntar: Qual é o endereço exato?",
        a: "É na Rua das Palmeiras, número 210, Vila Nova. Perto da padaria do Seu Zé."
      },
      situation: {
        q: "Perguntar: O que exatamente ele está fazendo?",
        a: "Ele fica indo e voltando na calçada, tenta olhar pela janela e mexeu no portão."
      },
      danger: {
        q: "Perguntar: Há risco imediato? Você está segura aí dentro?",
        a: "Estou trancada. Ele ainda está aqui fora. Não vi arma, mas tô com medo."
      },
      optional: [
        { id: "weapon", q: "Perguntar: Você viu alguma arma?", a: "Não vi arma. Ele está com as mãos no bolso.", reveals: { weaponUnknown: true } },
        { id: "desc", q: "Perguntar: Descreva a pessoa (roupa, altura).", a: "Homem alto, moletom escuro, boné.", reveals: { description: true } }
      ]
    }
  },

  {
    id: "br_pol_robbery_01",
    locale: "BR",
    title: "Assalto em andamento (com arma)",
    severity: "grave",
    text: "Tem um assalto acontecendo aqui na loja! Eu tô escondido atrás do balcão!",
    truth: {
      type: "police",
      isPrank: false,
      address: "Av. Central, 55 - Centro",
      situation: "Dois suspeitos dentro de uma loja, ameaçando com arma.",
      danger: "Risco imediato de morte. Suspeitos armados e agressivos.",
      flags: { weapon: true, injured: false, fire: false, multiple: true }
    },
    recommended: { police: ["rota", "choque"], fire: [] },
    questions: {
      required: ["address", "situation", "danger"],
      address: { q: "Perguntar: Qual é o endereço exato?", a: "Avenida Central, 55, loja de eletrônicos, em frente ao ponto." },
      situation: { q: "Perguntar: O que está acontecendo agora?", a: "Dois homens pegando tudo, gritando e mandando deitar no chão." },
      danger: { q: "Perguntar: Tem arma? Alguém ferido?", a: "Sim, um com pistola. Ninguém ferido ainda, mas estão agressivos." },
      optional: [
        { id: "suspects", q: "Perguntar: Quantos suspeitos e como estão vestidos?", a: "Dois. Um jaqueta cinza, outro camisa preta. Um tem tatuagem.", reveals: { multiple: true } },
        { id: "hostages", q: "Perguntar: Tem reféns / pessoas presas?", a: "Tem clientes no chão. Acho que ninguém trancado.", reveals: { hostages: true } }
      ]
    }
  },

  {
    id: "br_pol_bomb_01",
    locale: "BR",
    title: "Suspeita de artefato (mochila abandonada)",
    severity: "grave",
    text: "Tem uma mochila abandonada na entrada do prédio e estão dizendo que pode ter bomba.",
    truth: {
      type: "police",
      isPrank: false,
      address: "Rua do Comércio, 900 - Centro",
      situation: "Objeto suspeito em local movimentado.",
      danger: "Possível artefato explosivo. Necessidade de isolamento.",
      flags: { weapon: true, injured: false, fire: false, multiple: false }
    },
    recommended: { police: ["gate", "choque"], fire: [] },
    questions: {
      required: ["address", "situation", "danger"],
      address: { q: "Perguntar: Onde exatamente está o objeto?", a: "Na entrada principal, Rua do Comércio, 900, ao lado da porta." },
      situation: { q: "Perguntar: Por que suspeitam que é perigoso?", a: "O segurança viu fios aparentes e disseram que ouviram bip." },
      danger: { q: "Perguntar: Tem gente perto? Dá pra isolar?", a: "Tem muita gente. Segurança tenta afastar, mas tá difícil." },
      optional: [
        { id: "evac", q: "Perguntar: O prédio já foi evacuado?", a: "Ainda não, só afastaram da entrada.", reveals: { evacuation: false } }
      ]
    }
  },

  {
    id: "br_pol_prank_01",
    locale: "BR",
    title: "Trote com risadas e desligam",
    severity: "trote",
    text: "Alooo… tem um dinossauro aqui… (risadas) …",
    truth: {
      type: "police",
      isPrank: true,
      address: "",
      situation: "Trote infantil.",
      danger: "Sem risco real.",
      flags: { weapon: false, injured: false, fire: false, multiple: false }
    },
    recommended: { police: [], fire: [] },
    questions: {
      required: ["address", "situation"],
      address: { q: "Perguntar: Qual é o endereço?", a: "Ah… é… na rua da sua casa! (risos) — tem gente ao fundo." },
      situation: { q: "Perguntar: O que aconteceu?", a: "Tem um dinossauro! (risadas altas)." },
      danger: { q: "Perguntar: Há alguém ferido? Qual o risco?", a: "Ferido nada, tio… (mais risadas)." },
      optional: [
        { id: "callback", q: "Perguntar: Qual seu nome e número para retorno?", a: "… (desligou)", reveals: { hungUp: true } }
      ]
    }
  },

  // =========================
  // BRASIL - BOMBEIROS (193)
  // =========================
  {
    id: "br_fire_kitchen_01",
    locale: "BR",
    title: "Fumaça na cozinha (incêndio inicial)",
    severity: "medio",
    text: "Tá saindo muita fumaça da cozinha do apartamento do meu vizinho! O alarme disparou!",
    truth: {
      type: "fire",
      isPrank: false,
      address: "Rua Horizonte, 1200 - Bloco B, Apto 34",
      situation: "Fumaça densa, possível fogo em cozinha.",
      danger: "Risco de propagação e intoxicação por fumaça.",
      flags: { weapon: false, injured: false, fire: true, multiple: false }
    },
    recommended: { police: ["pm_area"], fire: ["fire_engine", "rescue"] },
    questions: {
      required: ["address", "situation", "danger"],
      address: { q: "Perguntar: Qual o endereço e apartamento?", a: "Rua Horizonte, 1200, Bloco B, apartamento 34." },
      situation: { q: "Perguntar: Você vê fogo ou só fumaça?", a: "Só fumaça saindo pela porta. Não vejo chama daqui." },
      danger: { q: "Perguntar: Tem gente lá dentro? Alguém passou mal?", a: "Acho que ele tá lá dentro. Gente tossindo no corredor." },
      optional: [
        { id: "gas", q: "Perguntar: Você sente cheiro de gás?", a: "Sim, parece gás!", reveals: { gas: true } }
      ]
    }
  },

  // =========================
  // EUA - 911
  // =========================
  {
    id: "us_med_choking_01",
    locale: "US",
    title: "Engasgo (adulto) - dificuldade respiratória",
    severity: "grave",
    text: "911! My dad is choking! He can't breathe and he's turning red!",
    truth: {
      type: "medical",
      isPrank: false,
      address: "24 Maple St, Apt 2",
      situation: "Adulto engasgado, obstrução de vias aéreas.",
      danger: "Risco imediato de asfixia.",
      flags: { weapon: false, injured: true, fire: false, multiple: false }
    },
    recommended: { police: ["pm_area"], fire: ["ambulance", "rescue"] },
    questions: {
      required: ["address", "situation", "danger"],
      address: { q: "Ask: What's the exact address?", a: "24 Maple Street, apartment 2! Please hurry!" },
      situation: { q: "Ask: Can he speak or cough?", a: "No! He can't speak, he can't cough!" },
      danger: { q: "Ask: Is he conscious? Turning blue?", a: "Still conscious but getting worse—color is changing!" },
      optional: [
        { id: "instructions", q: "Give instructions: Are you able to do abdominal thrusts?", a: "I think so—tell me what to do!", reveals: { preArrival: true } }
      ]
    }
  }
];