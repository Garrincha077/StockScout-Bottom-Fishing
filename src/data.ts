export const UNIFIED_ROOT='https://garrincha077.github.io/StockScout-Unified'
const DATA_ROOT=`${UNIFIED_ROOT}/data`
const EXPECTED_RUN_ID=import.meta.env?.VITE_EXPECTED_RUN_ID?.trim()
export type Asset={path:string;sha256:string;bytes:number;count?:number}
type ModeDescriptor={manifestPath:string;manifestSha256:string;manifestBytes:number;priceBasis:string;status:string}
type UnifiedManifest={runId:string;sessionDate:string;status:string;modes:Record<string,ModeDescriptor>}
export type BottomManifest={runId:string;sessionDate:string;generatedAt:string;marketDataDate:string;priceMode:string;status:string;counts:{candidates:number;excluded:number;universe:number};assets:{core:Asset;charts:Asset;bottomScreener?:Asset};health?:{coveragePct:number;status:string};provenance?:Record<string,unknown>}
export type BottomRow={ticker:string;scanOrder:number;score?:number;focusBlend?:number;price?:number;stage?:number;stageName?:string;primarySetup?:string;setup?:string;setupTags?:string[];sector?:string;industry?:string;rsRank?:number;baseScore?:number;volumeRatio?:number;entryRiskPct?:number;actionability?:string;tradeStatus?:string;tradePlan?:Record<string,any>;[key:string]:any}
type Core={runId:string;sessionDate:string;market:Record<string,any>;universe:BottomRow[]}
type Sidecar={schemaVersion:string;runId:string;priceBasis:string;fields:string[];rows:BottomRow[]}
export type BottomSnapshot={activation:UnifiedManifest;manifest:BottomManifest;market:Record<string,any>;rows:BottomRow[];sidecarStatus:'verified'|'unavailable'}
type ChartDescriptor={name:string;sha256:string;bytes:number;tickerCount:number}
type ChartManifest={runId:string;storageBaseUrl:string;shards:ChartDescriptor[];shardsByTicker:Record<string,string>}
export type ChartBar={time:string;open:number;high:number;low:number;close:number;volume:number;rs:number}

async function sha256(payload:ArrayBuffer){const digest=await crypto.subtle.digest('SHA-256',payload);return Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('')}
async function bytes(url:string){const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error(`HTTP ${response.status} for ${url}`);return response.arrayBuffer()}
async function verifiedJson<T>(url:string,expected?:{sha256:string;bytes:number}){const payload=await bytes(url);if(expected&&payload.byteLength!==expected.bytes)throw new Error('Published asset byte count changed');if(expected&&await sha256(payload)!==expected.sha256)throw new Error('Published asset hash changed');return JSON.parse(new TextDecoder().decode(payload))as T}

let snapshotCache:Promise<BottomSnapshot>|null=null
async function fetchBottomSnapshot():Promise<BottomSnapshot>{
  const activation=await verifiedJson<UnifiedManifest>(`${DATA_ROOT}/manifest.json`),descriptor=activation.modes['bottom-fishing']
  if(activation.status!=='healthy'||descriptor?.status!=='healthy')throw new Error('Unified Bottom activation is not healthy')
  if(EXPECTED_RUN_ID&&activation.runId!==EXPECTED_RUN_ID)throw new Error(`Unified active run ${activation.runId} does not match deployed Bottom PWA run ${EXPECTED_RUN_ID}`)
  const manifest=await verifiedJson<BottomManifest>(`${DATA_ROOT}/${descriptor.manifestPath}`,{sha256:descriptor.manifestSha256,bytes:descriptor.manifestBytes})
  if(manifest.runId!==activation.runId||manifest.priceMode!=='split_only')throw new Error('Bottom manifest identity mismatch')
  const modeRoot=`${DATA_ROOT}/modes/bottom-fishing`,core=await verifiedJson<Core>(`${modeRoot}/${manifest.assets.core.path}`,manifest.assets.core)
  if(core.runId!==manifest.runId||!Array.isArray(core.universe))throw new Error('Bottom core contract is invalid')
  let sidecarStatus:BottomSnapshot['sidecarStatus']='unavailable',rows=core.universe
  if(manifest.assets.bottomScreener)try{
    const sidecar=await verifiedJson<Sidecar>(`${modeRoot}/${manifest.assets.bottomScreener.path}`,manifest.assets.bottomScreener)
    if(sidecar.runId!==manifest.runId||sidecar.priceBasis!=='split_only'||sidecar.fields.length<60)throw new Error('Bottom sidecar contract is invalid')
    const byTicker=new Map(sidecar.rows.map(row=>[row.ticker,row]));rows=core.universe.map(row=>({...row,...byTicker.get(row.ticker),ticker:row.ticker,scanOrder:row.scanOrder}));sidecarStatus='verified'
  }catch{sidecarStatus='unavailable'}
  return{activation,manifest,market:core.market??{},rows,sidecarStatus}
}
export function loadBottomSnapshot():Promise<BottomSnapshot>{
  if(!snapshotCache)snapshotCache=fetchBottomSnapshot().catch(error=>{snapshotCache=null;throw error})
  return snapshotCache
}

let chartManifestCache:Promise<ChartManifest>|null=null
async function chartManifest(manifest:BottomManifest){
  if(!chartManifestCache)chartManifestCache=verifiedJson<ChartManifest>(`${DATA_ROOT}/modes/bottom-fishing/${manifest.assets.charts.path}`,manifest.assets.charts).then(value=>{if(value.runId!==manifest.runId)throw new Error('Chart manifest belongs to another run');return value})
  return chartManifestCache
}
function normalizeBar(row:any):ChartBar|null{const value=Array.isArray(row)?{time:row[0],open:row[1],high:row[2],low:row[3],close:row[4],volume:row[5],rs:row[6]}:row,rawTime=value?.time??value?.date,numericTime=Number(rawTime),time=Number.isFinite(numericTime)&&String(rawTime).trim()!==''?new Date((Math.abs(numericTime)<100_000_000_000?numericTime*1000:numericTime)).toISOString().slice(0,10):String(rawTime??'').slice(0,10),open=Number(value?.open),high=Number(value?.high),low=Number(value?.low),close=Number(value?.close),volume=Number(value?.volume??0),rs=Number(value?.rs??0);return /^\d{4}-\d{2}-\d{2}$/.test(time)&&[open,high,low,close,volume,rs].every(Number.isFinite)?{time,open,high,low,close,volume,rs}:null}
export async function loadChart(manifest:BottomManifest,ticker:string):Promise<ChartBar[]>{
  const index=await chartManifest(manifest),normalized=ticker.trim().toUpperCase(),name=index.shardsByTicker[normalized],descriptor=index.shards.find(item=>item.name===name)
  if(!name||!descriptor)throw new Error('No chart shard for this ticker')
  const filename=name.endsWith('.json.gz')?name:`${name}.json.gz`,payload=await bytes(`${index.storageBaseUrl.replace(/\/$/,'')}/shards/${filename}`)
  if(payload.byteLength!==descriptor.bytes||await sha256(payload)!==descriptor.sha256)throw new Error('Chart shard verification failed')
  if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot decompress chart data')
  const stream=new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip')),value=JSON.parse(await new Response(stream).text()),candidate=value?.[normalized]??value?.byTicker?.[normalized]??value?.candidates?.[normalized],source=Array.isArray(candidate)?candidate:Array.isArray(candidate?.daily)?candidate.daily:candidate?.rows
  if(!Array.isArray(source))throw new Error('Chart rows are unavailable')
  const rows=source.map(normalizeBar).filter((row):row is ChartBar=>row!==null).sort((a,b)=>a.time.localeCompare(b.time));if(!rows.length)throw new Error('Chart shard has no valid EOD bars');return rows
}

export function appUrl(params:Record<string,string|number|undefined>){const url=new URL(location.href);url.search='';for(const[key,value]of Object.entries(params))if(value!==undefined&&value!=='')url.searchParams.set(key,String(value));return`${url.pathname}${url.search}`}
export function unifiedTickerUrl(ticker:string,runId:string){return`${UNIFIED_ROOT}/?mode=bottom-fishing&ticker=${encodeURIComponent(ticker)}&run=${encodeURIComponent(runId)}`}
