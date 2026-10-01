/**
 * Apps Script ISOLADO — só faz uma coisa: recebe uma imagem em base64
 * (enviada pelo botão "Atualizar Imagem" do painel) e grava sempre no
 * mesmo caminho do repositório GitHub via API de Contents.
 *
 * Não tem NENHUMA relação com o Apps Script da planilha. Crie isto como
 * um projeto novo em https://script.google.com (New Project), não dentro
 * do projeto existente.
 *
 * ===================== CONFIGURAÇÃO (fazer uma vez) =====================
 * 1) Extensões/Configurações do projeto (ícone de engrenagem) → "Propriedades
 *    do script" → adicionar propriedade:
 *       chave: GITHUB_TOKEN
 *       valor: <seu token fine-grained do GitHub>
 *
 *    Como criar o token:
 *    github.com → foto de perfil → Settings → Developer settings →
 *    Personal access tokens → Fine-grained tokens → Generate new token
 *      - Resource owner: report-apisul
 *      - Repository access: Only select repositories → bloqueios
 *      - Permissions: Contents → Read and write
 *      - Expiration: escolha o prazo que preferir (pode renovar depois)
 *    Copie o token (só aparece uma vez) e cole na propriedade acima.
 *
 * 2) Implantar → Nova implantação → tipo "Aplicativo da Web"
 *      - Executar como: Eu (sua conta)
 *      - Quem pode acessar: Qualquer pessoa
 *    Copie a URL /exec gerada e cole em CLIMATE_IMAGE_UPLOAD_URL no
 *    index.html do site.
 *
 * Sempre que editar este código, "Gerenciar implantações" → editar a
 * implantação existente → Nova versão (a URL /exec não muda).
 * ==========================================================================
 */

// Precisa ser o MESMO hash já usado no index.html (ADMIN_PIN_HASH).
// Não é o token do GitHub — é só a trava do "Modo Edição" do site.
var ADMIN_PIN_HASH = '74660a2c47392aa8061ed2e3e3f7f995c8839565f56a7cc3e92dae3626f6036d';

var GITHUB_OWNER = 'report-apisul';
var GITHUB_REPO = 'bloqueios';
var GITHUB_BRANCH = 'main';
var GITHUB_PATH = 'assets/imagens/relatorio.jpeg'; // sempre o mesmo arquivo

function doPost(e) {
  var response;
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.action === 'uploadClimateImage') {
      if (!verifyPin_(body.pin)) {
        response = { status: 'error', message: 'PIN inválido.' };
      } else {
        response = uploadImageToGithub_(body.imageBase64);
      }
    } else if (body.action === 'updateSiteConfig') {
      if (!verifyPin_(body.pin)) {
        response = { status: 'error', message: 'PIN inválido.' };
      } else {
        response = updateConfigOnGithub_(body.config);
      }
    } else {
      response = { status: 'error', message: 'Ação desconhecida: ' + body.action };
    }
  } catch (err) {
    response = { status: 'error', message: 'Erro interno: ' + err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function verifyPin_(pin) {
  var raw = String(pin || '');
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  var hash = digest.map(function (b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
  return hash === ADMIN_PIN_HASH;
}

function uploadImageToGithub_(imageBase64) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    return { status: 'error', message: 'GITHUB_TOKEN não configurado nas Propriedades do Script.' };
  }
  if (!imageBase64) {
    return { status: 'error', message: 'Nenhuma imagem recebida.' };
  }

  // Remove o prefixo "data:image/jpeg;base64," se vier junto.
  var base64Content = String(imageBase64).split(',').pop();

  var apiUrl = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + GITHUB_PATH;
  var headers = {
    Authorization: 'token ' + token,
    'User-Agent': 'apisul-bloqueios-image-uploader',
    Accept: 'application/vnd.github+json'
  };

  // 1) Descobre o sha atual do arquivo (obrigatório para sobrescrever um
  //    arquivo já existente; se não existir ainda, sha fica null e o
  //    GitHub cria o arquivo pela primeira vez).
  var sha = null;
  try {
    var getResp = UrlFetchApp.fetch(apiUrl + '?ref=' + GITHUB_BRANCH, {
      headers: headers,
      muteHttpExceptions: true
    });
    if (getResp.getResponseCode() === 200) {
      sha = JSON.parse(getResp.getContentText()).sha;
    }
  } catch (err) {
    // segue sem sha — GitHub vai tratar como criação de arquivo novo
  }

  var payload = {
    message: 'Atualiza imagem de análise climática via painel do site',
    content: base64Content,
    branch: GITHUB_BRANCH
  };
  if (sha) payload.sha = sha;

  var putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = putResp.getResponseCode();
  if (code === 200 || code === 201) {
    return { status: 'success' };
  }
  return {
    status: 'error',
    message: 'GitHub respondeu ' + code + ': ' + putResp.getContentText()
  };
}

function updateConfigOnGithub_(configData) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    return { status: 'error', message: 'GITHUB_TOKEN não configurado nas Propriedades do Script.' };
  }
  if (!configData) {
    return { status: 'error', message: 'Nenhuma configuração recebida.' };
  }

  var configJsonStr = typeof configData === 'string' ? configData : JSON.stringify(configData, null, 2);
  var base64Content = Utilities.base64Encode(configJsonStr, Utilities.Charset.UTF_8);

  var apiUrl = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/config.json';
  var headers = {
    Authorization: 'token ' + token,
    'User-Agent': 'apisul-bloqueios-config-updater',
    Accept: 'application/vnd.github+json'
  };

  var sha = null;
  try {
    var getResp = UrlFetchApp.fetch(apiUrl + '?ref=' + GITHUB_BRANCH, {
      headers: headers,
      muteHttpExceptions: true
    });
    if (getResp.getResponseCode() === 200) {
      sha = JSON.parse(getResp.getContentText()).sha;
    }
  } catch (err) {
    // segue sem sha
  }

  var payload = {
    message: 'Atualiza visibilidade de seções (config.json) via painel do site',
    content: base64Content,
    branch: GITHUB_BRANCH
  };
  if (sha) payload.sha = sha;

  var putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = putResp.getResponseCode();
  if (code === 200 || code === 201) {
    return { status: 'success' };
  }
  return {
    status: 'error',
    message: 'GitHub respondeu ' + code + ': ' + putResp.getContentText()
  };
}

