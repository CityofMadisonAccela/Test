/*------------------------------------------------------------------------------------------------------/
| SVN $Id: CallFromExp.js
| Program : CallFromExp.0.js
| Event   : CallFromExp
|
| Usage   : Master Script by Accela.  See accompanying documentation and release notes.
|
| Client  : N/A
| Action# : N/A
|
| Notes   :
|
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| START User Configurable Parameters
|
|     Only variables in the following section may be changed.  If any other section is modified, this
|     will no longer be considered a "Master" script and will not be supported in future releases.  If
|     changes are made, please add notes above.
/------------------------------------------------------------------------------------------------------*/

/*------------------------------------------------------------------------------------------------------/
| END User Configurable Parameters
/------------------------------------------------------------------------------------------------------*/
var SCRIPT_VERSION = 2.0

eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS"));
eval(getScriptText("INCLUDES_ACCELA_GLOBALS"));
eval(getScriptText("INCLUDES_CUSTOM"));

function getScriptText(vScriptName){
	vScriptName = vScriptName.toUpperCase();
	var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
	var emseScript = emseBiz.getScriptByPK(aa.getServiceProviderCode(),vScriptName,"ADMIN");
	return emseScript.getScriptText() + "";	
}

/*------------------------------------------------------------------------------------------------------/
| BEGIN Event Specific Variables
/------------------------------------------------------------------------------------------------------*/
var appStatus = aa.env.getValue("ApplicationStatus"); logDebug("appStatus = " + appStatus);
var statusComment = aa.env.getValue("StatusComment");  logDebug("statusComment = " + statusComment);
var statusDate = aa.env.getValue("StatusDate");   logDebug("statusDate = " + statusDate);
showDebug = true;
/*------------------------------------------------------------------------------------------------------/
| END Event Specific Variables
/------------------------------------------------------------------------------------------------------*/

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/


logDebug("WHAT ABOUT ASSET 19?");
//var asset19 = aa.asset.getAssetData("19").getOutput(); debugObject(asset19);
//debugObject(aa.workOrder); debugObject(aa);
//logDebug("After work order , asset is:"); debugObject(aa.asset); var woasm = aa.asset.newWorkOrderAssetScriptModel().getOutput(); 
//woasm ^ woasm.setAssetPK(asset19.assetPK); woasm.setCapID(capId); aa.asset.createWorkOrderAsset(woasm.getWorkOrderAssetModel());
editAppSpecific("SR - ENGINEERING MAINTENANCE.Facility", "Very Special Place");

//doStandardChoiceActions(controlString,true,0);

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
	}
else
	{
	aa.env.setValue("ScriptReturnCode", "0");
	if (showMessage) aa.env.setValue("ScriptReturnMessage", message);
	if (showDebug) 	aa.env.setValue("ScriptReturnMessage", debug);
	}


/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/