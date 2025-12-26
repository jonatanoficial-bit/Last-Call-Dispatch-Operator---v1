// data/cities.js
// NUNCA renomeie para Cities.js (GitHub Pages diferencia maiúsculas).
window.CITIES = [
  {
    id: "br_sp",
    name: "🇧🇷 São Paulo (Simulação)",
    greetingPolice: "190, Polícia Militar. Qual sua emergência?",
    greetingFire: "193, Bombeiros. Qual sua emergência?",
    units: {
      police: [
        { id: "sp_pm_area", name: "PM Área (VTR)", role: "patrol" },
        { id: "sp_rota", name: "ROTA", role: "tactical" },
        { id: "sp_choque", name: "Choque", role: "riot" },
        { id: "sp_gate", name: "GATE (Antibomba)", role: "bomb" },
        { id: "sp_aguia", name: "Águia (Helicóptero)", role: "air" },
        { id: "sp_civil", name: "Polícia Civil (Investigação)", role: "investigation" }
      ],
      fire: [
        { id: "sp_ab", name: "Auto Bomba (AB)", role: "fire" },
        { id: "sp_ar", name: "Auto Resgate (AR)", role: "rescue" },
        { id: "sp_usa", name: "USA (Ambulância)", role: "ems" },
        { id: "sp_salv", name: "Salvamento", role: "special_rescue" },
        { id: "sp_haz", name: "Produtos Perigosos", role: "hazmat" }
      ]
    }
  },

  {
    id: "br_df",
    name: "🇧🇷 Brasília (DF)",
    greetingPolice: "190, Polícia Militar do DF. Qual sua emergência?",
    greetingFire: "193, Corpo de Bombeiros do DF. Qual sua emergência?",
    units: {
      police: [
        { id: "df_pm_area", name: "PMDF Área (VTR)", role: "patrol" },
        { id: "df_bopec", name: "BOPE (Operações Especiais)", role: "tactical" },
        { id: "df_aereo", name: "Apoio Aéreo", role: "air" }
      ],
      fire: [
        { id: "df_ab", name: "AB (Auto Bomba)", role: "fire" },
        { id: "df_resg", name: "Resgate", role: "rescue" },
        { id: "df_amb", name: "Ambulância", role: "ems" }
      ]
    }
  },

  {
    id: "us_nyc",
    name: "🇺🇸 New York (911)",
    greetingPolice: "911, what's your emergency?",
    greetingFire: "911, fire/EMS. What's the address of the emergency?",
    units: {
      police: [
        { id: "ny_patrol", name: "NYPD Patrol", role: "patrol" },
        { id: "ny_esu", name: "NYPD ESU", role: "tactical" },
        { id: "ny_k9", name: "NYPD K9", role: "k9" },
        { id: "ny_bomb", name: "Bomb Squad", role: "bomb" },
        { id: "ny_heli", name: "Aviation Unit", role: "air" },
        { id: "ny_fbi", name: "FBI Liaison", role: "federal" }
      ],
      fire: [
        { id: "fd_engine", name: "FDNY Engine", role: "fire" },
        { id: "fd_ladder", name: "FDNY Ladder", role: "fire_support" },
        { id: "fd_rescue", name: "FDNY Rescue", role: "special_rescue" },
        { id: "fd_haz", name: "FDNY HazMat", role: "hazmat" },
        { id: "fd_ems", name: "FDNY EMS Ambulance", role: "ems" }
      ]
    }
  },

  {
    id: "eu_ldn",
    name: "🇪🇺 London (112/999)",
    greetingPolice: "999, police. What's your emergency?",
    greetingFire: "999, fire and rescue. What's the address?",
    units: {
      police: [
        { id: "ldn_patrol", name: "Met Police Response", role: "patrol" },
        { id: "ldn_armed", name: "ARV (Armed Response)", role: "tactical" },
        { id: "ldn_ct", name: "Counter Terror", role: "federal" }
      ],
      fire: [
        { id: "ldn_pump", name: "Fire Engine (Pump)", role: "fire" },
        { id: "ldn_rescue", name: "Urban Search & Rescue", role: "special_rescue" },
        { id: "ldn_ems", name: "Ambulance", role: "ems" }
      ]
    }
  },

  {
    id: "jp_tokyo",
    name: "🇯🇵 Tokyo (110/119)",
    greetingPolice: "110, police. What is your emergency?",
    greetingFire: "119, fire/ambulance. What is the address?",
    units: {
      police: [
        { id: "tk_patrol", name: "Kōban Patrol", role: "patrol" },
        { id: "tk_sit", name: "Special Investigation Team", role: "investigation" },
        { id: "tk_tactical", name: "Tactical Unit", role: "tactical" }
      ],
      fire: [
        { id: "tk_engine", name: "Fire Engine", role: "fire" },
        { id: "tk_rescue", name: "Rescue Unit", role: "rescue" },
        { id: "tk_amb", name: "Ambulance", role: "ems" }
      ]
    }
  },

  {
    id: "au_syd",
    name: "🇦🇺 Sydney (000)",
    greetingPolice: "000, do you need Police, Fire or Ambulance?",
    greetingFire: "000, Fire and Rescue. What's the location?",
    units: {
      police: [
        { id: "au_patrol", name: "NSW Police (General Duties)", role: "patrol" },
        { id: "au_sog", name: "SOG (Tactical)", role: "tactical" }
      ],
      fire: [
        { id: "au_engine", name: "Fire & Rescue Engine", role: "fire" },
        { id: "au_rescue", name: "Rescue", role: "rescue" },
        { id: "au_amb", name: "Ambulance", role: "ems" }
      ]
    }
  },

  {
    id: "za_jhb",
    name: "🇿🇦 Johannesburg (112/10111)",
    greetingPolice: "10111, police. What is your emergency?",
    greetingFire: "Emergency services. What is the location?",
    units: {
      police: [
        { id: "za_patrol", name: "SAPS Patrol", role: "patrol" },
        { id: "za_tactical", name: "Tactical Response", role: "tactical" }
      ],
      fire: [
        { id: "za_engine", name: "Fire Engine", role: "fire" },
        { id: "za_ems", name: "Ambulance", role: "ems" },
        { id: "za_rescue", name: "Rescue", role: "rescue" }
      ]
    }
  }
];