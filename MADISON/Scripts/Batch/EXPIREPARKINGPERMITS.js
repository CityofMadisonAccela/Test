/*------------------------------------------------------------------------------------------------------/
| Program: Batch Expiration.js  Trigger: Batch
| Client: 
|
| Version 1.0 - Base Version. 11/01/08 JHS
| Version 1.1 - Updates based on config 02/21/09
| Version 1.2 - Only create sets if CAPS qualify 02/26/09
| Version 1.3 - Added ability to lock parent license (for adv permits) 1/12/10
| Version 1.4 - Updated to take in to account About to Expire App Status and Expiration Status 7/17/2013 ITJSM
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var emailText = "";
var showDebug = true;
var showMessage = false;
var maxSeconds = 60 * 5;
var timeExpired = false;
var br = "<BR>";
var tab = "&nbsp&nbsp&nbsp&nbsp;";
/*------------------------------------------------------------------------------------------------------/
|
| END: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
sysDate = aa.date.getCurrentDate();

batchJobResult = aa.batchJob.getJobID()
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
var startTime = startDate.getTime();
var systemUserObj = aa.person.getUser("ADMIN").getOutput();

var cAppGroup = "Permitting";
var cAppType = "Parking";
var cAppSubtype =  "Residential Parking";
var cAppCategory = "*";
var curStatus = "";
var newStatus = "";
var process = "";
var fromDate = "08/31/" + startDate.getFullYear();
var toDate = "09/01/" + startDate.getFullYear();
var capId = null;
var emailAddress = "jmoyer@cityofmadison.com";

/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var paramsOK = true;

if (paramsOK) {
	logDebug("This process started on " + startDate + br);
	if (!timeExpired) {
		mainProcess();
		logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
		aa.sendMail("noreply@cityofmadison.com", emailAddress, "", batchJobName + " Results", emailText);
	}
}

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/
function mainProcess() {
	var activeStartDate = new Date("07/01/" + startDate.getFullYear());
	var activeEndDate = new Date("07/31/" + startDate.getFullYear());
	var aboutStartDate = new Date("09/01/" + startDate.getFullYear());
	var aboutEndDate = new Date("09/30/" + startDate.getFullYear());
	
	if (startDate >= activeStartDate && startDate <= activeEndDate) {
		curStatus = "Active";
		newStatus = "About to Expire";
		process = "Active to About to Expire";
		processExpiration();
	} else if (startDate >= aboutStartDate && startDate <= aboutEndDate) {
		curStatus = "About to Expire";
		newStatus = "Expired";
		process = "About to Expire to Expired";
		processExpiration();
		fromDate = "08/31/" + (startDate.getFullYear() - 1);
		toDate = "09/01/" + (startDate.getFullYear() - 1);
		curStatus = "Expired";
		newStatus = "Inactive";
		process = "Expired to Inactive";
		processExpiration();
	}
}

function processExpiration() {
	logDebug("<b>Processing: " + process + "</b>" + br);
	logDebug("Date Range for Expiration Date to be between -- fromDate: " + fromDate + ", toDate: " + toDate);
	
	var expResult = aa.expiration.getLicensesByDate(curStatus, fromDate, toDate);

	if (expResult.getSuccess()) {
		myExp = expResult.getOutput();
		logDebug("Total number of records being reviewed: " + myExp.length + br);
	} else { 
		logDebug("ERROR: Getting Expirations, reason is: " + expResult.getErrorType() + ":" + expResult.getErrorMessage() + br); 
		return false
	}
	for (thisExp in myExp)  {
		if (elapsed() > maxSeconds) {
			logDebug("A script time out has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " 
				+ maxSeconds + " allowed.") ;
			timeExpired = true ;
			break;
		}
		b1Exp = myExp[thisExp];
		var	expDate = b1Exp.getExpDate();
		if (expDate) {
			var b1ExpDate = expDate.getMonth() + "/" + expDate.getDayOfMonth() + "/" + expDate.getYear();
		}
		var b1Status = b1Exp.getExpStatus();
		capId = aa.cap.getCapID(b1Exp.getCapID().getID1(),b1Exp.getCapID().getID2(),b1Exp.getCapID().getID3()).getOutput();
		altId = capId.getCustomID();
		cap = aa.cap.getCap(capId).getOutput();		
		appTypeResult = cap.getCapType();
		appTypeString = appTypeResult.toString();
		appTypeArray = appTypeString.split("/");

		if (appTypeArray[0] == cAppGroup && appTypeArray[1] == cAppType && appTypeArray[2] == cAppSubtype) {
			var capStatus = cap.getCapStatus();
			if (capStatus == "Active" || capStatus == "About to Expire" || capStatus == "Expired") {
				logDebug("<b>" + altId + "</b>");
				logDebug(tab + "Permit Type: " + appTypeArray[2]);
				logDebug(tab + "Renewal Status: " + b1Status); 
				logDebug(tab + "Expires on: " + b1ExpDate);
				//update Expiration Status
				b1Exp.setExpStatus(newStatus);
				aa.expiration.editB1Expiration(b1Exp.getB1Expiration());
				logDebug(tab + "Updated Expiration Status: " + newStatus);
				//update CAP status
				updateAppStatus(newStatus,"Set to " + newStatus + " by Expire batch process.");
				logDebug(tab + "Updated Application Status: " + newStatus);
				if (process == "Expired to Inactive") {
					closeTask(capId, "License Status", "Expired", "This task was automatically closed by batch process.", "", "TUPRPP");
					closeTask(capId, "Closed", "Closed", "This task was automatically closed by batch process.", "", "TUPRPP");
					logDebug(tab + "Work flow was closed");
				}
				logDebug(br);
			}
		}
	}
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function updateAppStatus(stat,cmt) {
	updateStatusResult = aa.cap.updateAppStatus(capId,"APPLICATION",stat, sysDate, cmt ,systemUserObj);
	if (!updateStatusResult.getSuccess()) {
		logDebug("ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
	}
}

function closeTask(itemCap,wfstr,wfstat,wfcomment,wfnote) {//optional process name
	var useProcess = false;
	var processName = "";
	if (arguments.length == 5) {
		processName = arguments[4]; //subprocess
		useProcess = true;
	}
	var workflowResult = aa.workflow.getTasks(itemCap);
	if (workflowResult.getSuccess()) {
		var wfObj = workflowResult.getOutput();
	} else { 
		logDebug("**ERROR: Failed to get work flow object: " + s_capResult.getErrorMessage()); 
		return false;
	}
	if (!wfstat) wfstat = "NA";
	for (i in wfObj) {
   		var fTask = wfObj[i];
 		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName))) {
			var dispositionDate = aa.date.getCurrentDate();
			var stepnumber = fTask.getStepNumber();
			var processID = fTask.getProcessID();
			if (useProcess) {
				aa.workflow.handleDisposition(itemCap,stepnumber,processID,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"Y");
				logDebug(tab + "Closing Work flow Task: " + wfstr + " with status " + wfstat);
			} else {
				aa.workflow.handleDisposition(itemCap,stepnumber,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"Y");
				logDebug(tab + "Closing Work flow Task: " + wfstr + " with status " + wfstat);
			}
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
	// If pDate is not the last day of the month, the new date will have the same day of month, unless such a day doesn't exist in the month, 
	// in which case the new date will be on the last day of the month
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
	//converts date to javascript date
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

function jsDateToMMDDYYYY(pJavaScriptDate) {
	//converts javascript date to string in MM/DD/YYYY format
	if (pJavaScriptDate != null) {
		if (Date.prototype.isPrototypeOf(pJavaScriptDate)) {
			return (pJavaScriptDate.getMonth()+1).toString()+"/"+pJavaScriptDate.getDate()+"/"+pJavaScriptDate.getFullYear();
		} else {
			logDebug("Parameter is not a javascript date");
			return ("INVALID JAVASCRIPT DATE");
		}
	} else {
		logDebug("Parameter is null");
		return ("NULL PARAMETER VALUE");
	}
}

function debugObject(object) {
	 var output = ''; 
	 for (property in object) { 
	   output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
	 } 
	 logDebug(output);
} 

function elapsed() {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000)
}

function logDebug(dstr) {
	if (showDebug) {
		aa.print(dstr)
		emailText += dstr + "<br>";
		aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"), dstr)
	}
}