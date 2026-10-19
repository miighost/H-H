import {CeoDeliverySummary} from './DeliveryTracking';
import desktop from '../../private/ceo-desktop.html?raw';
export default function CeoDesktop(){
 return <main className="ceo-shell"><div className="ceo-access-bar"><a href="/">HORN & HARVEST</a><span>CEO Intelligence &amp; Growth · V3.3.3 · DEMO</span><a href="/operations">Master Operations Blueprint</a></div><p className="ops-notice">Testing demo · No sign-in required · Use sample information only. Records stay in this browser.</p><CeoDeliverySummary/><iframe title="Horn & Harvest CEO Intelligence and Growth Desktop V3.3.3" srcDoc={desktop} sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-forms"/></main>;
}
