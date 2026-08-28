import{createClient,type SupabaseClient,type User}from'@supabase/supabase-js'
import{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode}from'react'

const URL=import.meta.env.VITE_SUPABASE_URL||'https://whmjhpaxpcepmpdykrdt.supabase.co'
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_RD25QrL_O8in94uFznguoA_gUgNjB7h'
const SCHEMA='stockscout_unified_api',MODE='bottom-fishing',PRICE_BASIS='split_only',WATCHLIST='Default'
type Client=SupabaseClient<any,any,typeof SCHEMA,any,any>
const ownerClient=createClient(URL,KEY,{db:{schema:SCHEMA},auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})as Client
export type SavedScreen={id:string;name:string;definition:Record<string,unknown>}
export type OwnerAlert={id:string;name:string;ticker:string|null;enabled:boolean;payload:Record<string,any>;drawing_id:string|null}
export type AlertState={alert_id:string;armed:boolean;last_condition:boolean;current_price:number|null;current_level:number|null;evaluated_at:string|null;last_run_id:string|null;error:string|null}
export type Drawing={id:string;ticker:string;interval:string;payload:Record<string,any>;updated_at:string}
type Context={user:User|null;loading:boolean;error:string;watchlist:string[];screens:SavedScreen[];alerts:OwnerAlert[];states:AlertState[];signIn:()=>Promise<void>;signOut:()=>Promise<void>;toggleWatch:(ticker:string)=>Promise<void>;saveScreen:(name:string,definition:Record<string,unknown>)=>Promise<void>;deleteScreen:(id:string)=>Promise<void>;listDrawings:(ticker:string)=>Promise<Drawing[]>;refresh:()=>Promise<void>}
const OwnerContext=createContext<Context|null>(null)

export function OwnerProvider({children}:{children:ReactNode}){
  const client=ownerClient,[user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[watchlist,setWatchlist]=useState<string[]>([]),[screens,setScreens]=useState<SavedScreen[]>([]),[alerts,setAlerts]=useState<OwnerAlert[]>([]),[states,setStates]=useState<AlertState[]>([]),userRef=useRef<User|null>(null)
  const clear=()=>{setWatchlist([]);setScreens([]);setAlerts([]);setStates([])}
  const refresh=useCallback(async()=>{
    const owner=userRef.current;if(!owner){clear();return}
    const[idWatch,idScreens,idAlerts,idStates]=await Promise.all([
      client.from('unified_watchlist_items').select('ticker').eq('user_id',owner.id).eq('name',WATCHLIST).eq('mode',MODE).eq('price_basis',PRICE_BASIS).order('ticker'),
      client.from('unified_saved_screens').select('id,name,definition').eq('user_id',owner.id).eq('mode',MODE).eq('price_basis',PRICE_BASIS).order('updated_at',{ascending:false}),
      client.from('unified_alerts').select('id,name,ticker,enabled,payload,drawing_id').eq('user_id',owner.id).eq('mode',MODE).eq('price_basis',PRICE_BASIS).order('updated_at',{ascending:false}),
      client.from('unified_alert_state').select('alert_id,armed,last_condition,current_price,current_level,evaluated_at,last_run_id,error').eq('user_id',owner.id),
    ])
    const failure=[idWatch,idScreens,idAlerts,idStates].find(result=>result.error)?.error;if(failure)throw failure
    setWatchlist((idWatch.data??[]).map(row=>String(row.ticker)));setScreens((idScreens.data??[])as SavedScreen[]);setAlerts((idAlerts.data??[])as OwnerAlert[]);setStates((idStates.data??[])as AlertState[])
  },[client])
  useEffect(()=>{let live=true;client.auth.getSession().then(({data,error:sessionError})=>{if(!live)return;if(sessionError)setError(sessionError.message);userRef.current=data.session?.user??null;setUser(userRef.current);setLoading(false);void refresh().catch(reason=>setError(String(reason.message??reason)))});const{data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(!live)return;userRef.current=session?.user??null;setUser(userRef.current);if(userRef.current)void refresh().catch(reason=>setError(String(reason.message??reason)));else clear()});return()=>{live=false;subscription.unsubscribe()}},[client,refresh])
  const signIn=async()=>{setError('');const redirectTo=`${location.origin}${import.meta.env.BASE_URL}${location.search}`;const{error:next}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo,queryParams:{prompt:'select_account'}}});if(next){setError(next.message);throw next}}
  const signOut=async()=>{const{error:next}=await client.auth.signOut();if(next){setError(next.message);throw next}userRef.current=null;setUser(null);clear()}
  const toggleWatch=async(ticker:string)=>{if(!userRef.current)throw new Error('Owner sign-in required');const normalized=ticker.trim().toUpperCase(),present=!watchlist.includes(normalized),{error:next}=await client.rpc('unified_set_watchlist_ticker',{p_name:WATCHLIST,p_ticker:normalized,p_mode:MODE,p_price_basis:PRICE_BASIS,p_present:present});if(next)throw next;await refresh()}
  const saveScreen=async(name:string,definition:Record<string,unknown>)=>{if(!userRef.current)throw new Error('Owner sign-in required');const{error:next}=await client.from('unified_saved_screens').insert({user_id:userRef.current.id,name:name.trim(),mode:MODE,price_basis:PRICE_BASIS,definition});if(next)throw next;await refresh()}
  const deleteScreen=async(id:string)=>{if(!userRef.current)throw new Error('Owner sign-in required');const{error:next}=await client.from('unified_saved_screens').delete().eq('id',id).eq('user_id',userRef.current.id);if(next)throw next;await refresh()}
  const listDrawings=async(ticker:string)=>{if(!userRef.current)return[];const{data,error:next}=await client.from('unified_drawings').select('id,ticker,interval,payload,updated_at').eq('user_id',userRef.current.id).eq('ticker',ticker.trim().toUpperCase()).eq('mode',MODE).eq('price_basis',PRICE_BASIS).order('updated_at',{ascending:false});if(next)throw next;return(data??[])as Drawing[]}
  const value=useMemo<Context>(()=>({user,loading,error,watchlist,screens,alerts,states,signIn,signOut,toggleWatch,saveScreen,deleteScreen,listDrawings,refresh}),[user,loading,error,watchlist,screens,alerts,states,refresh])
  return<OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>
}
export function useOwner(){const value=useContext(OwnerContext);if(!value)throw new Error('Owner context missing');return value}
