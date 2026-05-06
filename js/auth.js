var Auth = (function () {
  var SESSION_KEY = 'f4_rilievi_session';
  var SUPA_URL = null;
  var SUPA_KEY = null;

  function _initConfig() {
    if (!SUPA_URL && typeof APP_CONFIG !== 'undefined') {
      SUPA_URL = APP_CONFIG.SUPABASE_URL;
      SUPA_KEY = APP_CONFIG.SUPABASE_ANON_KEY;
    }
  }

  function _fetch(path, cb, eb) {
    _initConfig();
    var x = new XMLHttpRequest();
    x.open('GET', SUPA_URL + '/rest/v1/' + path, true);
    x.setRequestHeader('apikey', SUPA_KEY);
    x.setRequestHeader('Authorization', 'Bearer ' + SUPA_KEY);
    x.onload = function () {
      if (x.status >= 200 && x.status < 300) {
        try { cb(JSON.parse(x.responseText)); } catch (e) { eb(e); }
      } else { eb('HTTP ' + x.status); }
    };
    x.onerror = function () { eb('Rete'); };
    x.send();
  }

  function _fetchPost(path, data, method, cb, eb) {
    _initConfig();
    var x = new XMLHttpRequest();
    x.open(method || 'POST', SUPA_URL + '/rest/v1/' + path, true);
    x.setRequestHeader('apikey', SUPA_KEY);
    x.setRequestHeader('Authorization', 'Bearer ' + SUPA_KEY);
    x.setRequestHeader('Content-Type', 'application/json');
    x.setRequestHeader('Prefer', 'return=representation');
    x.onload = function () {
      if (x.status >= 200 && x.status < 300) {
        try { cb(JSON.parse(x.responseText)); } catch (e) { cb([]); }
      } else { eb('HTTP ' + x.status + ' - ' + x.responseText); }
    };
    x.onerror = function () { eb('Rete'); };
    x.send(JSON.stringify(data));
  }

  function saveSession(u) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch (e) {}
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function requireLogin() {
    var u = getSession();
    if (!u) { window.location.href = 'login.html'; return null; }
    return u;
  }

  function getUser() {
    return getSession();
  }

  function getToken() {
    _initConfig();
    return SUPA_KEY;
  }

  function isAdmin() {
    var u = getSession();
    return u && (u.ruolo === 'administrator' || u.ruolo === 'admin');
  }

  function populateUserUI() {
    var u = getSession();
    if (!u) return;
    var el = document.getElementById('userDisplayName');
    if (el) el.textContent = u.nome || u.email || 'Utente';
    var av = document.getElementById('userAvatar');
    if (av) av.textContent = u.sigla || (u.nome ? u.nome.substring(0,2).toUpperCase() : 'U');
  }

  function logout() {
    clearSession();
    window.location.href = 'login.html';
  }

  function login(email, password, cb) {
    _fetch(
      'utenti?email=eq.' + encodeURIComponent(email) + '&stato=eq.attivo&select=*&limit=1',
      function (rows) {
        if (!rows.length) { cb(false, 'Utente non trovato o disattivo.'); return; }
        var u = rows[0];
        if (u.password !== password) { cb(false, 'Password errata.'); return; }
        var session = {
          id: u.id,
          nome: u.nome,
          email: u.email,
          ruolo: u.ruolo,
          sigla: u.sigla,
          reparto: u.reparto,
          stato: u.stato
        };
        saveSession(session);
        cb(true, session);
      },
      function (e) { cb(false, 'Errore di rete: ' + e); }
    );
  }

  function loginByNome(nome, reparto, password, cb) {
    _fetch(
      'utenti?nome=eq.' + encodeURIComponent(nome) + '&reparto=eq.' + encodeURIComponent(reparto) + '&stato=eq.attivo&select=*&limit=1',
      function (rows) {
        if (!rows.length) { cb(false, 'Utente non trovato o disattivo.'); return; }
        var u = rows[0];
        if (u.password !== password) { cb(false, 'Password errata.'); return; }
        var session = {
          id: u.id,
          nome: u.nome,
          email: u.email,
          ruolo: u.ruolo,
          sigla: u.sigla,
          reparto: u.reparto,
          stato: u.stato
        };
        saveSession(session);
        cb(true, session);
      },
      function (e) { cb(false, 'Errore di rete: ' + e); }
    );
  }

  function getReparti(cb) {
    _fetch(
      'utenti?stato=eq.attivo&select=reparto&order=reparto.asc',
      function (rows) {
        var reparti = [];
        rows.forEach(function (r) {
          if (r.reparto && reparti.indexOf(r.reparto) === -1) reparti.push(r.reparto);
        });
        reparti.sort();
        cb(reparti);
      },
      function () { cb([]); }
    );
  }

  function getUtentiByReparto(reparto, cb) {
    _fetch(
      'utenti?reparto=eq.' + encodeURIComponent(reparto) + '&stato=eq.attivo&select=id,nome,email,sigla&order=nome.asc',
      function (rows) { cb(rows); },
      function () { cb([]); }
    );
  }

  function getAllUtenti(cb) {
    _fetch(
      'utenti?select=*&order=nome.asc',
      function (rows) { cb(rows); },
      function () { cb([]); }
    );
  }

  function createUtente(data, cb, eb) {
    _fetchPost('utenti', data, 'POST', cb, eb);
  }

  function updateUtente(id, data, cb, eb) {
    _initConfig();
    var x = new XMLHttpRequest();
    x.open('PATCH', SUPA_URL + '/rest/v1/utenti?id=eq.' + id, true);
    x.setRequestHeader('apikey', SUPA_KEY);
    x.setRequestHeader('Authorization', 'Bearer ' + SUPA_KEY);
    x.setRequestHeader('Content-Type', 'application/json');
    x.setRequestHeader('Prefer', 'return=representation');
    x.onload = function () {
      if (x.status >= 200 && x.status < 300) {
        try { cb(JSON.parse(x.responseText)); } catch (e) { cb([]); }
      } else { eb('HTTP ' + x.status + ' - ' + x.responseText); }
    };
    x.onerror = function () { eb('Rete'); };
    x.send(JSON.stringify(data));
  }

  return {
    requireLogin:       requireLogin,
    getUser:            getUser,
    getToken:           getToken,
    isAdmin:            isAdmin,
    populateUserUI:     populateUserUI,
    logout:             logout,
    login:              login,
    loginByNome:        loginByNome,
    getReparti:         getReparti,
    getUtentiByReparto: getUtentiByReparto,
    getAllUtenti:        getAllUtenti,
    createUtente:       createUtente,
    updateUtente:       updateUtente
  };
})();
