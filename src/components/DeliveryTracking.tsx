import ConnectedPortal from "./ConnectedPortal";
// Compatibility entry: the archived demonstration is never a live data module.
export default function DeliveryTracking(_props:any){return <ConnectedPortal/>;}

export type DeliveryMeta={windowStart?:string;windowEnd?:string;eta?:string;driver?:string;lat?:number;lng?:number;events?:{status:string;time:string;message?:string}[];locations?:{lat:number;lng:number;time:string}[];signature?:string};
