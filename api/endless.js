import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {maxReplayLength,replayScore,runPattern} from '../src/endless-replay.ts';

const columns='run_id, ordinal, catches, replay_hash, name, skipped';
let pool;

async function readBody(request) {
  const limit=maxReplayLength+1024;
  if (Number(request.headers['content-length'])>limit) throw new Error('Request too large');
  const given=request.body;
  if (given!==undefined && typeof given==='object' && !Buffer.isBuffer(given)) {
    if (Buffer.byteLength(JSON.stringify(given))>limit) throw new Error('Request too large');
    return given;
  }
  if (given!==undefined) {
    if (Buffer.byteLength(given)>limit) throw new Error('Request too large');
    return JSON.parse(given.toString());
  }
  let bytes=0;
  const parts=[];
  for await (const chunk of request) {
    bytes+=chunk.length;
    if (bytes>limit) throw new Error('Request too large');
    parts.push(chunk);
  }
  return JSON.parse(Buffer.concat(parts).toString());
}

function valid(value) {
  return value && typeof value==='object' && typeof value.runId==='string' && value.runId.length===36 && runPattern.test(value.runId) && (
    value.action==='skip' ||
    (value.action==='publish' && typeof value.name==='string' && value.name.length>=1 && value.name.length<=6 && !/[^A-Za-z]/.test(value.name)) ||
    (value.action==='register' && Number.isInteger(value.catches) && value.catches>=0 && value.catches<=10000 &&
      typeof value.replay==='string' && value.replay.length>0 && value.replay.length<=maxReplayLength)
  );
}

async function findRun(db,id) {
  const {rows}=await db.query(`SELECT ${columns} FROM tamago_endless_runs WHERE run_id=$1`,[id]);
  return rows[0];
}

async function rank(db,run) {
  const {rows}=await db.query(`SELECT count(*)::integer+1 AS position FROM tamago_endless_runs
    WHERE name IS NOT NULL AND (catches>$1 OR (catches=$1 AND ordinal<$2))`,[run.catches,run.ordinal]);
  return rows[0].position;
}

async function status(db,run) {
  if (run.skipped) return {status:'skipped',catches:run.catches};
  const position=await rank(db,run);
  return {status:run.name ? 'published' : position<=10 ? 'qualified' : 'outside',catches:run.catches,position};
}

async function transact(db,entry,hash) {
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    // Serialize registration and publication so ordinal ties and admission use one order.
    await client.query('SELECT pg_advisory_xact_lock(794134291)');
    let run=await findRun(client,entry.runId);
    if (entry.action==='register' && !run) {
      const {rows}=await client.query(`INSERT INTO tamago_endless_runs (run_id,catches,replay_hash)
        VALUES ($1,$2,$3) RETURNING ${columns}`,[entry.runId,entry.catches,hash]);
      run=rows[0];
    }
    let result;
    if (!run) result=[404,{error:'Register this game before saving a name.'}];
    else if (entry.action==='register' && (run.catches!==entry.catches || run.replay_hash!==hash)) {
      result=[409,{error:'This game was already registered with different data.'}];
    } else if (entry.action==='publish') {
      const name=entry.name.toUpperCase();
      if (run.name && run.name!==name) result=[409,{error:'This game already has a name.'}];
      else if (run.skipped) result=[409,{error:'This game was skipped.'}];
      else if (!run.name && await rank(client,run)>10) {
        result=[200,{status:'outside',catches:run.catches,error:'Your score is no longer in the Top 10.'}];
      } else if (!run.name) {
        await client.query('UPDATE tamago_endless_runs SET name=$2 WHERE run_id=$1',[entry.runId,name]);
        run.name=name;
      }
    } else if (entry.action==='skip' && !run.name && !run.skipped) {
      await client.query('UPDATE tamago_endless_runs SET skipped=true WHERE run_id=$1',[entry.runId]);
      run.skipped=true;
    }
    result??=[200,await status(client,run)];
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { client.release(); }
}

export default async function endless(request,response) {
  response.setHeader('Cache-Control','no-store');
  response.setHeader('Content-Type','application/json; charset=utf-8');
  const send=(code,value)=>{ response.statusCode=code; response.end(JSON.stringify(value)); };
  if (request.method!=='GET' && request.method!=='POST') {
    response.setHeader('Allow','GET, POST');
    return send(405,{error:'Method not allowed.'});
  }
  let entry;
  if (request.method==='POST') {
    if (!/^application\/json(?:;|$)/i.test(String(request.headers['content-type']))) return send(415,{error:'Unsupported request format.'});
    try { entry=await readBody(request); } catch { return send(400,{error:'Invalid request.'}); }
    if (!valid(entry)) return send(400,{error:'Enter a valid game or a name with 1–6 letters from A to Z.'});
  }
  if (!process.env.DATABASE_URL) return send(503,{error:'The online leaderboard is not configured.'});
  try {
    pool??=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:3500,
      idleTimeoutMillis:10000,statement_timeout:6000});
    if (!entry) {
      const {rows}=await pool.query(`SELECT name,catches FROM tamago_endless_runs WHERE name IS NOT NULL
        ORDER BY catches DESC,ordinal LIMIT 10`);
      return send(200,{entries:rows.map((row,index)=>({...row,position:index+1}))});
    }
    let hash;
    if (entry.action==='register') {
      hash=createHash('sha256').update(entry.replay).digest('hex');
      const existing=await findRun(pool,entry.runId);
      if (!existing && replayScore(entry.runId,entry.replay)!==entry.catches) {
        return send(422,{error:'This game could not be verified.'});
      }
    }
    return send(...await transact(pool,entry,hash));
  } catch (error) {
    console.error('Endless PostgreSQL:',error.code??error.name);
    return send(503,{error:'Leaderboard unavailable. Try again.'});
  }
}
