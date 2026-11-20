import {createServer} from 'node:http';
import scores from '../api/scores.js';

createServer((request,response)=>{
  if (new URL(request.url,'http://localhost').pathname==='/api/scores') {
    void scores(request,response);
  } else {
    response.writeHead(404).end();
  }
}).listen(8787,'127.0.0.1',()=>console.log('Classifica su http://127.0.0.1:8787/api/scores'));
