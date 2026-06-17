function normalizarPlaca(placa) {
  return String(placa || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function placaValida(placa) {
  const p = normalizarPlaca(placa);
  return /^[A-Z]{3}[0-9]{4}$/.test(p) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p);
}

function resposta(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function filtrarDadosSensiveis(dados) {
  const fonte = Array.isArray(dados) ? dados[0] || {} : dados || {};

  return {
    plate: fonte.placa || fonte.plate || null,
    brand: fonte.marca || fonte.brand || null,
    model: fonte.modelo || fonte.model || null,
    year_manufacture: fonte.anoFabricacao || fonte.ano_fabricacao || fonte.year_manufacture || null,
    year_model: fonte.anoModelo || fonte.ano_modelo || fonte.year_model || null,
    color: fonte.cor || fonte.color || null,
    category: fonte.categoria || fonte.category || null,
    vehicle_type: fonte.tipoVeiculo || fonte.tipo_veiculo || fonte.especie || fonte.vehicle_type || null,
    fuel: fonte.combustivel || fonte.fuel || null,
    city: fonte.municipio || fonte.city || null,
    state: fonte.uf || fonte.state || null,
    situacao_basica: fonte.situacaoBasica || fonte.situacao_basica || null,
    restricoes_publicas: fonte.restricoesPublicas || fonte.restricoes_publicas || null
  };
}

async function obterTokenSerpro() {
  const tokenUrl = process.env.SERPRO_TOKEN_URL || "https://gateway.apiserpro.serpro.gov.br/token";
  const consumerKey = process.env.SERPRO_CONSUMER_KEY;
  const consumerSecret = process.env.SERPRO_CONSUMER_SECRET;
  const accessTokenManual = process.env.SERPRO_ACCESS_TOKEN;

  if (accessTokenManual) {
    return accessTokenManual;
  }

  if (!consumerKey || !consumerSecret) {
    throw new Error("SERPRO_AUTH_NOT_CONFIGURED");
  }

  const basicToken = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicToken}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error("SERPRO_TOKEN_ERROR");
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("SERPRO_TOKEN_ERROR");
  }

  return data.access_token;
}

async function consultarSerproSenatran(placa) {
  const baseUrl = process.env.SERPRO_VEHICLE_BASE_URL || process.env.SERPRO_BASE_URL;
  const pathTemplate = process.env.SERPRO_VEHICLE_PATH || "/veiculos/placa/{placa}";

  if (!baseUrl) {
    throw new Error("SERPRO_ENDPOINT_NOT_CONFIGURED");
  }

  const token = await obterTokenSerpro();
  const path = pathTemplate.replace("{placa}", encodeURIComponent(placa));
  const endpoint = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("SENATRAN_UNAVAILABLE");
  }

  return response.json();
}

async function consultarFipe(vehicle) {
  // A consulta FIPE depende da correspondencia entre marca, modelo, ano e versao.
  // Este ponto esta preparado para integrar BrasilAPI, API FIPE ou outro provedor contratado.
  // Se houver multiplas versoes compativeis, retorne MULTIPLE_FIPE_VERSIONS para o assistente pedir confirmacao ao cliente.
  return {
    code: null,
    value: null,
    reference_month: null,
    version_confirmed: false,
    warning: "FIPE_MATCH_REQUIRED"
  };
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return resposta(200, { success: true });
  }

  if (event.httpMethod !== "POST") {
    return resposta(405, {
      success: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Use POST."
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const placa = normalizarPlaca(body.placa);
    const consentimento = body.consentimento === true;

    if (!consentimento) {
      return resposta(403, {
        success: false,
        error: "CONSENT_REQUIRED",
        message: "E necessario consentimento do cliente antes da consulta."
      });
    }

    if (!placaValida(placa)) {
      return resposta(400, {
        success: false,
        error: "INVALID_PLATE",
        message: "Placa em formato invalido."
      });
    }

    const dadosSerpro = await consultarSerproSenatran(placa);
    const vehicle = filtrarDadosSensiveis(dadosSerpro);
    const fipe = await consultarFipe(vehicle);

    return resposta(200, {
      success: true,
      source: "SERPRO/SENATRAN + FIPE",
      vehicle,
      fipe,
      privacy: {
        sensitive_data_removed: true
      }
    });
  } catch (error) {
    const errosConfiguracao = [
      "SERPRO_AUTH_NOT_CONFIGURED",
      "SERPRO_ENDPOINT_NOT_CONFIGURED"
    ];

    if (errosConfiguracao.includes(error.message)) {
      return resposta(500, {
        success: false,
        error: error.message,
        message: "Configuracao SERPRO/SENATRAN incompleta. Verifique variaveis de ambiente."
      });
    }

    if (error.message === "SERPRO_TOKEN_ERROR") {
      return resposta(502, {
        success: false,
        error: "SERPRO_TOKEN_ERROR",
        message: "Falha ao autenticar no gateway SERPRO."
      });
    }

    if (error.message === "SENATRAN_UNAVAILABLE") {
      return resposta(503, {
        success: false,
        error: "SENATRAN_UNAVAILABLE",
        message: "Consulta veicular indisponivel no momento."
      });
    }

    return resposta(500, {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Erro interno ao consultar veiculo."
    });
  }
};
