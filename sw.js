const DB_NAME = 'rCountDB';
const STORE_NAME = 'failed-visits';

// IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, {keyPath:'id', autoIncrement:true});
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function saveFailed(request) {
  return openDB().then(db => {
    const tx = db.transaction(STORE_NAME,'readwrite');
    tx.objectStore(STORE_NAME).add({...request,time:Date.now()});
    return tx.complete;
  });
}

function getAllFailed() {
  return openDB().then(db => new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_NAME,'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all = store.getAll();
    all.onsuccess = ()=>resolve(all.result);
    all.onerror = e=>reject(e);
  }));
}

function deleteFailed(id){
  return openDB().then(db=>{
    const tx=db.transaction(STORE_NAME,'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    return tx.complete;
  });
}

// SW lifecycle
self.addEventListener('install', e=>self.skipWaiting());
self.addEventListener('activate', e=>self.clients.claim());

// Background sync
self.addEventListener('sync', e => {
  if(e.tag==='retry-visits') e.waitUntil(retryFailedRequests());
});

async function retryFailedRequests(){
  const failed = await getAllFailed();
  for(const req of failed){
    if(Date.now()-req.time > 60000){ await deleteFailed(req.id); continue;} // >1min
    try{
      const res = await fetch('https://rcount.onrender.com'+req.path, {method:'POST', headers:{'Content-Type':'application/json'}});
      if(res.ok) await deleteFailed(req.id);
    } catch(e){console.log('Retry failed',e);}
  }
}

// Receive failed request from page
self.addEventListener('message', e=>{
  if(e.data?.type==='storeFailed'){
    saveFailed(e.data.request);
  }
});
