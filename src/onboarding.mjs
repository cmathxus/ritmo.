export function onboardingState({connected,userId,profile,metabolic,loading,error}){
 if(!connected||!userId)return 'inactive';
 if(error)return 'error';
 if(loading||!profile||profile.id!==userId||metabolic===undefined)return 'loading';
 return metabolic?.onboarding_completed===true?'complete':'required';
}
