import test from 'node:test';import assert from 'node:assert/strict';
import {onboardingState} from '../src/onboarding.mjs';
const ready={connected:true,userId:'a',profile:{id:'a'},loading:false,error:'',metabolic:null};
test('new account and imported manual base require explicit onboarding',()=>{
 assert.equal(onboardingState(ready),'required');
 assert.equal(onboardingState({...ready,metabolic:{mode:'manual',daily_calories:3200,onboarding_completed:false}}),'required');
});
test('explicit manual and calculator completion persist across login',()=>{
 for(const mode of ['manual','calculator'])assert.equal(onboardingState({...ready,metabolic:{mode,onboarding_completed:true}}),'complete');
});
test('never renders a diary or previous account data before setup is loaded',()=>{
 for(const patch of [{loading:true},{metabolic:undefined},{profile:{id:'b'}},{profile:undefined}])assert.equal(onboardingState({...ready,...patch}),'loading');
 assert.equal(onboardingState({...ready,error:'failed'}),'error');
 assert.equal(onboardingState({...ready,connected:false}),'inactive');
});
