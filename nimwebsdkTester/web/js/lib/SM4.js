!function(t,r){"object"==typeof exports&&"object"==typeof module?module.exports=r():"function"==typeof define&&define.amd?define([],r):"object"==typeof exports?exports.SM4=r():t.SM4=r()}(self,(function(){return(()=>{"use strict";var t={};return(()=>{var r=t;function e(t,r){return(255&t[r])<<24|(255&t[r+1])<<16|(255&t[r+2])<<8|255&t[r+3]}function n(t,r,e){r[e]=255&t>>24,r[e+1]=255&t>>16,r[e+2]=255&t>>8,r[e+3]=255&t}function o(t,r,e=32){return t<<(r%=e)|t>>>e-r}Object.defineProperty(r,"__esModule",{value:!0}),r.rc4_decrypt=r.rc4_encrypt=r.uint8ArrayToHex=r.uint8ArrayToString=r.stringToUint8Array=r.stringToByte=r.sm4_setkey_dec=r.sm4_setkey_enc=r.sm4_crypt_ecb=r.SM4Ctx=void 0,r.SM4Ctx=class{constructor(){this.mode=1,this.sk=[],this.isPadding=!0}};var i=[214,144,233,254,204,225,61,183,22,182,20,194,40,251,44,5,43,103,154,118,42,190,4,195,170,68,19,38,73,134,6,153,156,66,80,244,145,239,152,122,51,84,11,67,237,207,172,98,228,179,28,169,201,8,232,149,128,223,148,250,117,143,63,166,71,7,167,252,243,115,23,186,131,89,60,25,230,133,79,168,104,107,129,178,113,100,218,139,248,235,15,75,112,86,157,53,30,36,14,94,99,88,209,162,37,34,124,59,1,33,120,135,212,0,70,87,159,211,39,82,76,54,2,231,160,196,200,158,234,191,138,210,64,199,56,181,163,247,242,206,249,97,21,161,224,174,93,164,155,52,26,85,173,147,50,48,245,140,177,227,29,246,226,46,130,102,202,96,192,41,35,171,13,83,78,111,213,219,55,69,222,253,142,47,3,255,106,114,109,108,91,81,141,27,175,146,187,221,188,127,17,217,92,65,31,16,90,216,10,193,49,136,165,205,123,189,45,116,208,18,184,229,180,176,137,105,151,74,12,150,119,126,101,185,241,9,197,110,198,132,24,240,125,236,58,220,77,32,121,238,95,62,215,203,57,72],s=[462357,472066609,943670861,1415275113,1886879365,2358483617,2830087869,3301692121,3773296373,4228057617,404694573,876298825,1347903077,1819507329,2291111581,2762715833,3234320085,3705924337,4177462797,337322537,808926789,1280531041,1752135293,2223739545,2695343797,3166948049,3638552301,4110090761,269950501,741554753,1213159005,1684763257],u=[2746333894,1453994832,1736282519,2993693404];function a(t){return i[255&t]}function f(t,r){var i,f,l,c,h=new Array(4),y=new Array(36),d=0;for(h[0]=e(r,0),h[1]=e(r,4),h[2]=e(r,8),h[3]=e(r,12),y[0]=h[0]^u[0],y[1]=h[1]^u[1],y[2]=h[2]^u[2],y[3]=h[3]^u[3];d<32;d++)y[d+4]=y[d]^(i=y[d+1]^y[d+2]^y[d+3]^s[d],void 0,void 0,c=void 0,l=new Uint8Array(4),c=new Uint8Array(4),n(i,l,0),c[0]=a(l[0]),c[1]=a(l[1]),c[2]=a(l[2]),c[3]=a(l[3]),(f=e(c,0))^o(f,13)^o(f,23)),t[d]=y[d+4]}function l(t,r,i){var s,u,f,l,c,h,y,d,g,p=0,v=new Array(36);for(v[0]=e(r,0),v[1]=e(r,4),v[2]=e(r,8),v[3]=e(r,12);p<32;)v[p+4]=(s=v[p],u=v[p+1],f=v[p+2],l=v[p+3],c=t[p],h=void 0,y=void 0,d=void 0,g=void 0,s^(h=u^f^l^c,d=new Uint8Array(4),g=new Uint8Array(4),n(h,d,0),g[0]=a(d[0]),g[1]=a(d[1]),g[2]=a(d[2]),g[3]=a(d[3]),(y=e(g,0))^o(y,2)^o(y,10)^o(y,18)^o(y,24))),p++;n(v[35],i,0),n(v[34],i,4),n(v[33],i,8),n(v[32],i,12)}function c(t,r){var e;if(1==r){var n=16-t.length%16;(e=new Uint8Array(t.length+n)).set(t),e.fill(n,t.length)}else e=t.subarray(0,t.length-t[t.length-1]);return e}r.sm4_setkey_enc=function(t,r){t.mode=1,f(t.sk,r)},r.sm4_setkey_dec=function(t,r){null==t&&Error("ctx is null!"),null!=r&&16==r.length||Error("key error!"),t.mode=0,f(t.sk,r),t.sk=t.sk.reverse()},r.sm4_crypt_ecb=function(t,r,e){e||(e={}),e.shiftStart||(e.shiftStart=0),t.isPadding&&1==t.mode&&(r=c(r,1));var n,o,i=r.length;1==t.mode?(n=0,o=e.shiftStart):(n=e.shiftStart,o=0);for(var s=new Uint8Array(i+o-n),u=0;u<i-n;u+=16){var a=new Uint8Array(r.buffer,u+n,16),f=new Uint8Array(s.buffer,u+o,16);l(t.sk,a,f)}return t.isPadding&&0==t.mode&&(s=c(s,0)),s},r.stringToByte=function(t){var r,e,n=new Array;r=t.length;for(var o=0;o<r;o++)(e=t.charCodeAt(o))>=65536&&e<=1114111?(n.push(e>>18&7|240),n.push(e>>12&63|128),n.push(e>>6&63|128),n.push(63&e|128)):e>=2048&&e<=65535?(n.push(e>>12&15|224),n.push(e>>6&63|128),n.push(63&e|128)):e>=128&&e<=2047?(n.push(e>>6&31|192),n.push(63&e|128)):n.push(255&e);return n},r.stringToUint8Array=function(t){var r=new Uint8Array(t.length);for(let e=0;e<t.length;e++)r[e]=t.charCodeAt(e);return r},r.uint8ArrayToString=function(t){let r="";for(let e=0;e<t.length;e++)r+=String.fromCharCode(t[e]);return r},r.uint8ArrayToHex=function(t){let r="";for(let e=0;e<t.length;e++)r+=t[e].toString(16).padStart(2,"0");return r},r.rc4_encrypt=(t,r,e)=>t.length&&r.length?h(t,r,e.shiftStart):null,r.rc4_decrypt=(t,r,e)=>t.length&&r.length?h(t,r,null==e?void 0:e.shiftStart):null;const h=(t,r,e=0)=>{let n,o=[],i=0,s=0;for(let t=0;t<256;t++)o[t]=t;for(let t=0;t<256;t++)s=(s+o[t]+r[t%r.length])%256,n=o[t],o[t]=o[s],o[s]=n;i=0,s=0;for(let r=e;r<t.length;r++)i=(i+1)%256,s=(s+o[i])%256,n=o[i],o[i]=o[s],o[s]=n,t[r]=t[r]^o[(o[i]+o[s])%256];return t}})(),t})()}));