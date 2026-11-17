// Synchronous SHA-256 permits checking immutable legacy branches inside one IDB transaction.
const primes=[];for(let n=2;primes.length<64;n++){if(!primes.some(p=>p*p<=n&&n%p===0))primes.push(n);}
const K=primes.map(p=>(Math.cbrt(p)%1*2**32)>>>0),H=primes.slice(0,8).map(p=>(Math.sqrt(p)%1*2**32)>>>0);
const rotr=(v,n)=>(v>>>n)|(v<<(32-n));
export function sha256(text){
 const raw=text instanceof Uint8Array?text:new TextEncoder().encode(text),length=Math.ceil((raw.length+9)/64)*64,bytes=new Uint8Array(length);bytes.set(raw);bytes[raw.length]=128;
 const view=new DataView(bytes.buffer);view.setUint32(length-8,Math.floor(raw.length/0x20000000));view.setUint32(length-4,(raw.length*8)>>>0);
 const hash=H.slice(),w=new Uint32Array(64);
 for(let offset=0;offset<length;offset+=64){
  for(let i=0;i<16;i++)w[i]=view.getUint32(offset+i*4);
  for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(rotr(a,7)^rotr(a,18)^(a>>>3))+w[i-7]+(rotr(b,17)^rotr(b,19)^(b>>>10)))>>>0;}
  let [a,b,c,d,e,f,g,h]=hash;
  for(let i=0;i<64;i++){const t=(h+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,u=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h=g;g=f;f=e;e=(d+t)>>>0;d=c;c=b;b=a;a=(t+u)>>>0;}
  [a,b,c,d,e,f,g,h].forEach((v,i)=>hash[i]=(hash[i]+v)>>>0);
 }
 return hash.map(v=>v.toString(16).padStart(8,'0')).join('');
}
