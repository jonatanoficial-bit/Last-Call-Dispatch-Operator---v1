// data/calls.js
// Banco simples de chamadas. Expansível.
// Cada chamada tem: título, texto, gravidade, tags, unidades recomendadas por cidade/agência.

window.CALLS = [
  // TROTES
  {
    id: "trote_001",
    title: "Criança rindo",
    severity: "trote",
    text: "Oi... hahaha... tem um dinossauro aqui! Hahaha!",
    tags: ["trote"],
    recommended: {
      police: [],
      fire: []
    }
  },

  // LEVES
  {
    id: "leve_001",
    title: "Som alto",
    severity: "leve",
    text: "Meu vizinho está com som alto faz horas e não quer abaixar.",
    tags: ["perturbacao"],
    recommended: {
      police: ["sp_area", "ny_patrol", "ny_sheriff"],
      fire: []
    }
  },

  // MÉDIOS
  {
    id: "medio_001",
    title: "Briga na rua",
    severity: "medio",
    text: "Tem duas pessoas brigando aqui na rua, parece que vai piorar!",
    tags: ["conflito"],
    recommended: {
      police: ["sp_area", "sp_choque", "ny_patrol"],
      fire: []
    }
  },
  {
    id: "medio_002",
    title: "Acidente sem vítima presa",
    severity: "medio",
    text: "Teve uma batida aqui, tem gente machucada mas ninguém preso nas ferragens.",
    tags: ["acidente"],
    recommended: {
      police: ["sp_area", "ny_patrol"],
      fire: ["sp_ambulancia", "sp_resgate", "ny_ems"]
    }
  },

  // GRAVES (polícia)
  {
    id: "grave_001",
    title: "Assalto armado em andamento",
    severity: "grave",
    text: "Tem um homem armado roubando a loja agora! Ele tá ameaçando todo mundo!",
    tags: ["crime", "arma"],
    recommended: {
      police: ["sp_rota", "sp_choque", "ny_swat"],
      fire: []
    }
  },
  {
    id: "grave_002",
    title: "Mochila suspeita",
    severity: "grave",
    text: "Tem uma mochila abandonada e alguém falou que pode ser bomba.",
    tags: ["bomba"],
    recommended: {
      police: ["sp_gate", "ny_fbi", "ny_swat"],
      fire: []
    }
  },

  // GRAVES (bombeiros)
  {
    id: "grave_003",
    title: "Incêndio em residência",
    severity: "grave",
    text: "Minha cozinha está pegando fogo! Tem fumaça por todo lado!",
    tags: ["incendio"],
    recommended: {
      police: [],
      fire: ["sp_abo", "ny_engine", "ny_ladder"]
    }
  },
  {
    id: "grave_004",
    title: "Vítima presa nas ferragens",
    severity: "grave",
    text: "Um carro capotou e tem uma pessoa presa nas ferragens! Tá gritando de dor!",
    tags: ["acidente", "ferragens"],
    recommended: {
      police: ["sp_area", "ny_patrol"],
      fire: ["sp_resgate", "sp_ambulancia", "ny_ems", "ny_ladder"]
    }
  }
];