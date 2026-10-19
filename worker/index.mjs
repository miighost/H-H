// Optional edge adapter. All business API calls use the same managed Node service.
export default {async fetch(request,env){const url=new URL(request.url);
 if(url.pathname.startsWith('/private/')||url.pathname.startsWith('/server/')||url.pathname.startsWith('/archive/'))return new Response('Not found',{status:404});
 if(url.pathname==='/api/ceo/desktop')return Response.redirect(new URL('/ceo',url),303);
 if(url.pathname.startsWith('/api/')){if(!env.OPERATIONS_API_ORIGIN)return Response.json({error:'Configure OPERATIONS_API_ORIGIN to the managed Node service.'},{status:503});const upstream=new URL(env.OPERATIONS_API_ORIGIN);if(upstream.protocol!=='https:')return Response.json({error:'HTTPS operations API origin required.'},{status:503});upstream.pathname=url.pathname;upstream.search=url.search;const headers=new Headers(request.headers);headers.delete('host');headers.delete('x-forwarded-for');return fetch(new Request(upstream,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual'}));}
 let response=await env.ASSETS.fetch(request);if(response.status===404&&!url.pathname.split('/').pop().includes('.'))response=await env.ASSETS.fetch(new Request(new URL('/index.html',url),request));return response;
}};
