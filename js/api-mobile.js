var API = (function(){
  var SU, SK;
  var LAST_SYNC_KEY = 'f4m_last_sync';

  function init(){
    if(!SU){ SU=APP_CONFIG.SUPABASE_URL; SK=APP_CONFIG.SUPABASE_ANON_KEY; }
  }

  function isOnline(){ return navigator.onLine; }

  function tipoRilievo(r){
    var c=(r.codice_completo||r.tipo_rilievo||'').toUpperCase();
    if(c.indexOf('PORTE')>=0) return 'PORTE';
    if(c.indexOf('SERR')>=0)  return 'SERR';
    return r.tipo_rilievo||'SERR';
  }

  function sfetch(path, cb, eb){
    init();
    var x=new XMLHttpRequest();
    x.open('GET', SU+'/rest/v1/'+path, true);
    x.setRequestHeader('apikey', SK);
    x.setRequestHeader('Authorization', 'Bearer '+SK);
    x.onload=function(){
      if(x.status>=200&&x.status<300){ try{ cb(JSON.parse(x.responseText)); }catch(e){ eb(e); } }
      else eb('HTTP '+x.status);
    };
    x.onerror=function(){ eb('Rete'); };
    x.send();
  }

  function spost(path, data, method, cb, eb){
    init();
    var x=new XMLHttpRequest();
    x.open(method||'POST', SU+'/rest/v1/'+path, true);
    x.setRequestHeader('apikey', SK);
    x.setRequestHeader('Authorization', 'Bearer '+SK);
    x.setRequestHeader('Content-Type', 'application/json');
    x.setRequestHeader('Prefer', 'return=representation');
    x.onload=function(){
      if(x.status>=200&&x.status<300){ try{ cb(JSON.parse(x.responseText)); }catch(e){ cb([]); } }
      else eb('HTTP '+x.status+' '+x.responseText);
    };
    x.onerror=function(){ eb('Rete'); };
    x.send(JSON.stringify(data));
  }

  function jitteredAutoSync(onDone){
    var jitter=Math.floor(Math.random()*20000);
    setTimeout(function(){
      if(!isOnline()){ if(onDone) onDone('offline'); return; }
      processSyncQueue(function(){
        syncAll(null, function(err){
          localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
          if(onDone) onDone(err);
        });
      });
    }, jitter);
  }

  function hoursSinceLastSync(){
    var ts=localStorage.getItem(LAST_SYNC_KEY);
    return ts ? (Date.now()-parseInt(ts))/3600000 : Infinity;
  }

  function checkConflict(table, id, loadedAt, cb){
    if(!isOnline()){ cb(false); return; }
    sfetch(table+'?id=eq.'+id+'&select=updated_at', function(rows){
      if(!rows||!rows.length){ cb(false); return; }
      var serverTs=new Date(rows[0].updated_at||0).getTime();
      cb(serverTs > loadedAt);
    }, function(){ cb(false); });
  }

  function sanitizePayload(payload, table){
    var bools=['telaio_misto','solo_accessori','rimozione','rimozione_accessori',
               'taglio_marmo','angolari_pvc'];
    if(table==='posizioni_porte'){
      bools=bools.concat(['sopraluce','vetri','mostrine','allargamento_telaio',
        'fornitura_ctl_int','fornitura_ctl_bli','fornitura_ctl_rei',
        'install_ctl_int','install_ctl_bli','install_ctl_rei']);
    }
    bools.forEach(function(k){
      if(payload[k]===null||payload[k]===undefined) payload[k]=false;
      if(payload[k]==='SI'||payload[k]==='true') payload[k]=true;
      if(payload[k]==='NO'||payload[k]==='false') payload[k]=false;
    });
    Object.keys(payload).forEach(function(k){
      if(payload[k]===undefined) delete payload[k];
    });
    return payload;
  }

  function savePosizione(table, op, data, loadedAt, cb){
    if(!isOnline()){
      var stored=Object.assign({},data);
      if(op==='insert' && !stored.id){
        stored.id='local_'+Date.now()+'_'+Math.random().toString(36).substring(2,7);
      }
      addToSyncQueue(op, table, stored, function(){
        DBLocal.putOne(table, stored, function(){ cb(null, stored, false); });
      });
      return;
    }
    function doSave(){
      var method=op==='insert'?'POST':'PATCH';
      var path=table+(op!=='insert'?'?id=eq.'+data.id:'');
      var payload=sanitizePayload(Object.assign({},data), table);
      if(op==='insert'){ delete payload.id; }
      payload.updated_at=new Date().toISOString();
      spost(path, payload, method, function(res){
        var saved=Array.isArray(res)?res[0]:res;
        if(!saved || !saved.id){
          cb('Supabase ha restituito risposta vuota. Controlla RLS.', null, false);
          return;
        }
        DBLocal.putOne(table, saved, function(){ cb(null, saved, false); });
      }, function(err){
        cb('Errore server: '+err, null, false);
      });
    }
    if(op==='update'&&loadedAt){
      checkConflict(table, data.id, loadedAt, function(conflict){
        if(conflict){ cb('conflict', null, true); }
        else doSave();
      });
    } else {
      doSave();
    }
  }

  function syncAll(onProgress, onDone){
    var steps=[
      {label:'Clienti',         fn:syncClienti},
      {label:'Cantieri',        fn:syncCantieri},
      {label:'Rilievi',         fn:syncRilievi},
      {label:'Posizioni serr.', fn:syncPosizioniSerr},
      {label:'Posizioni porte', fn:syncPosizioniPorte},
      {label:'Capitoli',        fn:syncCapitoli},
      {label:'Stratigrafie',    fn:syncStratigrafie},
      {label:'DB Serramenti',   fn:syncDbSerramento},
      {label:'DB Porte',        fn:syncDbPorte},
      {label:'Configurazioni',  fn:syncLookups}
    ];
    var i=0;
    function next(){
      if(i>=steps.length){ onDone(null); return; }
      var s=steps[i++];
      if(onProgress) onProgress(s.label, i, steps.length);
      s.fn(function(err){ if(err){ onDone(err); return; } next(); });
    }
    next();
  }

  function syncClienti(cb){
    sfetch('clienti?stato=eq.attivo&select=*&order=nome.asc', function(r){
      DBLocal.putMany('clienti', r, function(){ cb(null); });
    }, function(e){ cb(e); });
  }
  function syncCantieri(cb){
    sfetch('cantieri?stato=eq.attivo&select=*&order=nome_cantiere.asc', function(r){
      DBLocal.putMany('cantieri', r, function(){ cb(null); });
    }, function(e){ cb(e); });
  }
  function syncRilievi(cb){
    sfetch('rilievi?select=*&order=created_at.desc', function(r){
      var norm=r.map(function(ril){ ril._tipo=tipoRilievo(ril); return ril; });
      DBLocal.putMany('rilievi', norm, function(){ cb(null); });
    }, function(e){ cb(e); });
  }
  function syncPosizioniSerr(cb){
    sfetch('posizioni_serr?stato=eq.attivo&select=*', function(r){
      DBLocal.putMany('posizioni_serr', r, function(){ cb(null); });
    }, function(e){ cb(e); });
  }
  function syncPosizioniPorte(cb){
    sfetch('posizioni_porte?stato=eq.attivo&select=*', function(r){
      DBLocal.putMany('posizioni_porte', r, function(){ cb(null); });
    }, function(e){ cb(e); });
  }
  function syncCapitoli(cb){
    sfetch('capitoli_rilievo?stato=eq.attivo&select=*', function(r){
      DBLocal.putMany('capitoli_rilievo', r, function(){ cb(null); });
    }, function(e){ cb(e); });
  }
  function syncStratigrafie(cb){
    sfetch('stratigrafie?stato=eq.attivo&select=*', function(r){
      DBLocal.putMany('stratigrafie', r, function(){ cb(null); });
    }, function(e){ cb(e); });
  }
  function syncDbSerramento(cb){
    sfetch('db_serramento?stato=eq.attivo&select=*', function(r){
      var withId=r.map(function(row,i){ if(!row.id) row.id='ds_'+i; return row; });
      DBLocal.clearStore('db_serramento',function(){
        DBLocal.putMany('db_serramento',withId,function(){ cb(null); });
      });
    }, function(e){ cb(e); });
  }
  function syncDbPorte(cb){
    sfetch('db_porte?stato=eq.attivo&select=*', function(r){
      var withId=r.map(function(row,i){ if(!row.id) row.id='dp_'+i; return row; });
      DBLocal.clearStore('db_porte',function(){
        DBLocal.putMany('db_porte',withId,function(){ cb(null); });
      });
    }, function(e){ cb(e); });
  }

  var LOOKUP_TABLES=[
    {name:'LK_PIANO',          path:'lk_piano?stato=eq.attivo&select=*&order=piano.asc'},
    {name:'LK_TIPO_SERR',      path:'lk_tipo_serr?stato=eq.attivo&select=*&order=id.asc'},
    {name:'LK_SENSI_APERTURA', path:'lk_sensi_apertura?stato=eq.attivo&select=*&order=sigla.asc'},
    {name:'LK_TIPO_FORO_SERR', path:'lk_tipo_foro_serr?stato=eq.attivo&select=*&order=sigla.asc'},
    {name:'LK_TIPO_FORO_PORTE',path:'lk_tipo_foro_porte?stato=eq.attivo&select=*&order=sigla.asc'},
    {name:'LK_SCHERMATURA',    path:'lk_schermatura?stato=eq.attivo&select=*&order=id.asc'},
    {name:'LK_CASSONETTO',     path:'lk_cassonetto?stato=eq.attivo&select=*&order=sigla.asc'},
    {name:'LK_CONTROTELAIO',   path:'lk_controtelaio?stato=eq.attivo&select=*&order=sigla.asc'},
    {name:'LK_ZANZARIERA',     path:'lk_zanzariera?stato=eq.attivo&select=*&order=sigla.asc'},
    {name:'LK_DINOXILL',       path:'lk_dinoxill?stato=eq.attivo&select=*&order=sigla.asc'},
    {name:'LK_COPRIFILI',      path:'lk_coprifili?stato=eq.attivo&select=*&order=materiale_sigla.asc'},
    {name:'LK_COLORI',         path:'lk_colori?select=*&order=colore_interno.asc'},
    {name:'LK_VETRO',          path:'lk_vetro?stato=eq.attivo&select=*'},
    {name:'LK_N_CAMPI',        path:'lk_n_campi?stato=eq.attivo&select=*&order=n_campi.asc'},
    {name:'LK_TIPO_PORTA',     path:'lk_tipo_porta?stato=eq.attivo&select=*&order=sigla.asc'},
    {name:'REGOLE_LATI',       path:'regole_lati?stato=eq.attivo&select=*'}
  ];

  function syncLookups(cb){
    var i=0;
    function next(){
      if(i>=LOOKUP_TABLES.length){ cb(null); return; }
      var lk=LOOKUP_TABLES[i++];
      sfetch(lk.path, function(rows){
        DBLocal.putLookup(lk.name, rows, function(){ next(); });
      }, function(){ next(); });
    }
    next();
  }

  function miniSync(table, cb){
    var map={
      'posizioni_serr': syncPosizioniSerr,
      'posizioni_porte': syncPosizioniPorte,
      'rilievi': syncRilievi,
      'cantieri': syncCantieri,
      'clienti': syncClienti
    };
    if(map[table]) map[table](cb||function(){});
    else if(cb) cb(null);
  }

  function addToSyncQueue(op, table, data, cb){
    DBLocal.addToQueue('sync_queue', {op:op, table:table, data:data, ts:Date.now()}, cb);
  }

  function processSyncQueue(onDone){
    DBLocal.getAll('sync_queue', function(items){
      if(!items.length){ onDone(null); return; }
      var i=0;
      function next(){
        if(i>=items.length){ onDone(null); return; }
        var item=items[i++];
        var method=item.op==='insert'?'POST':(item.op==='update'?'PATCH':'DELETE');
        var path=item.table+(item.op!=='insert'?'?id=eq.'+item.data.id:'');
        setTimeout(function(){
          spost(path, sanitizePayload(Object.assign({},item.data), item.table), method, function(){
            DBLocal.removeFromQueue('sync_queue', item._qid, next);
          }, function(err){
            console.error('sync queue error', err);
            next();
          });
        }, 300);
      }
      next();
    });
  }

  function writeRecord(op, table, data, cb){
    savePosizione(table, op, data, null, function(err, saved){
      if(err) cb(err); else cb(null, saved);
    });
  }

  function getStats(cb){
    DBLocal.getAll('clienti', function(cl){
      DBLocal.getAll('rilievi', function(ri){
        var nSerr=ri.filter(function(r){ return tipoRilievo(r)==='SERR'; }).length;
        var nPorte=ri.filter(function(r){ return tipoRilievo(r)==='PORTE'; }).length;
        cb({ clienti:cl.length, rilievi_serr:nSerr, rilievi_porte:nPorte, rilievi_tot:ri.length });
      });
    });
  }

  return {
    isOnline:           isOnline,
    tipoRilievo:        tipoRilievo,
    syncAll:            syncAll,
    jitteredAutoSync:   jitteredAutoSync,
    hoursSinceLastSync: hoursSinceLastSync,
    processSyncQueue:   processSyncQueue,
    miniSync:           miniSync,
    savePosizione:      savePosizione,
    checkConflict:      checkConflict,
    writeRecord:        writeRecord,
    getStats:           getStats
  };
})();
