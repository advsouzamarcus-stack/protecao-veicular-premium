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

function moedaBRL(valor) {
  if (valor === null || valor === undefined || valor === "") return null;

  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function separarMarcaModelo(marcaModelo) {
  if (!marcaModelo) {
    return { brand: null, model: null };
  }

  const texto = String(marcaModelo).trim();
  const partes = texto.split("/");

  if (partes.length >= 2) {
    return {
      brand: partes[0].trim() || null,
      model: partes.slice(1).join("/").trim() || null
    };
  }

  return {
    brand: null,
    model: texto || null
  };
}

function mapearRespostaFipeApi(dados) {
  const data = dados && dados.data ? dados.data : {};
  const veiculo = data.veiculo || {};
  const fipes = Array.isArray(data.fipes) ? data.fipes : [];
  const primeiraFipe = fipes[0] || {};
  const marcaModelo = separarMarcaModelo(veiculo.marca_modelo || primeiraFipe.marca_modelo);

  const vehicle = {
    plate: veiculo.placa || null,
    brand: primeiraFipe.marca || marcaModelo.brand || null,
    model: primeiraFipe.modelo || marcaModelo.model || null,
    year_manufacture: veiculo.ano ? String(veiculo.ano).split("/")[0] || null : null,
    year_model: veiculo.ano ? String(veiculo.ano).split("/")[1] || String(veiculo.ano).split("/")[0] || null : null,
    color: veiculo.cor || null,
    category: null,
    vehicle_type: veiculo.tipo_de_veiculo || null,
    fuel: veiculo.combustivel || null,
    city: veiculo.municipio || null,
    state: veiculo.uf || null,
    situacao_basica: null,
    restricoes_publicas: null
  };

  const fipe = {
    code: primeiraFipe.codigo || null,
    value: moedaBRL(primeiraFipe.valor),
    raw_value: primeiraFipe.valor || null,
    brand: primeiraFipe.marca || null,
    model: primeiraFipe.modelo || null,
    brand_model: primeiraFipe.marca_modelo || null,
    type: primeiraFipe.tipo || null,
    model_year_id: primeiraFipe.id_modelo_ano || null,
    reference_month: null,
    version_confirmed: fipes.length === 1,
    options_count: fipes.length,
    options: fipes.slice(0, 5).map((item) => ({
      code: item.codigo || null,
      value: moedaBRL(item.valor),
      raw_value: item.valor || null,
      brand: item.marca || null,
      model: item.modelo || null,
      brand_model: item.marca_modelo || null,
      model_year_id: item.id_modelo_ano || null
    }))
  };

  return { vehicle, fipe };
}

async function consultarFipeApiPorPlaca(placa) {
  const apiKey = process.env.FIPEAPI_KEY;
  const baseUrl = process.env.FIPEAPI_BASE_URL || "https://placas.fipeapi.com.br";

  if (!apiKey) {
    throw new Error("FIPEAPI_NOT_CONFIGURED");
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/placas/${encodeURIComponent(placa)}?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("FIPEAPI_UNAVAILABLE");
  }

  const dados = await response.json();
  return mapearRespostaFipeApi(dados);
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

    const { vehicle, fipe } = await consultarFipeApiPorPlaca(placa);

    return resposta(200, {
      success: true,
      source: "FipeAPI por placa",
      vehicle,
      fipe,
      warning: fipe.options_count > 1 ? "MULTIPLE_FIPE_VERSIONS" : null,
      privacy: {
        sensitive_data_removed: true,
        hidden_fields: [
          "chassi",
          "n_motor",
          "renavam",
          "proprietario",
          "cpf",
          "endereco"
        ]
      }
    });
  } catch (error) {
    if (error.message === "FIPEAPI_NOT_CONFIGURED") {
      return resposta(500, {
        success: false,
        error: "FIPEAPI_NOT_CONFIGURED",
        message: "Chave da FipeAPI nao configurada. Verifique a variavel FIPEAPI_KEY."
      });
    }

    if (error.message === "FIPEAPI_UNAVAILABLE") {
      return resposta(503, {
        success: false,
        error: "FIPEAPI_UNAVAILABLE",
        message: "Consulta FipeAPI indisponivel no momento."
      });
    }

    return resposta(500, {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Erro interno ao consultar veiculo."
    });
  }
};
