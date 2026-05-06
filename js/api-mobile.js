var API = (function(){
  var SU, SK;

  function init(){
    if(!SU){ SU=APP_CONFIG.SUPABASE_URL; SK=APP_CONFIG.SUPABASE_ANON_KEY; }
  }

  function isOnline(){ return navigator.onLine; }

  function tipoRilievo(r){
    var c = (r.codice_completo||r.tipo_rilievo||'').toUpperCase();
    if(c.indexOf('PORTE')>=0) return 'PORTE';
    if(c.indexOf('SERR')>=0)  return 'SERR';
    return r.tipo_rilievo || 'SERR';
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

  function syncAll(onProgress, onDone){
    var steps=[
      {label:'Clienti',         fn:syncClienti},
      {label:'Cantieri',        fn:syncCantieri},
      {label:'Rilievi',         fn:syncRilievi},
      {label:'Posizioni serr.', fn:syncPosizioniSerr},
      {label:'Posizioni porte', fn:syncPosizioniPorte},
      {label:'Capitoli',        fn:syncCapitoli}
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
      // normalizza tipo_rilievo da codice_completo
      var norm = r.map(function(ril){
        ril._tipo = tipoRilievo(ril);
        return ril;
      });
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

  function addToSyncQueue(op, table, data, cb){
    DBLocal.addToQueue('sync_queue', {
      op:op, table:table, data:data, ts:Date.now()
    }, cb);
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
        spost(path, item.data, method, function(){
          DBLocal.removeFromQueue('sync_queue', item._qid, next);
        }, function(err){
          console.error('sync queue error', err);
          next();
        });
      }
      next();
    });
  }

  function writeRecord(op, table, data, cb){
    if(isOnline()){
      var method=op==='insert'?'POST':(op==='update'?'PATCH':'DELETE');
      var path=table+(op!=='insert'?'?id=eq.'+data.id:'');
      spost(path, data, method, function(res){
        var saved=Array.isArray(res)?res[0]:res;
        DBLocal.putOne(table, saved||data, function(){ cb(null, saved||data); });
      }, function(){
        addToSyncQueue(op, table, data, function(){
          DBLocal.putOne(table, data, function(){ cb(null, data); });
        });
      });
    } else {
      addToSyncQueue(op, table, data, function(){
        DBLocal.putOne(table, data, function(){ cb(null, data); });
      });
    }
  }

  function getStats(cb){
    DBLocal.getAll('clienti', function(cl){
      DBLocal.getAll('rilievi', function(ri){
        var nSerr  = ri.filter(function(r){ return tipoRilievo(r)==='SERR'; }).length;
        var nPorte = ri.filter(function(r){ return tipoRilievo(r)==='PORTE'; }).length;
        cb({ clienti:cl.length, rilievi_serr:nSerr, rilievi_porte:nPorte, rilievi_tot:ri.length });
      });
    });
  }

  return {
    isOnline:         isOnline,
    tipoRilievo:      tipoRilievo,
    syncAll:          syncAll,
    processSyncQueue: processSyncQueue,
    writeRecord:      writeRecord,
    getStats:         getStats
  };
})();
