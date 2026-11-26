import {createServer} from 'node:http';
import scores from '../api/scores.js';
import endless from '../api/endless.js';

createServer((request,response)=>{
  const path=new URL(request.url,'http://localhost').pathname;
  if (path==='/api/endless') {
    void endless(request,response);
  } else if (path==='/api/scores') {
    void scores(request,response);
  } else {
    response.writeHead(404).end();
  }
}).listen(8787,'127.0.0.1',()=>console.log('Leaderboard API at http://127.0.0.1:8787/api/endless'));
