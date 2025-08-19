const FAILED_QUEUE='failed-visits';

self.addEventListener('install',event=>self.skipWaiting());
self.addEventListener('activate',event=>self.clients.claim());

self.addEventListener('sync',event=>{
  if(event.tag==='retry-visits')event.waitUntil(retryFailedRequests());
});

async function retryFailedRequests(){
  const reqStr=localStorage.getItem('failedRequest');
  if(!reqStr)return;
  const req=JSON.parse(reqStr);
  if(Date.now()-req.time>60000){localStorage.removeItem('failedRequest');return;} // >1min
  try{
    const res=await fetch(req.url,{method:'POST',headers:{'Content-Type':'application/json'}});
    if(res.ok)localStorage.removeItem('failedRequest');
  }catch(e){console.log('Retry failed',e);}
}

self.addEventListener('message',event=>{
  if(event.data?.type==='storeFailed'){
    localStorage.setItem('failedRequest',JSON.stringify({...event.data.request,time:Date.now()}));
  }
});
