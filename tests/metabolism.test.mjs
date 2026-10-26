import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateMetabolism} from '../src/metabolism.mjs';
test('Unimed male coefficients and all activity factors, rounding only after multiplication',()=>{
 for(const [activity,factor,daily] of [['none',1.25,2223],['moderate',1.35,2400],['intense',1.45,2578]])assert.deepEqual(calculateMetabolism({sex:'male',weight:75,height:175,age:28,activity}),{basal:1778,daily,factor});
});
test('Unimed female coefficients including original height coefficient 1.7',()=>{
 for(const [activity,factor,daily] of [['none',1.2,1702],['moderate',1.3,1844],['intense',1.4,1986]])assert.deepEqual(calculateMetabolism({sex:'female',weight:65,height:165,age:30,activity}),{basal:1419,daily,factor});
});
test('invalid or missing inputs never yield a suggested base',()=>{
 const valid={sex:'male',weight:75,height:175,age:28,activity:'moderate'};
 for(const patch of [{sex:''},{activity:''},{weight:NaN},{height:0},{age:17},{age:28.5},{weight:401},{height:Infinity}])assert.equal(calculateMetabolism({...valid,...patch}),null);
});
