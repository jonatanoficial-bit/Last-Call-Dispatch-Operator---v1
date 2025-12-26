// data/calls.js
// severities: "trote" | "leve" | "medio" | "grave"
window.CALLS = [
  // ===== TROTES =====
  {
    id: "prank_pizza_01",
    title: "Pedido de pizza no 190/911",
    severity: "trote",
    text: "Oi… vocês entregam pizza aí? É que tô com fome e queria pedir uma grande.",
    recommended: { police: [], fire: [] }
  },
  {
    id: "prank_laugh_01",
    title: "Trote com risadas e desligam",
    severity: "trote",
    text: "Hahaha… corre aqui rápido… ah não, nada não! (risadas) *desliga*",
    recommended: { police: [], fire: [] }
  },

  // ===== LEVES =====
  {
    id: "br_noise_01",
    title: "Perturbação do sossego",
    severity: "leve",
    text: "Meu vizinho está com som alto faz horas. Já pedi pra baixar e ele ignorou.",
    recommended: { police: ["sp_pm_area","df_pm_area","ny_patrol","ldn_patrol","tk_patrol","au_patrol","za_patrol"] }
  },
  {
    id: "lost_child_01",
    title: "Criança perdida em local público",
    severity: "leve",
    text: "Perdi meu filho por alguns minutos no shopping. Estou na entrada principal.",
    recommended: { police: ["sp_pm_area","df_pm_area","ny_patrol","ldn_patrol","tk_patrol","au_patrol","za_patrol"] }
  },

  // ===== MÉDIAS =====
  {
    id: "robbery_suspect_01",
    title: "Suspeito rondando residência",
    severity: "medio",
    text: "Tem um homem olhando dentro das casas aqui na rua. Ele está tentando abrir o portão do vizinho.",
    recommended: { police: ["sp_pm_area","df_pm_area","ny_patrol","ldn_patrol","tk_patrol","au_patrol","za_patrol","ny_k9"] }
  },
  {
    id: "domestic_01",
    title: "Violência doméstica (gritos e objetos quebrando)",
    severity: "medio",
    text: "Estou ouvindo gritos no apartamento ao lado e barulho de coisas quebrando. Parece agressão.",
    recommended: { police: ["sp_pm_area","df_pm_area","ny_patrol","ldn_patrol","tk_patrol","au_patrol","za_patrol"] }
  },
  {
    id: "traffic_injury_01",
    title: "Acidente de trânsito com feridos",
    severity: "medio",
    text: "Dois carros bateram e tem gente machucada. Um está sangrando e não consegue levantar.",
    recommended: {
      police: ["sp_pm_area","df_pm_area","ny_patrol","ldn_patrol","au_patrol","za_patrol"],
      fire: ["sp_usa","sp_ar","df_amb","df_resg","fd_ems","fd_rescue","ldn_ems","au_amb","za_ems","za_rescue","tk_amb","tk_rescue"]
    }
  },
  {
    id: "kitchen_smoke_01",
    title: "Fumaça em apartamento (cozinha)",
    severity: "medio",
    text: "Tem fumaça saindo da cozinha do meu vizinho. O alarme disparou e ninguém atende.",
    recommended: { fire: ["sp_ab","df_ab","fd_engine","ldn_pump","tk_engine","au_engine","za_engine"] }
  },
  {
    id: "elevator_trap_01",
    title: "Pessoa presa no elevador",
    severity: "medio",
    text: "Estou preso no elevador entre andares. Estou com falta de ar e tem uma criança aqui também.",
    recommended: { fire: ["sp_ar","sp_salv","df_resg","fd_rescue","ldn_rescue","tk_rescue","au_rescue","za_rescue"] }
  },

  // ===== GRAVES =====
  {
    id: "armed_robbery_01",
    title: "Assalto em andamento (arma visível)",
    severity: "grave",
    text: "Tem um assalto acontecendo agora na loja. Eu estou escondido e ele está armado!",
    recommended: {
      police: ["sp_rota","sp_choque","df_bopec","ny_esu","ldn_armed","au_sog","za_tactical","tk_tactical"]
    }
  },
  {
    id: "shots_fired_01",
    title: "Disparos / tiros próximos",
    severity: "grave",
    text: "Acabei de ouvir vários tiros na esquina. Tem gente correndo e gritando, parece muito sério.",
    recommended: {
      police: ["sp_rota","sp_choque","df_bopec","ny_esu","ldn_armed","au_sog","za_tactical","tk_tactical","sp_aguia","ny_heli","df_aereo"]
    }
  },
  {
    id: "bomb_threat_01",
    title: "Suspeita de bomba / objeto suspeito",
    severity: "grave",
    text: "Tem uma mochila abandonada e uns fios aparecendo. As pessoas estão se afastando, parece bomba.",
    recommended: {
      police: ["sp_gate","ny_bomb","ldn_ct"],
      fire: ["sp_haz","fd_haz","ldn_rescue","za_rescue"]
    }
  },
  {
    id: "building_fire_01",
    title: "Incêndio com pessoas no prédio",
    severity: "grave",
    text: "O prédio está pegando fogo e tem gente gritando na janela. Tem fumaça preta subindo rápido!",
    recommended: {
      fire: ["sp_ab","sp_salv","df_ab","fd_engine","fd_ladder","fd_rescue","ldn_pump","ldn_rescue","tk_engine","au_engine","za_engine"]
    }
  },
  {
    id: "choking_01",
    title: "Engasgo (não consegue respirar)",
    severity: "grave",
    text: "Meu pai está engasgado! Ele não consegue falar e está ficando roxo!",
    recommended: { fire: ["sp_usa","df_amb","fd_ems","ldn_ems","tk_amb","au_amb","za_ems"] }
  },
  {
    id: "cardiac_01",
    title: "Parada cardíaca (inconsciente)",
    severity: "grave",
    text: "Uma pessoa caiu no chão e não responde. Não sei se está respirando!",
    recommended: { fire: ["sp_usa","df_amb","fd_ems","ldn_ems","tk_amb","au_amb","za_ems"] }
  }
];