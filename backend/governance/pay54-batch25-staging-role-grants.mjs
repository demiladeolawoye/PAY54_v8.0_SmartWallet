"use strict";

/**
 * PAY54 Batch 25 / 1007 — source review of planned staging login/role grants.
 *
 * This validates the intended four segregated PostgreSQL runtime identities.
 * It does not CREATE ROLE, grant IAM, connect to a database or prove actual
 * effective privileges. The two restricted SECURITY DEFINER owners must
 * NEVER receive LOGIN role memberships.
 */
const REQUIRE=Object.freeze([
 "pay54_session_read_role",
 "pay54_account_directory_read_role",
 "pay54_session_rotate_role",
 "pay54_session_issue_role"
]);
const FORBIDDEN=new Set([
 "postgres","pay54_session_rotate_executor_role",
 "pay54_session_issue_executor_role",
 "pay54_account_reader_role"
]);
const USER=/^[a-z_][a-z0-9_]{3,62}$/;
const deny=()=>{throw new Error("PAY54_STAGING_ROLE_GRANT_PLAN_DENIED");};

export function validatePay54StagingRoleGrantPlan({assignments}={}){
 if(!Array.isArray(assignments) ||
    assignments.length!==REQUIRE.length)deny();
 const roles=new Set(),users=new Set();
 for(const item of assignments){
  if(!item || typeof item!=="object" ||
     typeof item.role!=="string" ||
     !REQUIRE.includes(item.role) ||
     typeof item.login!=="string" || !USER.test(item.login) ||
     FORBIDDEN.has(item.login) || FORBIDDEN.has(item.role) ||
     item.allowInheritedRoles!==false ||
     item.allowSuperuser!==false ||
     item.allowBypassRls!==false ||
     item.allowFinancialDml!==false ||
     roles.has(item.role) || users.has(item.login))deny();
  roles.add(item.role);users.add(item.login);
 }
 if(REQUIRE.some(role=>!roles.has(role)))deny();
 return Object.freeze({
  schema:"pay54.staging-role-assignment-review.v1",
  expectedDistinctLogins:4,
  expectedRestrictedCallableRoles:4,
  approvedRoleNames:Object.freeze([...REQUIRE]),
  sourceIntentValid:true,
  actualPgAuthMembersInspected:false,
  restrictedFunctionOwnersRemainUnassignedInThisPlan:true,
  roleGrantsExecuted:false,
  stagingDatabaseAuthorised:false,
  productionDeploymentAuthorised:false
 });
}
