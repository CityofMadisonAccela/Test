/*------------------------------------------------------------------------------------------------------/
| SVN $Id: InspectionResultSubmitBefore.js 1249 2008-01-10 18:57:01Z john.schomp $
| Program : InspectionResultSubmitBeforeV2.0.js
| Event   : InspectionResultSubmitBefore
|
| Usage   : Master Script by Accela.  See accompanying documentation and release notes.
|
| Client  : N/A
| Action# : N/A
|
| Notes   : There are several issues with this script.  The first is reflected in SalesForce Case#08ACC-04874
|           which describes the fact that the inspectionId parameter is passed incorrectly from the event.
|           Until this is fixed the script will not be able to access the inspection object.
|           Also, it is typical on new implementations that the parameters are not set up correctly for
|           this event.  Please make sure the following are added (via superagency) :
|            - CurrentUserID, InspectionId (not passed), InspectionResult, InspectionResultComment
|            - InspectionResultCommentId, InspectionType, PermitId1, PermitId2, PermitId3, StaffFirstName
|            - StaffLastName, StaffMiddleName
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| START User Configurable Parameters
|
|     Only variables in the following section may be changed.  If any other section is modified, this
|     will no longer be considered a "Master" script and will not be supported in future releases.  If
|     changes are made, please add notes above.
/------------------------------------------------------------------------------------------------------*/

var controlString = "InspectionResultSubmitBefore";			// Standard choice for control
var preExecute = "PreExecuteForBeforeEvents"				// Standard choice to execute first (for globals, etc)
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
/------------------------------------------------------------------------------------------------------*/
var inspType = aa.env.getValue("InspectionType")
var inspResult = aa.env.getValue("InspectionResult")
var inspResultComment = aa.env.getValue("InspectionResultComment");
var inspComment = inspResultComment; // consistency with events
var inspId = aa.env.getValue("InspectionId");

if (inspId > 0) // if we have fixed the parameter problem
	{
	inspObj = aa.inspection.getInspection(capId,inspId).getOutput();  // current inspection object
	inspGroup = inspObj.getInspection().getInspectionGroup();
	inspSchedDate = inspObj.getScheduledDate().getMonth() + "/" + inspObj.getScheduledDate().getDayOfMonth() + "/" + inspObj.getScheduledDate().getYear();
	//inspResultDate = inspObj.getInspectionStatusDate().getMonth() + "/" + inspObj.getInspectionStatusDate().getDayOfMonth() + "/" + inspObj.getInspectionStatusDate().getYear();
	logDebug("inspId " + inspId);
	logDebug("inspGroup = " + inspGroup);
	logDebug("inspSchedDate = " + inspSchedDate);
	//logDebug("inspResultDate = " + inspResultDate);
	}

logDebug("inspType = " + inspType);
logDebug("inspResult = " + inspResult);
logDebug("inspResultComment = " + inspResultComment);
logDebug("inspComment = " + inspComment);

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
	}
else
	{
	if (cancel)
		{
		aa.env.setValue("ScriptReturnCode", "1");
		if (showMessage) aa.env.setValue("ScriptReturnMessage", "<font color=red><b>Action Cancelled</b></font><br><br>" + message);
		if (showDebug) 	aa.env.setValue("ScriptReturnMessage", "<font color=red><b>Action Cancelled</b></font><br><br>" + debug);
		}
	else
		{
		aa.env.setValue("ScriptReturnCode", "0");
		if (showMessage) aa.env.setValue("ScriptReturnMessage", message);
		if (showDebug) 	aa.env.setValue("ScriptReturnMessage", debug);
		}
	}

/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/