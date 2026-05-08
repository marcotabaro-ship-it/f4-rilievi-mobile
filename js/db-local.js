var DBLocal = (function(){
  var DB_NAME = 'f4_mobile_db';
  var DB_VER  = 4;
  var db = null;

  function open(cb){
    if(db){ cb(db); return; }
    var req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = function(e){
      var d = e.target.result;
      var DATA_STORES = ['clienti','cantieri','rilievi','posizioni_serr','posizioni_porte',
        'capitoli_rilievo','stratigrafie','db_serramento','db_porte'];
      DATA_STORES.forEach(function(s){
        if(!d.objectStoreNames.contains(s)) d.createObjectStore(s, {keyPath:'id'});
      });
      if(!d.objectStoreNames.contains('sync_queue'))
        d.createObjectStore('sync_queue', {keyPath:'_qid', autoIncrement:true});
      if(!d.objectStoreNames.contains('foto_queue'))
        d.createObjectStore('foto_queue', {keyPath:'_fqid', autoIncrement:true});
      // v4: store unificato per tutti i lookup
      if(!d.objectStoreNames.contains('lookups'))
        d.createObjectStore('lookups', {keyPath:'name'});
    };
    req.onsuccess = function(e){ db=e.target.result; cb(db); };
    req.onerror   = function(e){ console.error('IndexedDB error',e); cb(null); };
    req.onblocked = function(e){ console.error('IndexedDB blocked',e); cb(null); };
  }

  function getAll(storeName, cb){
    open(function(d){
      if(!d){ cb([]); return; }
      try{
        var tx  = d.transaction(storeName,'readonly');
        var req = tx.objectStore(storeName).getAll();
        req.onsuccess = function(){ cb(req.result||[]); };
        req.onerror   = function(){ cb([]); };
      }catch(e){ console.error('getAll error',e,storeName); cb([]); }
    });
  }

  function getById(storeName, id, cb){
    open(function(d){
      if(!d){ cb(null); return; }
      try{
        var tx  = d.transaction(storeName,'readonly');
        var req = tx.objectStore(storeName).get(id);
        req.onsuccess = function(){ cb(req.result||null); };
        req.onerror   = function(){ cb(null); };
      }catch(e){ cb(null); }
    });
  }

  function putMany(storeName, items, cb){
    open(function(d){
      if(!d||!items||!items.length){ if(cb)cb(); return; }
      try{
        var tx    = d.transaction(storeName,'readwrite');
        var store = tx.objectStore(storeName);
        items.forEach(function(item){ store.put(item); });
        tx.oncomplete = function(){ if(cb)cb(); };
        tx.onerror    = function(e){ console.error('putMany error',e); if(cb)cb(); };
      }catch(e){ console.error('putMany exception',e); if(cb)cb(); }
    });
  }

  function putOne(storeName, item, cb){ putMany(storeName, [item], cb); }

  function deleteOne(storeName, id, cb){
    open(function(d){
      if(!d){ if(cb)cb(); return; }
      try{
        var tx = d.transaction(storeName,'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = function(){ if(cb)cb(); };
        tx.onerror    = function(){ if(cb)cb(); };
      }catch(e){ if(cb)cb(); }
    });
  }

  function clearStore(storeName, cb){
    open(function(d){
      if(!d){ if(cb)cb(); return; }
      try{
        var tx = d.transaction(storeName,'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = function(){ if(cb)cb(); };
        tx.onerror    = function(){ if(cb)cb(); };
      }catch(e){ if(cb)cb(); }
    });
  }

  function addToQueue(storeName, item, cb){
    open(function(d){
      if(!d){ if(cb)cb(); return; }
      try{
        var tx  = d.transaction(storeName,'readwrite');
        var req = tx.objectStore(storeName).add(item);
        req.onsuccess = function(){ if(cb)cb(req.result); };
        req.onerror   = function(){ if(cb)cb(null); };
      }catch(e){ if(cb)cb(null); }
    });
  }

  function removeFromQueue(storeName, key, cb){
    open(function(d){
      if(!d){ if(cb)cb(); return; }
      try{
        var tx = d.transaction(storeName,'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = function(){ if(cb)cb(); };
        tx.onerror    = function(){ if(cb)cb(); };
      }catch(e){ if(cb)cb(); }
    });
  }

  // ── LOOKUP HELPERS ──
  function putLookup(name, data, cb){
    putOne('lookups', {name:name, data:data, ts:Date.now()}, cb);
  }

  function getLookup(name, cb){
    getById('lookups', name, function(rec){ cb(rec ? rec.data : []); });
  }

  function deleteDB(cb){
    db = null;
    var req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = function(){ if(cb)cb(); };
    req.onerror   = function(){ if(cb)cb(); };
  }

  return {
    getAll:          getAll,
    getById:         getById,
    putMany:         putMany,
    putOne:          putOne,
    deleteOne:       deleteOne,
    clearStore:      clearStore,
    addToQueue:      addToQueue,
    removeFromQueue: removeFromQueue,
    putLookup:       putLookup,
    getLookup:       getLookup,
    deleteDB:        deleteDB
  };
})();
