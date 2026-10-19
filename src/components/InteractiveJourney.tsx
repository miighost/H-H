import {useState} from 'react';
export default function InteractiveJourney({language='en'}:{language?:'so'|'en'}){
 const [step,setStep]=useState(0);const so=language==='so';
 const steps=so?[
 ['Dooro','Miraha bislaaday ayaa la doortaa, lana hubiyaa ka hor diyaarinta.'],
 ['Diyaari','Miraha waa la dhaqaa, la diiraa, lana jarjaraa iyadoo nadaafadda la ilaalinayo.'],
 ['Qalaji','Miraha la diyaariyey ayaa la qalajiyaa. Waqtigu wuxuu ku xiran yahay nooca miraha iyo diyaarinta.'],
 ['Baakadee','Miraha qalalan waa la hubiyaa, la miisaamaa, kadibna baakadka la xiraa.'],
 ['Gaarsii','Dalabka waa la diyaariyaa, la diraa, lana xaqiijiyaa marka macmiilku helo.']
 ]:[
 ['Select','Ripe fruit is selected and inspected before preparation.'],
 ['Prepare','Fruit is washed, peeled and sliced with careful attention to hygiene.'],
 ['Naturally dry','Prepared fruit is naturally dried. Timing depends on the fruit and its preparation.'],
 ['Pack','Dried fruit is checked, weighed and sealed in its pouch.'],
 ['Deliver','Orders are prepared and dispatched, with receipt confirmed on delivery.']
 ];
 return <div className="journey-interactive"><div className="journey-controls" aria-label={so?'Marxaladaha diyaarinta':'Production stages'}>{steps.map(([title],i)=><button type="button" key={title} aria-pressed={i===step} onClick={()=>setStep(i)}><small>0{i+1}</small>{title}</button>)}</div><div className="journey-description" aria-live="polite"><h3>{steps[step][0]}</h3><p>{steps[step][1]}</p></div></div>;
}
