/*------------------------------------------------------------------------------------------------------/
| Program: Batch Expiration.js  Trigger: Batch
| Client: Clerks
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var emailText = "";
var showDebug = true;// Set to true to see debug messages in email confirmation
var maxSeconds = 60 * 5;// number of seconds allowed for batch processing, usually < 5*60
var showMessage = false;
var br = "<BR>";
var tab = "    ";

/*------------------------------------------------------------------------------------------------------/
|
| END: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
sysDate = aa.date.getCurrentDate();

batchJobResult = aa.batchJob.getJobID();
batchJobName = "" + aa.env.getValue("BatchJobName");

batchJobID = 0;
if (batchJobResult.getSuccess()) {
	batchJobID = batchJobResult.getOutput();
	logDebug("Batch Job " + batchJobName + " Job ID is " + batchJobID);
} else {
	logDebug("Batch job ID not found " + batchJobResult.getErrorMessage());
}
/*----------------------------------------------------------------------------------------------------/
|
| Start: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var startDate = new Date();
var compareDate = new Date();
var timeExpired = false;
var startTime = startDate.getTime(); // Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var emailAddress = "jmoyer@cityofmadison.com"; //email to send report
var elamSupport = "";//email for batch

var	emailText = "";
var capCount = 0;
var altId;
var capId;
var fromDate = new Date();
fromDate = dateAddMonths(fromDate, 0); 
	
var newAppStatus = "Closed"
var workflowFlowCode = "LICOPR";//Flow code for above status {U}
/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/
var paramsOK = true;

if (paramsOK) {
	logDebug("Start of Job");
	if (!timeExpired) {
		mainProcess();
		logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
	}
}
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/
function mainProcess() {
		processALRCReview();
		emailText = "";
		processPoliceReview();
}

function processALRCReview() {

	logDebug("Set Operators Licenses to Closed when ALRC Review is past the due date " + fromDate);
	capCount = 0;
	
	var wfResult = aa.workflow.getTasks("ALRC Review", "ALRC Invitation Sent");
	
	if (wfResult.getSuccess()) {
		myWorkFlow = wfResult.getOutput();
		logDebug("Processing " + myWorkFlow.length + " operator work flow records" + br);
	} else { 
		logDebug("ERROR: Getting Operator Work flow, reason is: " + wfResult.getErrorType() + ":" + wfResult.getErrorMessage() + br); 
		return false;
	}
	for (thisWF in myWorkFlow) {  
		
		if (elapsed() > maxSeconds) { //only continue if time hasn't expired
			logDebug("A script time-out has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		
		b1WF = myWorkFlow[thisWF];
		var dueDate = b1WF.getDueDate();
		
		if (dueDate) {
			var b1DueDate = dueDate.getMonth() + "/" + dueDate.getDayOfMonth() + "/" + dueDate.getYear();
			capId = aa.cap.getCapID(b1WF.getCapID().getID1(),b1WF.getCapID().getID2(),b1WF.getCapID().getID3()).getOutput();
			altId = capId.getCustomID();
			var cDueDate = convertDate(b1DueDate);
			var compareDate = convertDate(fromDate);
			
			if (cDueDate < compareDate) {
				logDebug("License updating - " + altId + " due on - " + b1DueDate + br);
				cap = aa.cap.getCap(capId).getOutput();
				capCount++
				if (cap) {
					var capStatus = cap.getCapStatus();
					logDebug("The Status of the application is: " + capStatus);
					//update CAP status
					if (capStatus == "ALRC Invitation Sent") {
						if (newAppStatus != "") {
							updateAppStatus(newAppStatus,"");
							logDebug("Updated Application Status: " + newAppStatus);
						}
						//close workflow
						taskCloseAllNotComplete("Closed","Close Workflow ALRC Review Over Due");
						logDebug(br);
					} else {
					logDebug(br);
					}
				}
			} else {
				logDebug("License due date is not past due(" + b1DueDate + ") for " + altId + br);
			}
		}
	}
	logDebug(br + "Total licenses qualified date range: " + myWorkFlow.length);
	logDebug("Total licenses processed: " + capCount);
	aa.sendMail("noreply@cityofmadison.com", emailAddress, "", "Batch Job - Operator Licenses ALRC Review Over Due", emailText);
}

function processPoliceReview() {

	logDebug("Set Operators Licenses to Closed when Police Review is past the due date: " + fromDate);
	capCount = 0;
	
	var wfResult = aa.workflow.getTasks("Police Review", "Add'l Info Request Sent");
	
	if (wfResult.getSuccess()) {
		myWorkFlow = wfResult.getOutput();
		logDebug("Processing " + myWorkFlow.length + " operator work flow records" + br);
	} else { 
		logDebug("ERROR: Getting Operator Work flow, reason is: " + wfResult.getErrorType() + ":" + wfResult.getErrorMessage() + br); 
		return false;
	}
	for (thisWF in myWorkFlow) {  
		if (elapsed() > maxSeconds) { //only continue if time hasn't expired
			logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		b1WF = myWorkFlow[thisWF];
		var dueDate = b1WF.getDueDate();
		
		if (dueDate) {
			var b1DueDate = dueDate.getMonth() + "/" + dueDate.getDayOfMonth() + "/" + dueDate.getYear();
			capId = aa.cap.getCapID(b1WF.getCapID().getID1(),b1WF.getCapID().getID2(),b1WF.getCapID().getID3()).getOutput();
			altId = capId.getCustomID();
			var cDueDate = convertDate(b1DueDate);
			var compareDate = convertDate(fromDate);
			
			if (cDueDate < compareDate) {
				logDebug("License updating - " + altId + " due on - " + b1DueDate + br);
				cap = aa.cap.getCap(capId).getOutput();
				capCount++
				if (cap) {
					var capStatus = cap.getCapStatus();
					logDebug("The Status of the application is: " + capStatus);
					if (capStatus == "Add'l Info Request Sent") {
						//update CAP status
						if (newAppStatus != "") {
							updateAppStatus(newAppStatus,"");
							logDebug("Updated Application Status: " + newAppStatus);
						}
						//close workflow
						taskCloseAllNotComplete("Closed","Close Workflow Police Review Over Due");
						logDebug(br);
					} else {
						logDebug(br);
					}
				}
			} else {
				logDebug("License due date is not past due(" + b1DueDate + ") for " + altId + br);
			}
		}
	}
	logDebug(br + "Total licenses qualified date range: " + myWorkFlow.length);
	logDebug("Total licenses processed: " + capCount);
	aa.sendMail("noreply@cityofmadison.com", emailAddress, "", "Batch Job - Operator Licenses Police Review Over Due", emailText);
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function debugObject(object) {
	 var output = ''; 
	 for (property in object) { 
	   output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
	 } 
	 logDebug(output);
} 

function updateAppStatus(stat,cmt) {
	updateStatusResult = aa.cap.updateAppStatus(capId,"APPLICATION",stat, sysDate, cmt ,systemUserObj);
	if (!updateStatusResult.getSuccess()) {
		logDebug("ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
	}
}

function elapsed() {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000)
}

function logDebug(dstr) {
	if(showDebug) {
		aa.print(dstr)
		emailText += dstr + "<br>";
		aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"),dstr)
	}
}

//ITJSM - 7/30/2013 - created to close only those tasks not already closed
function taskCloseAllNotComplete(pStatus, pComment) {
	var taskArray = new Array();
	var workflowResult = aa.workflow.getTasks(capId);
 	if (workflowResult.getSuccess()) {
  	 	var wfObj = workflowResult.getOutput();
	} else { 
		logMessage("**ERROR: Failed to get workflow object: " + workflowResult.getErrorMessage()); 
		return false; 
	}
	var fTask;
	var stepnumber;
	var processID;
	var dispositionDate = aa.date.getCurrentDate();
	var wfnote = " ";
	var wftask;
	for (i in wfObj) {
		fTask = wfObj[i];
		wftask = fTask.getTaskDescription();
		stepnumber = fTask.getStepNumber();
		processID = fTask.getProcessID();
		if (fTask.getCompleteFlag().equals("N")) {
				aa.workflow.handleDisposition(capId, stepnumber, pStatus, dispositionDate, wfnote, pComment, systemUserObj,"Y");
				logDebug("Closing Work flow Task " + wftask + " with status " + pStatus);
		}
	}
}

function dateAdd(td,amt) {
	// perform date arithmetic on a string
	// td can be "mm/dd/yyyy" (or any string that will convert to JS date)
	// amt can be positive or negative (5, -3) days
	// if optional parameter #3 is present, use working days only
	var useWorking = false;
	if (arguments.length == 3) {
		useWorking = true;
	}
	
	if (!td) {
		dDate = new Date();
	} else {
		dDate = convertDate(td);
	}
	
	var i = 0;
	
	if (useWorking) {
		if (!aa.calendar.getNextWorkDay) {
			logDebug("getNextWorkDay function is only available in Accela Automation 6.3.2 or higher.");
			while (i < Math.abs(amt)) {
				dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * (amt > 0 ? 1 : -1)));
				if (dDate.getDay() > 0 && dDate.getDay() < 6) {
					i++
				}
			}
		} else {
			while (i < Math.abs(amt)) {
				dDate = new Date(aa.calendar.getNextWorkDay(aa.date.parseDate(dDate.getMonth()+1 + "/" + dDate.getDate() + "/" + dDate.getFullYear())).getOutput().getTime());
				i++;
			}
		}
	} else {
		dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * amt));
	}
	return (dDate.getMonth()+1) + "/" + dDate.getDate() + "/" + dDate.getFullYear();
}

function dateAddMonths(pDate, pMonths) {
	// Adds specified # of months (pMonths) to pDate and returns new date as string in format MM/DD/YYYY
	// If pDate is null, uses current date
	// pMonths can be positive (to add) or negative (to subtract) integer
	// If pDate is on the last day of the month, the new date will also be end of month.
	// If pDate is not the last day of the month, the new date will have the same day of month, unless such a day doesn't exist in the month, in which case the new date will be on the last day of the month
	//
	if (!pDate) {
		baseDate = new Date();
	} else {
		baseDate = convertDate(pDate);
	}
	
	var day = baseDate.getDate();
	
	baseDate.setMonth(baseDate.getMonth() + pMonths);
	
	if (baseDate.getDate() < day) {
		baseDate.setDate(1);
		baseDate.setDate(baseDate.getDate() - 1);
		}
		
	return ((baseDate.getMonth() + 1) + "/" + baseDate.getDate() + "/" + baseDate.getFullYear());
}

function convertDate(thisDate) {

	if (typeof(thisDate) == "string") {
		var retVal = new Date(String(thisDate));
		if (!retVal.toString().equals("Invalid Date"))
		return retVal;
	}

	if (typeof(thisDate)== "object") {

		if (!thisDate.getClass) {// object without getClass, assume that this is a javascript date already 
			return thisDate;
		}

		if (thisDate.getClass().toString().equals("class com.accela.aa.emse.util.ScriptDateTime")) {
			return new Date(thisDate.getMonth() + "/" + thisDate.getDayOfMonth() + "/" + thisDate.getYear());
		}

		if (thisDate.getClass().toString().equals("class java.util.Date")) {
			return new Date(thisDate.getTime());
		}

		if (thisDate.getClass().toString().equals("class java.lang.String")) {
			return new Date(String(thisDate));
		}
	}

	if (typeof(thisDate) == "number") {
		return new Date(thisDate);  // assume milliseconds
	}

	logDebug("**WARNING** convertDate cannot parse date : " + thisDate);
	return null;
}

function jsDateToMMDDYYYY(pJavaScriptDate)
	{
	//converts javascript date to string in MM/DD/YYYY format
	//
	if (pJavaScriptDate != null)
		{
		if (Date.prototype.isPrototypeOf(pJavaScriptDate))
	return (pJavaScriptDate.getMonth()+1).toString()+"/"+pJavaScriptDate.getDate()+"/"+pJavaScriptDate.getFullYear();
		else
			{
			logDebug("Parameter is not a javascript date");
			return ("INVALID JAVASCRIPT DATE");
			}
		}
	else
		{
		logDebug("Parameter is null");
		return ("NULL PARAMETER VALUE");
		}
	}