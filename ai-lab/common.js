// shared helpers for the simulations
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(r){let u=0,v=0;while(u===0)u=r();while(v===0)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function $(id){return document.getElementById(id)}
function cv(id,w,h){const c=$(id),d=window.devicePixelRatio||1;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.scale(d,d);return [c,x]}
