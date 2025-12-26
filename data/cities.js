// data/cities.js
// Definição simples de cidades (expansível futuramente).
// No futuro: incluir mapa real. Agora: afeta unidades e flavor do atendimento.

window.CITIES = [
  {
    id: "sp",
    name: "São Paulo (BR)",
    greetingPolice: "190, Polícia Militar. Qual sua emergência?",
    greetingFire: "193, Corpo de Bombeiros. Qual sua emergência?",
    units: {
      police: [
        { id: "sp_area", name: "Polícia de Área", role: "Atendimento padrão / ocorrências leves e médias" },
        { id: "sp_rota", name: "ROTA", role: "Crimes violentos / assalto armado / alto risco" },
        { id: "sp_choque", name: "Choque", role: "Tumulto / risco coletivo / reforço tático" },
        { id: "sp_gate", name: "GATE", role: "Artefato explosivo / ameaça de bomba" }
      ],
      fire: [
        { id: "sp_abo", name: "Auto Bomba", role: "Incêndio urbano / combate ao fogo" },
        { id: "sp_resgate", name: "Resgate", role: "Acidentes / vítimas presas / salvamento" },
        { id: "sp_ambulancia", name: "Ambulância", role: "Emergências médicas / transporte" }
      ]
    }
  },
  {
    id: "usa_ny",
    name: "New York (USA)",
    greetingPolice: "911, what's your emergency?",
    greetingFire: "911, Fire/Medical. What's your emergency?",
    units: {
      police: [
        { id: "ny_patrol", name: "Patrol Unit", role: "Resposta padrão / ocorrências leves e médias" },
        { id: "ny_swat", name: "SWAT", role: "Alto risco / refém / arma de fogo" },
        { id: "ny_sheriff", name: "Sheriff Unit", role: "Suporte / áreas específicas / cumprimento" },
        { id: "ny_fbi", name: "FBI (Federal)", role: "Ameaça federal / terrorismo / casos especiais" }
      ],
      fire: [
        { id: "ny_engine", name: "Engine Company", role: "Incêndio / primeira resposta" },
        { id: "ny_ladder", name: "Ladder Company", role: "Resgate / altura / ventilação" },
        { id: "ny_ems", name: "EMS Ambulance", role: "Emergências médicas" }
      ]
    }
  }
];