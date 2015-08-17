/*------------------------------------------------------------------------------------------------------/
| Program: ROW Warranty Expiration.js  Trigger: Batch
| Client: Madison
| Version 1.0 Jeff Moyer 6/11/2013
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var emailText = "";
var showDebug = true;
var showMessage = false;
var useAppSpecificGroupName = true;
var br = "<BR>";
var tab = "    ";

sysDate = aa.date.getCurrentDate();

batchJobResult = aa.batchJob.getJobID();
batchJobName = "" + aa.env.getValue("BatchJobName");

batchJobID = 0;
if (batchJobResult.getSuccess()) {
	batchJobID = batchJobResult.getOutput();
	logDebug("Batch Job " + batchJobName + " Job ID is " + batchJobID + br);
} else {
	logDebug("Batch job ID not found " + batchJobResult.getErrorMessage());
}
/*----------------------------------------------------------------------------------------------------/
|
| Start: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var startDate = new Date();
var startTime = startDate.getTime(); // Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var emailAddress = "jmoyer@cityofmadison.com"; //email to send report
var elamSupport = " ";//email for batch

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
	logDebug("Start Date: " + startDate + br);
	mainProcess();
	logDebug("End Date: " + startDate);
	aa.sendMail("noreply@cityofmadison.com", emailAddress, elamSupport, "ROW Permit Close Report", emailText);
}
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/
function mainProcess() {
	logDebug("This process updates the Due Date and Warranty Period step for the ROW permits in the warranty period step." + br);

	var appResult = aa.cap.getByAppType("Permitting", "Engineering", "ROW", "NA");

	if (appResult.getSuccess()) {
		apps = appResult.getOutput();
		logDebug("The number of ROW Permits: " + apps.length + br);
	} else {
		logDebug("ERROR: Retrieving permits: " + appResult.getErrorType() + ":" + appResult.getErrorMessage());
		return false;
	}

	for (a in apps) {
		b1App = apps[a];
		var b1CapId = b1App.getCapID();
		var capId = aa.cap.getCapID(b1CapId.getID1(), b1CapId.getID2(), b1CapId.getID3()).getOutput();
		var altId = capId.getCustomID();
		cap = aa.cap.getCap(capId).getOutput();
		
		if (cap) {
			var appStatus = cap.getCapStatus();
			if (appStatus == "Warranty Period") {
				var workflowResult = aa.workflow.getTasks(capId);
				if (workflowResult.getSuccess()) {
					var wfObj = workflowResult.getOutput();
				} else { 
					logDebug("Failed to get work flow object."); 
				}
				for (i in wfObj) {
					var fTask = wfObj[i];
					if (fTask.getTaskDescription().toUpperCase().equals("INSPECTION")) {
						var statusDate = wfObj[i].getStatusDate();
					}
					if (fTask.getTaskDescription().toUpperCase().equals("WARRANTY PERIOD")) {
						logDebug(altId);
						updateTask("Warranty Period","Warranty Period","Updated to work with Warranty Expire batch script.", "", "ENGROWEXC", capId);
						var dueDate = dateAdd(statusDate, 1095);
						editTaskDueDate("Warranty Period",dueDate)
					}
				}
			}
		}
	}
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function updateTask(wfstr,wfstat,wfcomment,wfnote) {//optional cap id
	var useProcess = false;
	var processName = "";
	if (arguments.length > 4) {
		if (arguments[4] != "") {
			processName = arguments[4]; //subprocess
			useProcess = true;
		}
	}
	//var itemCap = capId;
	if (arguments.length == 6) itemCap = arguments[5]; //use cap ID specified in args
 	var workflowResult = aa.workflow.getTasks(itemCap);
	if (workflowResult.getSuccess()) {
		var wfObj = workflowResult.getOutput();
	} else { 
		logMessage("**ERROR: Failed to get work flow object: " + s_capResult.getErrorMessage());
		return false; 
	}
    if (!wfstat) wfstat = "NA"; {
		for (i in wfObj) {
			var fTask = wfObj[i];
			if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName))) {
				var dispositionDate = aa.date.getCurrentDate();
				var stepnumber = fTask.getStepNumber();
				var processID = fTask.getProcessID();
				if (useProcess) {
					aa.workflow.handleDisposition(itemCap,stepnumber,processID,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj,"U");
				} else {
					aa.workflow.handleDisposition(itemCap,stepnumber,wfstat,dispositionDate,wfnote,wfcomment,systemUserObj,"U");
					logMessage("Updating Work flow Task " + wfstr + " with status " + wfstat);
					logDebug("Updating Work flow Task " + wfstr + " with status " + wfstat);
				}
			}
		}
	}
}
	
function editTaskDueDate(wfstr,wfdate) {//optional capId
	if (arguments.length == 3) {
		itemCap = arguments[2];//capId
	}
	var workflowResult = aa.workflow.getTasks(itemCap);
 	if (workflowResult.getSuccess()) {
  	 	wfObj = workflowResult.getOutput();
  	} else {
		logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); 
		return false;
	}
	for (i in wfObj) {
   		var fTask = wfObj[i];
  		if ((fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) || wfstr == "*")) {
			wfObj[i].setDueDate(aa.date.parseDate(wfdate));
			var fTaskModel = wfObj[i].getTaskItem();
			var tResult = aa.workflow.adjustTaskWithNoAudit(fTaskModel);
			if (tResult.getSuccess()) {
				logDebug("Set Workflow Task: " + fTask.getTaskDescription() + " due Date " + wfdate);
		  	} else {
				logMessage("**ERROR: Failed to update due date on workflow: " + tResult.getErrorMessage());
				return false;
			}
		}			
	}
}

function dateAdd(td, amt) {
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
				dDate = new Date(aa.calendar.getNextWorkDay(aa.date.parseDate(dDate.getMonth() + 1 + "/" + dDate.getDate() + "/" + dDate.getFullYear())).getOutput().getTime());
				i++;
			}
		}
	} else {
		dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * amt));
	}
	return (dDate.getMonth() + 1) + "/" + dDate.getDate() + "/" + dDate.getFullYear();
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
	if (typeof(thisDate) == "object") {
		if (!thisDate.getClass) { // object without getClass, assume that this is a javascript date already
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
		return new Date(thisDate); // assume milliseconds
	}
	logDebug("**WARNING** convertDate cannot parse date : " + thisDate);
	return null;
}

function jsDateToMMDDYYYY(pJavaScriptDate) {
	//converts javascript date to string in MM/DD/YYYY format
	if (pJavaScriptDate != null) {
		if (Date.prototype.isPrototypeOf(pJavaScriptDate)) {
			return (pJavaScriptDate.getMonth() + 1).toString() + "/" + pJavaScriptDate.getDate() + "/" + pJavaScriptDate.getFullYear();
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
		output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" + '; ' + "<BR>";
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