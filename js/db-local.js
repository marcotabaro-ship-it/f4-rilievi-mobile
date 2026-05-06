var DBLocal = (function(){
  var DB_NAME = 'f4_mobile_db';
  var DB_VER  = 1;
  var db = null;

  var STORES = [
    'clienti','cantieri','rilievi',
    'posizioni_serr','posizioni_porte',
    'capitoli_rilievo','stratigrafie',
    'sync_queue','foto_queue'
  ];

  function open(cb){
    if(db){ cb(db); return; }
    var req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = function(e){
      var d = e.target.result;
      STORES.forEach(function(s){
        if(!d.objectStoreNames.contains(s)){
          var store = d.createObjectStore(s, {keyPath:'id'});
          if(s==='sync_queue') store = d.createObjectStore(s, {keyPath:'_qid', autoIncrement:true});
          if(s==='foto_queue') store = d.createObjectStore(s, {keyPath:'_fqid', autoIncrement:true});
        }
      });
    };
    req.onsuccess = function(e){ db=e.target.result; cb(db); };
    req.onerror = function(e){ console.error('IndexedDB error',e); cb(null); };
  }

  function getAll(storeName, cb){
    open(function(d){
      if(!d){ cb([]); return; }
      var tx = d.transaction(storeName,'readonly');
      var req = tx.objectStore(storeName).getAll();
      req.onsuccess = function(){ cb(req.result||[]); };
      req.onerror = function(){ cb([]); };
    });
  }

  function getById(storeName, id, cb){
    open(function(d){
      if(!d){ cb(null); return; }
      var tx = d.transaction(storeName,'readonly');
      var req = tx.objectStore(storeName).get(id);
      req.onsuccess = function(){ cb(req.result||null); };
      req.onerror = function(){ cb(null); };
    });
  }

  function putMany(storeName, items, cb){
    open(function(d){
      if(!d||!items.length){ if(cb)cb(); return; }
      var tx = d.transaction(storeName,'readwrite');
      var store = tx.objectStore(storeName);
      items.forEach(function(item){ store.put(item); });
      tx.oncomplete = function(){ if(cb)cb(); };
      tx.onerror = function(e){ console.error('putMany error',e); if(cb)cb(); };
    });
  }

  function putOne(storeName, item, cb){
    putMany(storeName, [item], cb);
  }

  function deleteOne(storeName, id, cb){
    open(function(d){
      if(!d){ if(cb)cb(); return; }
      var tx = d.transaction(storeName,'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = function(){ if(cb)cb(); };
    });
  }

  function clearStore(storeName, cb){
    open(function(d){
      if(!d){ if(cb)cb(); return; }
      var tx = d.transaction(storeName,'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = function(){ if(cb)cb(); };
    });
  }

  function addToQueue(storeName, item, cb){
    open(function(d){
      if(!d){ if(cb)cb(); return; }
      var tx = d.transaction(storeName,'readwrite');
      var req = tx.objectStore(storeName).add(item);
      req.onsuccess = function(){ if(cb)cb(req.result); };
      req.onerror = function(){ if(cb)cb(null); };
    });
  }

  function removeFromQueue(storeName, key, cb){
    open(function(d){
      if(!d){ if(cb)cb(); return; }
      var tx = d.transaction(storeName,'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = function(){ if(cb)cb(); };
    });
  }

  return {
    getAll:          getAll,
    getById:         getById,
    putMany:         putMany,
    putOne:          putOne,
    deleteOne:       deleteOne,
    clearStore:      clearStore,
    addToQueue:      addToQueue,
    removeFromQueue: removeFromQueue
  };
})();
