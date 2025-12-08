// Exemplos de dados para testes
// Use estes exemplos no formulário de cadastro

export const exemplosPlantacao = {
  // Exemplo 1: Tomate
  tomate: {
    name: "Tomate Cereja",
    genetic: "Híbrido F1",
    code: "TOM001",
    planting_date: "2024-12-01",
    substrate: "Terra",
    observations: "Plantado em vaso de 20L"
  },

  // Exemplo 2: Pimenta
  pimenta: {
    name: "Pimenta Jalapeño",
    genetic: "Capsicum annuum",
    code: "PIM001",
    planting_date: "2024-11-25",
    substrate: "Turfa e perlita",
    observations: "Germinação após 8 dias"
  },

  // Exemplo 3: Manjericão
  manjericao: {
    name: "Manjericão Roxo",
    genetic: "Ocimum basilicum purpurascens",
    code: "MAN001",
    planting_date: "2024-12-03",
    substrate: "Super solo",
    observations: "Para uso culinário"
  }
};

export const exemploRegistroDiario = {
  // Fase de Germinação
  germinacao: {
    record_date: "2024-12-05",
    temperature: 24.5,
    humidity: 65,
    observations: "Primeira folha emergindo"
  },

  // Fase de Muda
  muda: {
    record_date: "2024-12-05",
    plant_size: 5.2,
    leaf_count: 4,
    temperature: 23.8,
    humidity: 60,
    ppfd: 250,
    vpd: 0.9,
    observations: "Desenvolvimento saudável"
  },

  // Fase de Vegetação
  vegetacao: {
    record_date: "2024-12-05",
    plant_size: 25.5,
    leaf_count: 18,
    branch_count: 6,
    temperature: 26.0,
    humidity: 55,
    ppfd: 500,
    vpd: 1.1,
    fertilization: "NPK 10-10-10, 2ml/L",
    observations: "Crescimento acelerado, boa cor"
  },

  // Fase de Floração
  floracao: {
    record_date: "2024-12-05",
    plant_size: 45.0,
    leaf_count: 32,
    branch_count: 12,
    temperature: 25.5,
    humidity: 50,
    ppfd: 700,
    vpd: 1.3,
    fertilization: "Bloom Booster, 1.5ml/L",
    observations: "Primeiras flores aparecendo"
  }
};

// Valores de referência
export const valoresReferencia = {
  temperatura: {
    minima: 18,
    ideal_min: 22,
    ideal_max: 28,
    maxima: 32,
    unidade: "°C"
  },
  umidade: {
    minima: 30,
    ideal_min: 50,
    ideal_max: 70,
    maxima: 85,
    unidade: "%"
  },
  vpd: {
    germinacao: { min: 0.4, max: 0.8 },
    vegetacao: { min: 0.8, max: 1.2 },
    floracao: { min: 1.0, max: 1.5 },
    unidade: "kPa"
  },
  ppfd: {
    germinacao: { min: 100, max: 300 },
    muda: { min: 200, max: 400 },
    vegetacao: { min: 400, max: 600 },
    floracao: { min: 600, max: 900 },
    unidade: "μmol/m²/s"
  }
};

// Dicas de cultivo
export const dicasCultivo = [
  "Mantenha registros diários para identificar padrões",
  "VPD (Déficit de Pressão de Vapor) é calculado pela temperatura e umidade",
  "PPFD mede a quantidade de luz útil para fotossíntese",
  "Fotografe sempre do mesmo ângulo para comparar o crescimento",
  "Ajuste a fertilização baseado na fase da planta",
  "Monitore a cor das folhas - amareladas podem indicar deficiências",
  "Temperatura noturna 2-5°C menor que diurna é ideal",
  "Aumente gradualmente o PPFD conforme a planta cresce",
  "Mantenha pH entre 5.8-6.5 para melhor absorção de nutrientes",
  "Faça backup regular dos dados (use ./backup.sh)"
];
