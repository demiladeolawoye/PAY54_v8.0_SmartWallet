"use strict";

/* PAY54 Batch 02 / Accessible account-picker preview state.
 * Pure, non-persistent intent: no actual account switch, navigation, balance,
 * wallet, session, credential or payment side effects. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createAccountSwitchPreview({accountIds,selectedAccountId=null}) {
  if(!Array.isArray(accountIds) || accountIds.length>100 ||
     accountIds.some(id=>typeof id!=="string" || !UUID.test(id)) ||
     new Set(accountIds.map(id=>id.toLowerCase())).size!==accountIds.length){
    throw new TypeError("Validated account IDs required");
  }
  const ids=Object.freeze(accountIds.map(id=>id.toLowerCase()));
  if(selectedAccountId!==null &&
     (!UUID.test(selectedAccountId) || !ids.includes(selectedAccountId.toLowerCase()))){
    throw new TypeError("Selected account not in authorised picker list");
  }
  const selected=selectedAccountId===null?null:selectedAccountId.toLowerCase();
  const createState=(open,focusedIndex)=>Object.freeze({
    open, focusedIndex, selectedAccountId:selected,
    accountIds:ids, effectiveFinancialContextChanged:false
  });
  const initialState=createState(false,ids.length?0:-1);
  const reduce=(state,action)=>{
    if(!state || !ids.every((id,i)=>state.accountIds?.[i]===id) ||
       state.accountIds?.length!==ids.length)throw new TypeError("Invalid picker state");
    switch(action?.type){
      case "OPEN":return createState(true,Math.max(0,ids.indexOf(selected)));
      case "CLOSE":case "ESCAPE":return createState(false,state.focusedIndex);
      case "HOME":return state.open&&ids.length?createState(true,0):state;
      case "END":return state.open&&ids.length?createState(true,ids.length-1):state;
      case "ARROW_DOWN":return state.open&&ids.length?createState(true,(state.focusedIndex+1)%ids.length):state;
      case "ARROW_UP":return state.open&&ids.length?createState(true,(state.focusedIndex+ids.length-1)%ids.length):state;
      default:return state;
    }
  };
  const createSelectionIntent=(state)=>{
    if(!state?.open||!ids.length||!Number.isInteger(state.focusedIndex) ||
       state.focusedIndex<0||state.focusedIndex>=ids.length){
      throw new Error("ACCOUNT_SELECTION_UNAVAILABLE");
    }
    return Object.freeze({
      requestedAccountId:ids[state.focusedIndex],
      pendingServerAuthorisation:true,
      financialExecutionEnabled:false,
      accountContextChanged:false
    });
  };
  return Object.freeze({initialState,reduce,createSelectionIntent});
}
