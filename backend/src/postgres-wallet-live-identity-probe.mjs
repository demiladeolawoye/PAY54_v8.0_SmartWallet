"use strict";

/**
 * Execute ONLY with a separately approved, physically connected wallet
 * reader pool. Not a configuration-flag attestation or a migration.
 * Checks an actual PostgreSQL login, effective roles, financial ACL graph,
 * forced RLS, and the server-reported TLS state of this backend connection.
 * pg_stat_ssl does not itself prove CA/hostname verification: the client
 * handshake and independent cloud evidence must establish that.
 */
const DENIED="PAY54_WALLET_STAGE_LIVE_IDENTITY_UNVERIFIED";
const fail=()=>{throw Error(DENIED);};
export const PAY54_WALLET_STAGE_IDENTITY_SQL=`
SELECT
 current_user AS effective_role,
 session_user AS login_role,
 current_setting('transaction_read_only') AS read_only,
 current_setting('transaction_isolation') AS isolation,
 (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS ssl_in_use,
 (SELECT version FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls_version,
 (SELECT NOT rolsuper AND NOT rolbypassrls AND NOT rolcanlogin
  FROM pg_roles WHERE rolname=current_user) AS function_only_caller,
 (SELECT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
  FROM pg_roles WHERE rolname=session_user) AS safe_login,
 pg_has_role(session_user,current_user,'MEMBER') AS delegated_membership,
 has_schema_privilege(current_user,'pay54','USAGE') AS schema_usage,
 has_function_privilege(current_user,
  'pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)',
  'EXECUTE') AS callable,
 has_table_privilege(current_user,'pay54.ledger_entries','SELECT') AS ledger_direct,
 has_table_privilege(current_user,'pay54.balance_reservations','SELECT') AS holds_direct,
 has_table_privilege(current_user,'pay54.auth_sessions','SELECT') AS sessions_direct,
 has_table_privilege(current_user,'pay54.ledger_entries','INSERT,UPDATE,DELETE') AS ledger_write,
 (SELECT count(*)=9 AND COALESCE(bool_and(relrowsecurity AND relforcerowsecurity),false)
  FROM pg_class WHERE oid IN(
   'pay54.auth_sessions'::regclass,
   'pay54.account_contexts'::regclass,
   'pay54.account_memberships'::regclass,
   'pay54.personal_wallet_bindings'::regclass,
   'pay54.wallets'::regclass,
   'pay54.ledger_accounts'::regclass,
   'pay54.ledger_entries'::regclass,
   'pay54.ledger_journals'::regclass,
   'pay54.balance_reservations'::regclass)) AS all_forced_rls`;

export function createPay54WalletLiveIdentityProbe({pool,expectedLogin}={}){
 if(typeof pool?.connect!=="function"||
    typeof expectedLogin!=="string"||
    !/^[a-z_][a-z0-9_]{3,62}$/.test(expectedLogin)||
    expectedLogin==="pay54_wallet_read_caller_role")fail();
 return Object.freeze({
  async inspect(){
   let c,started=false;
   try{
    c=await pool.connect();
    if(typeof c?.query!=="function"||
       typeof c?.release!=="function")fail();
    await c.query("BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY");
    started=true;
    const result=await c.query(PAY54_WALLET_STAGE_IDENTITY_SQL);
    const a=result?.rows;
    if(!Array.isArray(a)||a.length!==1)fail();
    const v=a[0];
    if(v.effective_role!=="pay54_wallet_read_caller_role"||
       v.login_role!==expectedLogin||
       v.read_only!=="on"||v.isolation!=="read committed"||
       v.ssl_in_use!==true||
       !["TLSv1.2","TLSv1.3"].includes(v.tls_version)||
       ["function_only_caller","safe_login","delegated_membership",
        "schema_usage","callable","all_forced_rls"]
          .some(k=>v[k]!==true)||
       ["ledger_direct","holds_direct","sessions_direct","ledger_write"]
          .some(k=>v[k]!==false))fail();

    await c.query("ROLLBACK");
    started=false;
    return Object.freeze({
      schema:"pay54.wallet-stage-live-identity-probe.v1",
      restrictedDatabaseIdentityObserved:true,
      backendConnectionTlsObserved:true,
      hostnameCaVerificationIndependentlyAttested:false,
      cloudIamIndependentlyAttested:false,
      secretCustodyIndependentlyAttested:false,
      providerSettlementVerified:false,
      stagingDeploymentAuthorised:false,
      productionAuthorised:false
    });
   }catch{fail();}
   finally{
    if(c){
      if(started){try{await c.query("ROLLBACK");}catch{/* discard */}}
      try{c.release(true);}catch{/* discard */ }
    }
   }
  }
 });
}
