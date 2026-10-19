export async function authorizeCeo(request, options = {}) {
 const fetcher = options.fetcher || fetch;
 const apiKey = options.apiKey;
 const projectId = options.projectId || 'hornandharvest';
 const authorisedEmail = (options.authorisedEmail || 'info@hornandharvest.com').toLowerCase();
 const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
 if (!token) return 401;
 if (!apiKey) return 503;
 try {
  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  if(payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}` || payload.exp <= Date.now()/1000) return 401;
  const response = await fetcher(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(10000)});
  if(!response.ok) return 401;
  const {users} = await response.json(); const user=users?.[0];
  return user && !user.disabled && user.emailVerified && user.email?.toLowerCase()===authorisedEmail && user.localId===payload.sub ? 200 : 403;
 } catch { return 401; }
}
