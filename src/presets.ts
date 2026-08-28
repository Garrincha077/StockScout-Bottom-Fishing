import type{BottomRow}from'./data'

const aliases:Record<string,string>={primary_setup:'primarySetup',trade_status:'tradeStatus',trigger_state:'triggerState',entry_risk_pct:'entryRiskPct',rs_rating:'rsRank',rs_score_3m:'rs3m',rs_score_6m:'rs6m',distance_to_52w_high_pct:'from52wHigh',base_quality_score:'baseScore',base_depth_pct:'baseDepthPct',accumulation_score:'accumulationScore',crash_base_score:'crashBaseScore',ema_stack_launch_score:'emaStackLaunchScore',long_base_score:'longBaseScore',ma_cluster_score:'maClusterScore',volume_ratio_50d:'volumeRatio',avg_dollar_volume_50d:'avgDollarVolume50',ret_3m_pct:'return3m',ret_6m_pct:'return6m',weinstein_stage:'stage',weinstein_substage:'stageName'}
export function sourceValue(row:BottomRow,key:string):any{
  const direct=row[key]??row[aliases[key]]
  if(direct!==undefined&&direct!==null)return direct
  const plan=row.tradePlan??{}
  if(key==='trade_status')return plan.status
  if(key==='trigger_state')return plan.triggerState??plan.trigger_state
  if(key==='entry_risk_pct')return plan.entryRiskPct??plan.entry_risk_pct
  if(key==='extension_atr')return plan.extensionAtr??plan.extension_atr
  if(key==='distance_to_trigger_pct'){const price=Number(row.price),trigger=Number(plan.triggerReferenceLevel??plan.trigger_reference_level);return Number.isFinite(price)&&trigger>0?(price-trigger)/trigger*100:null}
  return null
}
const n=(row:BottomRow,key:string)=>Number(sourceValue(row,key)),eq=(row:BottomRow,key:string,value:unknown)=>String(sourceValue(row,key)??'')===String(value),one=(row:BottomRow,key:string,values:unknown[])=>values.some(value=>eq(row,key,value)),truth=(row:BottomRow,key:string)=>sourceValue(row,key)===true
export type BottomPreset={name:string;match:(row:BottomRow)=>boolean}

export const bottomPresets:BottomPreset[]=[
  {name:'Actionable Tight Bases',match:r=>one(r,'actionability',['actionable_now','near_actionable','forming'])&&one(r,'primary_setup',['tight_breakout','minervini','glb','long_base_launch'])&&n(r,'base_depth_pct')<=30},
  {name:'Early Trend / RWB — Strict',match:r=>one(r,'trade_status',['entry_ready','trigger_pending'])&&n(r,'entry_risk_pct')<=10&&n(r,'distance_to_trigger_pct')>=-5&&n(r,'distance_to_trigger_pct')<=1.5&&n(r,'rs_rating')>=80&&n(r,'weekly_30w_slope_pct')>=0&&(one(r,'primary_setup',['rwb_squeeze_thrust','guppy','ema_stack_launch','ema_cross','long_base_launch'])||one(r,'rwb_squeeze_phase',['thrusting','trendline_breakout','confirmed'])||one(r,'ema_stack_phase',['early_ignition','stack_thrust','follow_through']))},
  {name:'Early Trend / RWB — Relaxed',match:r=>one(r,'trade_status',['entry_ready','trigger_pending'])&&n(r,'entry_risk_pct')<=10&&n(r,'distance_to_trigger_pct')>=-10&&n(r,'distance_to_trigger_pct')<=2.5&&n(r,'rs_rating')>=70&&(one(r,'primary_setup',['rwb_squeeze_thrust','guppy','ema_stack_launch','ema_cross','long_base_launch'])||one(r,'rwb_squeeze_phase',['watch_squeeze','thrusting','trendline_breakout','confirmed'])||one(r,'ema_stack_phase',['coil_watch','early_ignition','stack_thrust','follow_through']))},
  {name:'RS Leaders Near High',match:r=>n(r,'rs_rating')>=90&&n(r,'distance_to_52w_high_pct')>=-12},
  {name:'Launch/Volume',match:r=>one(r,'primary_setup',['ema_stack_launch','rwb_squeeze_thrust','long_base_launch'])||one(r,'ema_stack_phase',['early_ignition','stack_thrust','follow_through'])||one(r,'rwb_squeeze_phase',['thrusting','trendline_breakout','confirmed'])},
  {name:'Accumulation Watch',match:r=>n(r,'accumulation_score')>=55||n(r,'institutional_footprint_score')>=55||n(r,'long_base_score')>=50},
  {name:'Stage 1 → 2 Recovery',match:r=>n(r,'weinstein_stage')===1&&eq(r,'weinstein_substage','1C_pre_breakout')&&eq(r,'weinstein_stage_origin','from_decline')&&eq(r,'long_term_context','secular_recovery')&&n(r,'secular_recovery_score')>=55},
  {name:'Minervini — Trend Template',match:r=>eq(r,'primary_setup','minervini')&&n(r,'rs_rating')>=70&&n(r,'distance_to_52w_high_pct')>=-25},
  {name:'Minervini — VCP',match:r=>n(r,'rs_rating')>=80&&n(r,'distance_to_52w_high_pct')>=-15&&n(r,'base_quality_score')>=60},
  {name:'Weinstein — Stage 2 Breakout',match:r=>n(r,'weinstein_stage')===2&&one(r,'weinstein_substage',['2A_fresh_breakout','2B_healthy_advance'])&&n(r,'mansfield_rs')>0&&n(r,'weekly_breakout_rvol')>=1.4&&n(r,'weinstein_ext_pct')<=15},
  {name:'Stamatoudis — 10/20 EMA Momentum',match:r=>one(r,'primary_setup',['ema_cross','tight_breakout'])&&n(r,'rs_score_3m')>0&&n(r,'avg_dollar_volume_50d')>=5_000_000},
  {name:'Qullamaggie — Momentum',match:r=>n(r,'rs_rating')>=90&&n(r,'distance_to_52w_high_pct')>=-25&&n(r,'avg_dollar_volume_50d')>=10_000_000&&n(r,'adr_pct')>=4&&n(r,'adr_pct')<=20&&n(r,'ret_3m_pct')>=30&&(one(r,'primary_setup',['tight_breakout','glb','high_rs','ema_cross'])||truth(r,'pocket_pivot'))},
  {name:'Oliver Kell — Reclaim / Launch',match:r=>n(r,'rs_rating')>=85&&(eq(r,'primary_setup','ema_cross')||one(r,'ema_stack_phase',['early_ignition','stack_thrust','follow_through'])||eq(r,'long_base_phase','launching')||one(r,'rwb_squeeze_phase',['thrusting','confirmed']))},
  {name:'Oliver Kell — 52W Highs',match:r=>n(r,'distance_to_52w_high_pct')>=-5&&truth(r,'rs_line_at_52w_high')&&n(r,'rs_rating')>=85},
  {name:'Oliver Kell — Bull Snort',match:r=>n(r,'rs_rating')>=80&&(n(r,'weekly_breakout_rvol')>=2||truth(r,'daily_rvol_headsup')||truth(r,'pocket_pivot'))},
  {name:"O'Neil — CAN SLIM Leaders",match:r=>one(r,'primary_setup',['high_rs','minervini'])&&n(r,'rs_rating')>=85&&truth(r,'rs_line_at_52w_high')&&n(r,'distance_to_52w_high_pct')>=-15},
  {name:'Pocket Pivot (Morales/Kacher)',match:r=>truth(r,'pocket_pivot')&&n(r,'rs_rating')>=70&&n(r,'up_down_vol_ratio_50d')>=1},
  {name:'Qullamaggie — Episodic Pivot',match:r=>n(r,'ret_1d_pct')>=7.5&&n(r,'rvol_today')>=3&&n(r,'avg_dollar_volume_50d')>=20_000_000},
  {name:'Oliver Kell — Doublers',match:r=>n(r,'ret_6m_pct')>=100&&n(r,'rs_rating')>=90},
]

export function findBottomPreset(name:string){return bottomPresets.find(preset=>preset.name===name)}
