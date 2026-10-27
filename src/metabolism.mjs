// Coefficients and activity factors from the calculator linked in the form.
export function calculateMetabolism({sex,weight,height,age,activity,method='unimed',pal=NaN}) {
  if(!['male','female'].includes(sex)||!['unimed','pal'].includes(method)||method==='unimed'&&!['none','moderate','intense'].includes(activity)||method==='pal'&&(!Number.isFinite(pal)||pal<1.4||pal>2.4)||!Number.isFinite(weight)||weight<20||weight>400||!Number.isFinite(height)||height<100||height>250||!Number.isInteger(age)||age<18||age>120) return null;
  const basal=sex==='male'?66+13.7*weight+5*height-6.8*age:655+9.6*weight+1.7*height-4.7*age;
  const factor=method==='pal'?pal:(sex==='male'?{none:1.25,moderate:1.35,intense:1.45}:{none:1.2,moderate:1.3,intense:1.4})[activity];
  if(basal<=0) return null;
  return {basal:Math.round(basal),daily:Math.round(basal*factor),factor};
}
