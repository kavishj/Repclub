import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import QRCode from 'qrcode';
const require=createRequire(import.meta.url);
const zxing=createRequire(require.resolve('@zxing/browser'))('@zxing/library');

test('the gym QR payload round-trips through the encoder and pure-bitmap decoder', () => {
 const payload='repclub:gym:v1:'+Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
 const {modules}=QRCode.create(payload,{errorCorrectionLevel:'M'});
 const scale=6, margin=4, width=(modules.size+margin*2)*scale;
 const pixels=new Uint8ClampedArray(width*width).fill(255);
 for(let row=0;row<modules.size;row++)for(let col=0;col<modules.size;col++)if(modules.get(row,col)){
  for(let y=0;y<scale;y++)for(let x=0;x<scale;x++)pixels[((row+margin)*scale+y)*width+(col+margin)*scale+x]=0;
 }
 const bitmap=new zxing.BinaryBitmap(new zxing.HybridBinarizer(new zxing.RGBLuminanceSource(pixels,width,width)));
 // This generated fixture has no camera perspective: use the decoder's pure-bitmap mode.
 const hints=new Map([[zxing.DecodeHintType.PURE_BARCODE,true]]);
 assert.equal(new zxing.QRCodeReader().decode(bitmap,hints).getText(),payload);
});
