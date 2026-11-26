import {Pool} from 'pg';

const runPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxBody = 1024;
let pool;

async function requestBody(request) {
  if (Number(request.headers['content-length'])>maxBody) throw new Error('Body too large');
  const given = request.body;
  if (given!==undefined) {
    if (typeof given==='string' || Buffer.isBuffer(given)) {
      if (Buffer.byteLength(given)>maxBody) throw new Error('Body too large');
      return JSON.parse(given.toString());
    }
    return given;
  }
  let bytes=0;
  const parts=[];
  for await (const piece of request) {
    bytes+=piece.length;
    if (bytes>maxBody) throw new Error('Body too large');
    parts.push(piece);
  }
  return JSON.parse(Buffer.concat(parts).toString());
}

function validEntry(value) {
  if (!value || typeof value!=='object') return false;
  const {runId,name,catches}=value;
  return typeof runId==='string' && runId.length===36 && runPattern.test(runId) &&
    typeof name==='string' && name.length===5 && /^[A-Za-z]{5}$/.test(name) &&
    Number.isInteger(catches) && catches>=0 && catches<=2147483647;
}

export default async function scores(request,response) {
  response.setHeader('Cache-Control','no-store');
  response.setHeader('Content-Type','application/json; charset=utf-8');
  const send=(status,value)=>{
    response.statusCode=status;
    response.end(JSON.stringify(value));
  };
  if (request.method!=='GET' && request.method!=='POST') {
    response.setHeader('Allow','GET, POST');
    return send(405,{error:'Method not allowed.'});
  }

  let entry;
  if (request.method==='POST') {
    if (!String(request.headers['content-type']).toLowerCase().startsWith('application/json')) {
      return send(415,{error:'Unsupported request format.'});
    }
    try { entry=await requestBody(request); }
    catch { return send(400,{error:'Invalid request.'}); }
    if (!validEntry(entry)) return send(400,{error:'Enter five letters from A to Z and a valid score.'});
  }

  if (!process.env.DATABASE_URL) return send(503,{error:'The online leaderboard is not configured.'});
  try {
    pool ??= new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:3500,
      idleTimeoutMillis:10000,statement_timeout:5000});
    if (request.method==='GET') {
      const {rows}=await pool.query(
        'SELECT name, catches FROM tamago_scores ORDER BY catches DESC, created_at, run_id LIMIT 50',
      );
      return send(200,{entries:rows});
    }

    const {name,catches,runId}=entry;
    const displayName=name.toUpperCase();
    const added=await pool.query(
      'INSERT INTO tamago_scores (run_id,name,catches) VALUES ($1,$2,$3) ON CONFLICT (run_id) DO NOTHING RETURNING name,catches',
      [runId,displayName,catches],
    );
    if (added.rowCount) return send(201,added.rows[0]);
    const saved=await pool.query('SELECT name,catches FROM tamago_scores WHERE run_id=$1',[runId]);
    if (saved.rows[0]?.name===displayName && saved.rows[0]?.catches===catches) return send(200,saved.rows[0]);
    return send(409,{error:'This game is already on the leaderboard.'});
  } catch (error) {
    console.error('Leaderboard PostgreSQL:',error.code??error.name);
    return send(503,{error:'Leaderboard unavailable. Try again.'});
  }
}
