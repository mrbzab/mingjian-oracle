import type { ZiweiResult, QimenResult } from './metaphysics.ts';
export function resolveZiweiDate(birthDate:string, year:number, picked:string|null) {
  if(picked === '' || picked?.startsWith(year+'-')) return picked;
  const midyear=year+'-07-01';
  return birthDate.startsWith(year+'-') && birthDate > midyear ? birthDate : midyear;
}
export function matchingZiwei(snapshot:{birthKey:string;data:ZiweiResult}|null,birthKey:string,date:string,algorithm:string) {
  return snapshot?.birthKey===birthKey && snapshot.data.horoscope?.date===date && snapshot.data.input.algorithm===algorithm ? snapshot.data : null;
}
export function matchingQimen(snapshot:QimenResult|null,time:string) {
  return time && snapshot?.time.slice(0,16)===time.slice(0,16) ? snapshot : null;
}
