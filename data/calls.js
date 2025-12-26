// data/calls.js
// Banco de chamadas com perguntas (FASE A).
// Cada chamada tem "truth" (verdade real) e "questions" (o que o jogador pode descobrir).
// IMPORTANTE: Não é aconselhamento real de emergência. Conteúdo educativo/simulador.

window.CALLS = [
  // =========================
  // BRASIL - POLÍCIA (190)
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
    recommended: {
      police: ["pm_area"], // patrulhamento de área resolve na maioria
      fire: []
    },
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
        a: "Estou trancada. Ele ainda está aqui fora. Não consigo ver se tem arma."
      },
      optional: [
        { id: "weapon", q: "Perguntar: Você viu alguma arma?", a: "Não vi arma. Mas ele está com as mãos no bolso e olhando pros lados.", reveals: { weaponUnknown: true } },
        { id: "desc", q: "Perguntar: Descreva a pessoa (roupa, altura).", a: "Homem alto, moletom escuro, boné. Parece estar nervoso.", reveals: { description: true } }
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
    recommended: {
      police: ["rota", "choque"], // força tática / controle
      fire: []
    },
    questions: {
      required: ["address", "situation", "danger"],
      address: {
        q: "Perguntar: Qual é o endereço exato?",
        a: "Avenida Central, número 55, loja de eletrônicos, bem em frente ao ponto de ônibus."
      },
      situation: {
        q: "Perguntar: O que está acontecendo agora?",
        a: "Dois homens estão pegando tudo, gritando e mandando deitar no chão."
      },
      danger: {
        q: "Perguntar: Tem arma? Alguém ferido?",
        a: "Sim, um deles está com uma pistola. Ninguém ferido ainda, mas estão muito agressivos."
      },
      optional: [
        { id: "suspects", q: "Perguntar: Quantos suspeitos e como estão vestidos?", a: "São dois. Um com jaqueta cinza, outro com camisa preta. Um tem tatuagem no braço.", reveals: { multiple: true } },
        { id: "hostages", q: "Perguntar: Tem reféns / pessoas presas?", a: "Tem uns clientes no chão. Acho que ninguém preso em sala fechada.", reveals: { hostages: true } }
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
    recommended: {
      police: ["gate", "choque"], // GATE antibomba + choque para isolamento
      fire: []
    },
    questions: {
      required: ["address", "situation", "danger"],
      address: {
        q: "Perguntar: Onde exatamente está o objeto?",
        a: "Na entrada principal, ao lado da porta giratória. Rua do Comércio, 900."
      },
      situation: {
        q: "Perguntar: Por que suspeitam que é perigoso?",
        a: "O segurança viu fios aparentes e tem gente dizendo que ouviram um bip."
      },
      danger: {
        q: "Perguntar: Tem gente perto? Dá pra isolar?",
        a: "Tem muita gente entrando e saindo. O segurança está tentando afastar, mas tá difícil."
      },
      optional: [
        { id: "evac", q: "Perguntar: O prédio já foi evacuado?", a: "Ainda não, só mandaram as pessoas se afastarem da entrada.", reveals: { evacuation: false } }
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
    recommended: {
      police: [],
      fire: []
    },
    questions: {
      required: ["address", "situation"], // “danger” pode ser opcional em trote
      address: {
        q: "Perguntar: Qual é o endereço?",
        a: "Ah… é… na rua da sua casa! (risos) — (som de gente ao fundo)."
      },
      situation: {
        q: "Perguntar: O que aconteceu?",
        a: "Tem um dinossauro! (risadas altas)."
      },
      danger: {
        q: "Perguntar: Há alguém ferido? Qual o risco?",
        a: "Ferido nada, tio… (mais risadas)."
      },
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
    recommended: {
      police: ["pm_area"],
      fire: ["fire_engine", "rescue"]
    },
    questions: {
      required: ["address", "situation", "danger"],
      address: {
        q: "Perguntar: Qual o endereço e apartamento?",
        a: "Rua Horizonte, 1200, Bloco B, apartamento 34. O cheiro tá forte!"
      },
      situation: {
        q: "Perguntar: Você vê fogo ou só fumaça?",
        a: "Eu vejo fumaça saindo pela porta. Não consigo ver chama daqui."
      },
      danger: {
        q: "Perguntar: Tem gente lá dentro? Alguém passou mal?",
        a: "Acho que o vizinho está lá dentro. Tem gente tossindo no corredor!"
      },
      optional: [
        { id: "gas", q: "Perguntar: Você sente cheiro de gás?", a: "Sim, um pouco. Parece gás mesmo!", reveals: { gas: true } }
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
    recommended: {
      police: ["pm_area"],
      fire: ["ambulance", "rescue"]
    },
    questions: {
      required: ["address", "situation", "danger"],
      address: {
        q: "Ask: What's the exact address?",
        a: "24 Maple Street, apartment 2! Please hurry!"
      },
      situation: {
        q: "Ask: Is he choking on food? Can he speak or cough?",
        a: "He was eating meat… he can't speak, he can't cough!"
      },
      danger: {
        q: "Ask: Is he conscious? Is he turning blue?",
        a: "He's still conscious but getting worse—his face is changing color!"
      },
      optional: [
        { id: "instructions", q: "Give instructions: Are you able to do abdominal thrusts (Heimlich)?", a: "I think so—tell me what to do!", reveals: { preArrival: true } }
      ]
    }
  },

  // =========================
  // EU - 112
  // =========================
  {
    id: "eu_pol_domestic_01",
    locale: "EU",
    title: "Violência doméstica (gritos e ameaça)",
    severity: "grave",
    text: "112, emergency… I can hear screaming next door. I think someone is being attacked!",
    truth: {
      type: "police",
      isPrank: false,
      address: "12 River Road, Flat 5",
      situation: "Gritos e possível agressão doméstica.",
      danger: "Risco imediato, possível agressor armado com objeto.",
      flags: { weapon: false, injured: true, fire: false, multiple: false }
    },
    recommended: {
      police: ["pm_area", "choque"],
      fire: []
    },
    questions: {
      required: ["address", "situation", "danger"],
      address: { q: "Ask: What's the address / building / flat?", a: "River Road 12, flat 5. I'm in flat 4." },
      situation: { q: "Ask: What exactly do you hear or see?", a: "Loud screams and banging. A man shouting threats." },
      danger: { q: "Ask: Any weapons? Any injuries?", a: "I can't see a weapon, but the screams sound like someone is hurt!" },
      optional: [
        { id: "children", q: "Ask: Are there children involved?", a: "Yes—there's a child crying.", reveals: { children: true } }
      ]
    }
  },

  // =========================
  // AU - 000 (Triagem)
  // =========================
  {
    id: "au_000_fire_01",
    locale: "AU",
    title: "000 - Preciso de Bombeiros (fogo em mato)",
    severity: "medio",
    text: "000… I need Fire, there’s a grass fire near the road!",
    truth: {
      type: "fire",
      isPrank: false,
      address: "Near Highway 3, Mile 18",
      situation: "Fogo em vegetação próximo à via.",
      danger: "Risco de espalhar com vento e atingir carros.",
      flags: { weapon: false, injured: false, fire: true, multiple: false }
    },
    recommended: {
      police: ["pm_area"],
      fire: ["fire_engine"]
    },
    questions: {
      required: ["address", "situation", "danger"],
      address: { q: "Ask: Where exactly is it (nearest marker)?", a: "Highway 3, around mile 18, close to the gas station!" },
      situation: { q: "Ask: How big is the fire? Flames or smoke?", a: "Small flames but spreading fast in the dry grass." },
      danger: { q: "Ask: Is anyone trapped or cars in danger?", a: "Cars are slowing down; the smoke is crossing the road." },
      optional: [
        { id: "wind", q: "Ask: Wind direction / speed?", a: "Wind is strong, pushing it toward the trees!", reveals: { wind: true } }
      ]
    }
  }
];