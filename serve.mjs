import http from "node:http";
import {serveAssistant} from "./assistant-api.mjs";
import {createReadStream,statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,sep,extname} from "node:path";
const root = fileURLToPath(new URL("./dist/",import.meta.url));
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".jpg":"image/jpeg",".webp":"image/webp",".webm":"video/webm",".ttf":"font/ttf"};
const server = http.createServer((req,res)=>{
  try {
    const path = decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    if(path==="/api/assistant" || path==="/api/assistant/status") {
      void serveAssistant(req,res,path);
      return;
    }
    const file = resolve(root,"."+(path==="/"?"/index.html":path));
    if(!file.startsWith(resolve(root)+sep)) throw Error("Not found");
    const info = statSync(file);
    if(!info.isFile()) throw Error("Not found");
    const headers = {"Content-Type":mime[extname(file)] || "application/octet-stream","Accept-Ranges":"bytes"};
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || "");
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]),info.size-1) : info.size-1;
    if(start>end) {res.writeHead(416,{"Content-Range":"bytes */"+info.size}).end();return;}
    if(range) headers["Content-Range"] = "bytes "+start+"-"+end+"/"+info.size;
    res.writeHead(range?206:200,{...headers,"Content-Length":end-start+1});
    if(req.method==="HEAD") res.end();
    else createReadStream(file,{start,end}).pipe(res);
  } catch {res.writeHead(404).end("Not found");}
});
server.listen(4173,"127.0.0.1",()=>console.log("http://127.0.0.1:4173/"));
