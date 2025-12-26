/* =========================================================
   data/calls.js - Last Call Dispatch Operator
   Fase 2B (Perguntas dinâmicas por caso + severidade evolutiva)
   ========================================================= */

window.CALLS = [
  // =========================
  // BR - POLÍCIA (190)
  // =========================
  {
    id: "br_pol_trote_risada_01",
    agency: "police",
    region: "BR",
    title: "Trote com risadas e história absurda",
    baseSeverity: "trote",
    protocol: {
      required: ["confirm_intent"],
      questions: [
        {
          id: "confirm_intent",
          label: "Confirmar ocorrência",
          prompt: "190. Confirme a ocorrência real, por favor. O que está acontecendo?",
          answer: "(risadas ao fundo) Ah… é brincadeira… (desliga)",
          effect: { confidenceTrote: +3 }
        }
      ]
    },
    dispatch: {
      correctRoles: ["dismiss_only"],
      allowedRoles: ["area_patrol"]
    },
    hint: "Trote: o correto é encerrar. Despachar aqui é desperdício.",
  },

  {
    id: "br_pol_som_alto_01",
    agency: "police",
    region: "BR",
    title: "Perturbação do sossego (som alto)",
    baseSeverity: "leve",
    protocol: {
      required: ["addr", "what_happening"],
      questions: [
        {
          id: "addr",
          label: "Endereço",
          prompt: "Qual o endereço completo e um ponto de referência?",
          answer: "Rua das Acácias, 155. Em frente a uma padaria.",
          effect: { severity: "leve" }
        },
        {
          id: "what_happening",
          label: "Situação",
          prompt: "O que está acontecendo exatamente?",
          answer: "Vizinho com som alto há horas. Não tem briga, só barulho.",
          effect: { severity: "leve" }
        },
        {
          id: "danger",
          label: "Risco/violência",
          prompt: "Existe ameaça, agressão, arma, ou alguém ferido?",
          answer: "Não. Só o som mesmo.",
          effect: { severity: "leve" }
        }
      ]
    },
    dispatch: {
      correctRoles: ["area_patrol"],
      allowedRoles: ["area_patrol", "civil_investigation"]
    },
    hint: "Caso leve. Foque em endereço e natureza do pedido. Viatura de área.",
  },

  {
    id: "br_pol_viol_dom_01",
    agency: "police",
    region: "BR",
    title: "Violência doméstica (gritos e possível agressão)",
    baseSeverity: "medio",
    protocol: {
      required: ["addr", "danger_now"],
      questions: [
        {
          id: "addr",
          label: "Endereço",
          prompt: "Qual o endereço completo e como a viatura encontra o local?",
          answer: "Rua do Campo, 77, casa 2. Portão verde.",
          effect: { severity: "medio" }
        },
        {
          id: "danger_now",
          label: "Risco imediato",
          prompt: "A agressão está acontecendo agora? Há arma? Há crianças no local?",
          answer: "Sim, está acontecendo agora. Tem criança chorando. Não vi arma.",
          effect: { severity: "grave" }
        },
        {
          id: "suspect_desc",
          label: "Suspeito",
          prompt: "Descreva o agressor: roupa, altura, se bebeu ou está alterado.",
          answer: "Homem alto, camiseta preta. Está muito alterado.",
          effect: { severity: "grave" }
        },
        {
          id: "safe_place",
          label: "Segurança do chamador",
          prompt: "Você está em local seguro? Consegue se afastar e manter a linha?",
          answer: "Estou trancada no quarto com a criança.",
          effect: { severity: "grave" }
        }
      ]
    },
    dispatch: {
      correctRoles: ["area_patrol", "tactical_rota"],
      allowedRoles: ["area_patrol", "tactical_rota", "shock_riot"]
    },
    hint: "Pode escalar rápido. Priorize risco imediato e segurança do chamador.",
  },

  {
    id: "br_pol_roubo_andamento_01",
    agency: "police",
    region: "BR",
    title: "Roubo em andamento (suspeitos armados)",
    baseSeverity: "grave",
    protocol: {
      required: ["addr", "weapons", "suspects"],
      questions: [
        {
          id: "addr",
          label: "Endereço",
          prompt: "Qual o endereço exato e referência?",
          answer: "Av. Norte, 1200, perto do posto de gasolina.",
          effect: { severity: "grave" }
        },
        {
          id: "weapons",
          label: "Armas",
          prompt: "Eles estão armados? Consegue ver arma de fogo ou faca?",
          answer: "Sim, vi uma arma na mão de um deles.",
          effect: { severity: "grave" }
        },
        {
          id: "suspects",
          label: "Suspeitos",
          prompt: "Quantos suspeitos e descrição (roupas, direção de fuga)?",
          answer: "Dois. Um de moletom cinza, outro de boné vermelho. Estão indo para a rua lateral.",
          effect: { severity: "grave" }
        },
        {
          id: "victims",
          label: "Vítimas",
          prompt: "Há alguém ferido? Reféns? Alguém em risco imediato?",
          answer: "Ninguém ferido por enquanto, mas estão ameaçando.",
          effect: { severity: "grave" }
        }
      ]
    },
    dispatch: {
      correctRoles: ["tactical_rota", "air_eagle", "area_patrol"],
      allowedRoles: ["tactical_rota", "air_eagle", "area_patrol", "shock_riot"]
    },
    hint: "Grave. Tático + apoio aéreo se disponível. Não mande só viatura comum.",
  },

  {
    id: "br_pol_bomba_suspeita_01",
    agency: "police",
    region: "BR",
    title: "Objeto suspeito com possível artefato",
    baseSeverity: "grave",
    protocol: {
      required: ["addr", "object_desc", "crowd"],
      questions: [
        {
          id: "addr",
          label: "Endereço",
          prompt: "Onde está o objeto suspeito?",
          answer: "Na calçada do metrô, entrada principal.",
          effect: { severity: "grave" }
        },
        {
          id: "object_desc",
          label: "Descrição",
          prompt: "Como é o objeto? Mochila, caixa, fios visíveis? Está fazendo barulho?",
          answer: "É uma mochila abandonada. Não vi fios, mas ninguém mexe.",
          effect: { severity: "grave" }
        },
        {
          id: "crowd",
          label: "Pessoas no local",
          prompt: "Tem muita gente perto? Dá para isolar e afastar as pessoas?",
          answer: "Tem bastante gente. Segurança tentando afastar.",
          effect: { severity: "grave" }
        },
        {
          id: "advice",
          label: "Orientação",
          prompt: "Oriente: ninguém deve tocar no objeto e mantenha distância. Confirma?",
          answer: "Ok, vou avisar e afastar mais.",
          effect: { severity: "grave" }
        }
      ]
    },
    dispatch: {
      correctRoles: ["bomb_gate", "area_patrol"],
      allowedRoles: ["bomb_gate", "area_patrol", "tactical_rota"]
    },
    hint: "GATE/antibomba é essencial. Viatura para isolar e controlar perímetro.",
  },

  // =========================
  // BR - BOMBEIROS (193)
  // =========================
  {
    id: "br_fire_incendio_apto_01",
    agency: "fire",
    region: "BR",
    title: "Incêndio em apartamento (fumaça densa)",
    baseSeverity: "grave",
    protocol: {
      required: ["addr", "people_inside", "smoke_fire"],
      questions: [
        {
          id: "addr",
          label: "Endereço",
          prompt: "Qual o endereço completo e andar/apartamento?",
          answer: "Rua Central, 500, bloco B, 8º andar, ap 82.",
          effect: { severity: "grave" }
        },
        {
          id: "smoke_fire",
          label: "Fogo/Fumaça",
          prompt: "Há fogo visível ou só fumaça? De onde vem?",
          answer: "Tem fumaça muito forte e chama na cozinha.",
          effect: { severity: "grave" }
        },
        {
          id: "people_inside",
          label: "Vítimas",
          prompt: "Tem gente presa no local? Alguém inalou fumaça?",
          answer: "Minha mãe está no quarto. Ela tosse muito.",
          effect: { severity: "grave" }
        },
        {
          id: "evac",
          label: "Orientação",
          prompt: "Evacue se possível. Se houver fumaça no corredor, feche portas e use pano úmido. Consegue fazer isso?",
          answer: "Vou tentar fechar a porta e ficar na janela.",
          effect: { severity: "grave" }
        }
      ]
    },
    dispatch: {
      correctRoles: ["fire_engine", "fire_rescue", "medic_ambulance"],
      allowedRoles: ["fire_engine", "fire_rescue", "medic_ambulance", "ladder_truck"]
    },
    hint: "Incêndio em prédio: AB + Resgate + Ambulância. Escada pode ajudar.",
  },

  {
    id: "br_fire_acidente_ferragens_01",
    agency: "fire",
    region: "BR",
    title: "Acidente com vítima presa nas ferragens",
    baseSeverity: "grave",
    protocol: {
      required: ["addr", "trapped", "bleeding"],
      questions: [
        {
          id: "addr",
          label: "Localização",
          prompt: "Onde ocorreu o acidente? Qual via e sentido?",
          answer: "Marginal, próximo à ponte. Sentido centro.",
          effect: { severity: "grave" }
        },
        {
          id: "trapped",
          label: "Vítima presa",
          prompt: "Tem alguém preso dentro do veículo? Porta travada? Consciência?",
          answer: "Sim, motorista preso. Está consciente, mas não consegue sair.",
          effect: { severity: "grave" }
        },
        {
          id: "bleeding",
          label: "Sangramento",
          prompt: "Há sangramento forte? Consegue comprimir com pano limpo sem mover a vítima?",
          answer: "Tem sangue no braço. Estou pressionando com uma camiseta.",
          effect: { severity: "grave" }
        },
        {
          id: "hazard",
          label: "Risco",
          prompt: "Há vazamento de combustível ou risco de incêndio?",
          answer: "Cheiro forte, parece vazando.",
          effect: { severity: "grave" }
        }
      ]
    },
    dispatch: {
      correctRoles: ["fire_rescue", "medic_ambulance", "fire_engine"],
      allowedRoles: ["fire_rescue", "medic_ambulance", "fire_engine", "hazmat"]
    },
    hint: "Resgate + Ambulância. AB para segurança (vazamento).",
  },

  {
    id: "br_fire_parto_01",
    agency: "fire",
    region: "BR",
    title: "Parto em andamento (contrações e coroando)",
    baseSeverity: "grave",
    protocol: {
      required: ["addr", "weeks", "crowning"],
      questions: [
        {
          id: "addr",
          label: "Endereço",
          prompt: "Qual o endereço completo? Quem pode abrir a porta para o resgate?",
          answer: "Rua Aurora, 90. Meu irmão vai abrir.",
          effect: { severity: "grave" }
        },
        {
          id: "weeks",
          label: "Tempo gestação",
          prompt: "Quantas semanas? Alguma complicação conhecida?",
          answer: "39 semanas. Sem complicações.",
          effect: { severity: "grave" }
        },
        {
          id: "crowning",
          label: "Coroando",
          prompt: "A cabeça do bebê já aparece? As contrações estão muito próximas?",
          answer: "Sim, está aparecendo. Muito rápido!",
          effect: { severity: "grave" }
        },
        {
          id: "guidance",
          label: "Orientação",
          prompt: "Oriente: local limpo, panos, não puxar o bebê. Confirma?",
          answer: "Ok, estou com toalhas e vou seguir.",
          effect: { severity: "grave" }
        }
      ]
    },
    dispatch: {
      correctRoles: ["medic_ambulance", "fire_rescue"],
      allowedRoles: ["medic_ambulance", "fire_rescue", "fire_engine"]
    },
    hint: "Parto: Ambulância + apoio de resgate. Instrução pré-chegada é essencial.",
  },

  // =========================
  // US - 911 (POLICE / FIRE)
  // =========================
  {
    id: "us_pol_active_threat_01",
    agency: "police",
    region: "US",
    title: "Active threat (shots heard nearby)",
    baseSeverity: "grave",
    protocol: {
      required: ["addr", "shots_confirmed", "suspects"],
      questions: [
        {
          id: "addr",
          label: "Address",
          prompt: "What is the exact address and cross street?",
          answer: "12 Maple Ave, near the gas station.",
          effect: { severity: "grave" }
        },
        {
          id: "shots_confirmed",
          label: "Shots",
          prompt: "Did you hear gunshots? How many? Any injuries seen?",
          answer: "Yes, multiple shots. I can't see injuries.",
          effect: { severity: "grave" }
        },
        {
          id: "suspects",
          label: "Suspect",
          prompt: "Any description of the suspect(s) or vehicle?",
          answer: "Dark hoodie, running toward the alley.",
          effect: { severity: "grave" }
        }
      ]
    },
    dispatch: {
      correctRoles: ["tactical_rota", "air_eagle", "area_patrol"],
      allowedRoles: ["tactical_rota", "air_eagle", "area_patrol", "civil_investigation"]
    },
    hint: "High risk. SWAT/air support if available + patrol.",
  },

  {
    id: "us_fire_choking_01",
    agency: "fire",
    region: "US",
    title: "Choking (cannot breathe)",
    baseSeverity: "grave",
    protocol: {
      required: ["addr", "breathing_status"],
      questions: [
        {
          id: "addr",
          label: "Address",
          prompt: "What is the exact address and unit number?",
          answer: "52 Pine Street, apartment 3B.",
          effect: { severity: "grave" }
        },
        {
          id: "breathing_status",
          label: "Breathing",
          prompt: "Is he able to cough or speak, or completely unable to breathe?",
          answer: "He can't speak or cough. He's grabbing his throat.",
          effect: { severity: "grave" }
        },
        {
          id: "conscious",
          label: "Conscious",
          prompt: "Is he conscious right now?",
          answer: "Yes, but panicking.",
          effect: { severity: "grave" }
        },
        {
          id: "first_aid",
          label: "First-aid",
          prompt: "Start abdominal thrusts (Heimlich). Are you able to do that now?",
          answer: "Yes, I'm doing it!",
          effect: { severity: "grave" }
        }
      ]
    },
    dispatch: {
      correctRoles: ["medic_ambulance", "fire_rescue"],
      allowedRoles: ["medic_ambulance", "fire_rescue", "fire_engine"]
    },
    hint: "Medical emergency. Ambulance + rescue. Provide instructions fast.",
  }
];