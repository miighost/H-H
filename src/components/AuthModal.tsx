import ConnectedPortal from "./ConnectedPortal";
// Compatibility entry: the archived demonstration is never a live data module.
export default function AuthModal(_props:any){return <ConnectedPortal/>;}

export const normalizeForCompare=(phone:string,defaultCode="252")=>{const value=phone.trim().replace(/\D/g,"").replace(/^0/,"");return value.startsWith(defaultCode)?value:defaultCode+value;};
