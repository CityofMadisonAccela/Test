/*------------------------------------------------------------------------------------------------------/
| Program : AssociateAssetToWorkOrderAfterMAD73.js
| Event   : AssociateAssetToWorkOrderAfter
|
| Usage   : Designed to work with most events and generate a generic framework to expose standard master scirpt functionality
|			To utilize associate UniversalMasterScript to event and create a standard choice with same name as event
|			universal master script will execute and attempt to call standard choice with same name as associate event. 
|
| Client  : Madison
| Action# : N/A
|
| Notes   : Because there wasn't a masterscript for this event, we created one. 
|           !Important! This event doesn't pop up a debug or message window, so all that will be emailed to elamsupport
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| START Configurable Parameters
|	The following script code will attempt to read the assocaite event and invoker the proper standard choices
|    
/------------------------------------------------------------------------------------------------------*/
var controlString = "AssociateAssetToWorkOrderAfter";
var preExecute = "PreExecuteForAfterEvents"				// Standard choice to execute first (for globals, etc)
var documentOnly = false;						// Document Only -- displays hierarchy of std choice steps

/*------------------------------------------------------------------------------------------------------/
| END User Configurable Parameters
/------------------------------------------------------------------------------------------------------*/
var SCRIPT_VERSION = 2.0

eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS"));
eval(getScriptText("INCLUDES_ACCELA_GLOBALS"));
eval(getScriptText("INCLUDES_CUSTOM"));

if (documentOnly) {
	doStandardChoiceActions(controlString,false,0);
	aa.env.setValue("ScriptReturnCode", "0");
	aa.env.setValue("ScriptReturnMessage", "Documentation Successful.  No actions executed.");
	aa.abortScript();
	}
	
function getScriptText(vScriptName){
	vScriptName = vScriptName.toUpperCase();
	var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
	var emseScript = emseBiz.getScriptByPK(aa.getServiceProviderCode(),vScriptName,"ADMIN");
	return emseScript.getScriptText() + "";	
}

/*------------------------------------------------------------------------------------------------------/
| BEGIN Event Specific Variables
| 
| IN: AssetSeqNumber 
| IN: CurrentUserID 
| IN: CustomID 
| IN: PermitId1 
| IN: PermitId2 
| IN: PermitId3 
/------------------------------------------------------------------------------------------------------*/
//Log All Environmental Variables as  globals
var AssetSeqNumber = aa.env.getValue("AssetSeqNumber");			logDebug("AssetSeqNumber = " + AssetSeqNumber);
/*------------------------------------------------------------------------------------------------------/
| END Event Specific Variables
/------------------------------------------------------------------------------------------------------*/

if (preExecute.length) doStandardChoiceActions(preExecute,true,0); 	// run Pre-execution code

logGlobals(AInfo);

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/

doStandardChoiceActions(controlString,true,0);

//
// Check for invoicing of fees
//
if (feeSeqList.length)
	{
	invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
	if (invoiceResult.getSuccess())
		logMessage("Invoicing assessed fee items is successful.");
	else
		logMessage("**ERROR: Invoicing the fee items assessed to app # " + capIDString + " was not successful.  Reason: " +  invoiceResult.getErrorMessage());
	}

/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
	if (debug.indexOf("**ERROR") > 0)
		{
		aa.env.setValue("ScriptReturnCode", "1");
		aa.env.setValue("ScriptReturnMessage", debug);
		aa.sendMail("noreply@cityofmadison.com","elamsupport@cityofmadison.com","","EMSE:AssociateAssetToWorkOrderAfter",debug);
		}
	else
		{
		aa.env.setValue("ScriptReturnCode", "0");
		if (showMessage) aa.env.setValue("ScriptReturnMessage", message);
		if (showDebug) 	
			{
			aa.env.setValue("ScriptReturnMessage", debug);
			aa.sendMail("noreply@cityofmadison.com","elamsupport@cityofmadison.com","","EMSE:AssociateAssetToWorkOrderAfter",debug);
			}
		}
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/

