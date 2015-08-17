/*------------------------------------------------------------------------------------------------------/
| Program: Vending Batch Expiration.js  Trigger: Batch
| Client: Madison
| Version 1.0 Matt Couper 4/1/2013
| Version 1.1 Matt Couper 4/15/2013 - changes to date logic
| Version 2.0 Matt Couper 4/18/2013 - added Vending Banner permits to close logic
| Version 2.1 Matt Couper 4/19/2013 - added logic to allow for Banners that have already been issued for 
|                                     current year to be evaluated, since they have different work flow
| Version 3.0 Matt Couper 5/23/2013 - new version to account for ASIT values.
| Version 4.0 Jeff Moyer  6/11/2013 - Redoing this batch script to account for Banner Permit.
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var emailText = "";
var supportText = "";
var showDebug = true; // Set to true to see debug messages in email confirmation
var maxSeconds = 60 * 5; // number of seconds allowed for batch processing, usually < 5*60
var showMessage = false;
var useAppSpecificGroupName = true;
var br = "<BR>";
var tab = "    ";
wfObjArray = null;

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
var timeExpired = false;
var report = "";
var startTime = startDate.getTime(); // Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var timeExpired = false;
var emailAddress = "jmoyer@cityofmadison.com"; //email to send report
var elamsupport = "elamSupport@cityofmadison.com";//email for batch

var capId;
var altId;

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
	logDebug("Starting the timer for this job.  If it takes longer than 5 minutes an error will be listed at the bottom of the email." + br);
	if (!timeExpired) {
		processTEMPermits();
		processBannerPermits();
		logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
		logDebug("End Date: " + startDate);
		aa.sendMail("noreply@cityofmadison.com", elamsupport, "", "Batch Job - Vending Permits Expired", supportText);
	}
}
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/
function processTEMPermits() {
	var toDate = new Date();
	toDate = new Date(dateAdd(toDate,0));

	logDebug("This reports the full list of Issued - TEM Permits that will be reviewed for closure.  Close if Expiration Dates before " + 
	toDate + br);

	var wfResult = aa.workflow.getTasks("Permit Issuance", "Issued - TEM");
	
	if (wfResult.getSuccess()) {
		workFlow = wfResult.getOutput();
		logDebug(br +"**The number of Vending TEM Permits that are Issued: " + workFlow.length + br);
	} else {
		logDebug("ERROR: Retrieving permits: " + wfResult.getErrorType() + ":" + wfResult.getErrorMessage());
		return false;
	}
	
	for (wf in workFlow) {
		if (elapsed() > maxSeconds) {
			logDebug("A script time out has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + 
			maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		b1WF = workFlow[wf];
		capId = aa.cap.getCapID(b1WF.getCapID().getID1(),b1WF.getCapID().getID2(),b1WF.getCapID().getID3()).getOutput();
		altId = capId.getCustomID();
		cap = aa.cap.getCap(capId).getOutput();
		if (cap) {
			appTypeResult = cap.getCapType();
			appTypeString = appTypeResult.toString();
			appTypeArray = appTypeString.split("/");
			if(appTypeArray[0] == "Permitting" && appTypeArray[1] == "Vending" && appTypeArray[2] == "TEM" && appTypeArray[3] == "NA") {
				var table = "No";
				var expressive = "No";
				var mobile = "No";
				var tableDate = new Date("12/12/2000");
				var expressiveDate = new Date("12/12/2000");
				var mobileDate = new Date("12/12/2000");
				table = getAppSpecific("INFORMATION TABLE PERMIT.Information Table", capId);
				expressive = getAppSpecific("EXPRESSIVE STREET VENDING.Expressive Street Vending", capId);
				mobile = getAppSpecific("MOBILE SALES.Mobile Sales of Expressive Items", capId);
				logDebug("<b>" + altId + "</b> is being reviewed");
				if (table == "Yes") {
					tableDate = new Date(getAppSpecific("INFORMATION TABLE PERMIT.Expiration Date", capId));
					logDebug("Table Date: " + tableDate);
				} 
				if (expressive == "Yes") {
					expressiveDate = new Date(getAppSpecific("EXPRESSIVE STREET VENDING.Expiration Date", capId));
					logDebug("Expressive Date: " + expressiveDate);
				} 
				if (mobile == "Yes") {
					mobileDate = new Date(getAppSpecific("MOBILE SALES.Expiration Date", capId));
					logDebug("Mobile Date: " + mobileDate);
				}
				if ((tableDate <= toDate) && (expressiveDate <= toDate) && (mobileDate <= toDate)) {
					getContactInfo("Applicant or Contact");
					closeTask(capId, "Permit Issuance", "Complete", "This task was automatically closed by batch process.", "", "PERVENTEM");
					closeTask(capId, "Closed", "Closed", "This task was automatically closed by batch process.", "", "PERVENTEM");
					logDebug("<b>" + contactBusiness + "(" + contactName + ")</b> had " +  altId + " close." + br);
				} else {
					getContactInfo("Applicant or Contact");
					logDebug("<b>" + contactBusiness + "(" + contactName + ")</b> had " +  altId + " close." + br);
				}
			}
		}
	}	
	logDebug(br);
	aa.sendMail("noreply@cityofmadison.com", emailAddress, "", "Batch Job - Vending TEM Permits Expired", emailText);
	emailText = "";
}

function processBannerPermits() {
	var toDate = new Date();
	toDate = new Date(dateAdd(toDate,0));
	logDebug("This reports the full list of Banner Permits that will be reviewed for closure.  Close if Expiration Dates before " + 
	toDate + br);

	var wfResult = aa.workflow.getTasks("Issuance", "Scheduled");
	
	if (wfResult.getSuccess()) {
		workFlow = wfResult.getOutput();
		logDebug(br+"**The number of Vending Banner Permits that are scheduled: " + workFlow.length + br);
	} else {
		logDebug("ERROR: Retrieving permits: " + wfResult.getErrorType() + ":" + wfResult.getErrorMessage());
		return false;
	}
	
	for (wf in workFlow) { 
		if (elapsed() > maxSeconds) { //only continue if time hasn't expired
			logDebug("A script time out has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + 
			maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		b1WF = workFlow[wf];
		var capId = aa.cap.getCapID(b1WF.getCapID().getID1(),b1WF.getCapID().getID2(),b1WF.getCapID().getID3()).getOutput();
		var altId = capId.getCustomID();
		cap = aa.cap.getCap(capId).getOutput();
		if (cap) {
			appTypeResult = cap.getCapType();
			appTypeString = appTypeResult.toString();
			appTypeArray = appTypeString.split("/");
			if(appTypeArray[0] == "Permitting" && appTypeArray[1] == "Vending" && appTypeArray[2] == "Banner" && appTypeArray[3] == "NA") {
				var cntrl = false;
				var tExpBan = new Date("12/12/2000");
				var banASIT = new Array();
				banASIT = loadASITable("DATES REQUESTED", capId);
				logDebug("<b>" + altId + "</b> is being reviewed");
				if (banASIT != null && banASIT != "undefined") {
					for (x in banASIT) {
						var banMsg = banASIT[x]["Exact Banner Message"];
						var tExpBan = new Date(banASIT[x]["Ending Date Approved"]);
						if (tExpBan == "Invalid Date") {
							tExpBan = "Not Approved"
						}
						if (tExpBan > toDate) {
							cntrl = true;
							logDebug("Banner Message - " + banMsg + " expires on " + tExpBan);
						} else {
							logDebug("Banner Message - " + banMsg + " expires on " + tExpBan);
						}
					}
				}
				if (cntrl == false) {
					getContactInfo("Organization");
					closeTask(capId, "Issuance", "Complete", "This task was automatically closed by batch process.", "", "PERVENBAN");
					closeTask(capId, "Closed", "Closed", "This task was automatically closed by batch process.", "", "PERVENBAN");
					logDebug("<b>" + contactBusiness + "(" + contactName + ")</b> had " +  altId + " close." + br);
				} else {
					getContactInfo("Organization");
					logDebug("<b>" + contactBusiness + "(" + contactName + ")</b> had " +  altId + " close." + br);
				}
			}
		}
	}
	aa.sendMail("noreply@cityofmadison.com", emailAddress, "", "Batch Job - Vending Banner Permits Expired", emailText);
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function getContactInfo(contactType) {
	var capContactResult = aa.people.getCapContactByCapID(capId);
	if (capContactResult.getSuccess()) {
		var capContactArray = capContactResult.getOutput();
		for (c in capContactArray) {
			var contact = capContactArray[c];
			var people = contact.getPeople();
			if (people.getContactType() == contactType) {
				contactName = people.getContactName();
				contactBusiness = people.getBusinessName();
			}
		}
		if (contactName == null || contactName == "" ) {
			contactName = "No " + contactType + " on record";
		}
	}
}

function getAppSpecific(itemName) {//optional: itemCap
	var updated = false;
	var i = 0;
	var itemCap = "";
	var itemCap = capId;
	if (arguments.length == 2)
		itemCap = arguments[1]; // use cap ID specified in args
	if (useAppSpecificGroupName) {
		if (itemName.indexOf(".") < 0) {
			logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true");
			return false
		}
		var itemGroup = itemName.substr(0, itemName.indexOf("."));
		var itemName = itemName.substr(itemName.indexOf(".") + 1);
	}
	var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
	if (appSpecInfoResult.getSuccess()) {
		var appspecObj = appSpecInfoResult.getOutput();
		if (itemName != "") {
			for (i in appspecObj) {
				if (appspecObj[i].getCheckboxDesc() == itemName && (!useAppSpecificGroupName || appspecObj[i].getCheckboxType() == itemGroup)) {
					return appspecObj[i].getChecklistComment();
					break;
				}
			}
		}
	} else {
		logDebug("**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage())
	}
}

function closeTask(itemCap, wfstr,wfstat,wfcomment,wfnote) {//optional process name
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
		logDebug("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); 
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
				logDebug("Closing Workflow Task: " + wfstr + " with status " + wfstat);
			} else {
				aa.workflow.handleDisposition(itemCap,stepnumber,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"Y");
				logDebug("Closing Workflow Task: " + wfstr + " with status " + wfstat);
			}
		}
	}
}

function loadASITable(tname,capId) {//Optional parameter, cap ID to load from
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
	var gm = aa.appSpecificTableScript.getAppSpecificTableGroupModel(itemCap).getOutput();
	var ta = gm.getTablesArray()
	var tai = ta.iterator();
	while (tai.hasNext()) {
		var tsm = tai.next();
		var tn = tsm.getTableName();
		if (!tn.equals(tname)) continue;
		if (tsm.rowIndex.isEmpty()) {
			return false;
		}
		var tempObject = new Array();
		var tempArray = new Array();
		var tsmfldi = tsm.getTableField().iterator();
		var tsmcoli = tsm.getColumns().iterator();
		var readOnlyi = tsm.getAppSpecificTableModel().getReadonlyField().iterator(); //getReadonlyfiled
		var numrows = 1;
		while (tsmfldi.hasNext()) {//cycle through fields
			if (!tsmcoli.hasNext()) {//cycle through columns
				var tsmcoli = tsm.getColumns().iterator();
				tempArray.push(tempObject);//end of record
				var tempObject = new Array();//clear the temp obj
				numrows++;
			}
			var tcol = tsmcoli.next();
			var tval = tsmfldi.next();
			var readOnly = 'N';
			if (readOnlyi.hasNext()) {
				readOnly = readOnlyi.next();
			}
			var fieldInfo = new asiTableValObj(tcol.getColumnName(), tval, readOnly);
			tempObject[tcol.getColumnName()] = fieldInfo;
		}
		tempArray.push(tempObject);//end of record
	}
	return tempArray;
}

function asiTableValObj(columnName, fieldValue, readOnly) {
	this.columnName = columnName;
	this.fieldValue = fieldValue;
	this.readOnly = readOnly;

	asiTableValObj.prototype.toString=function(){ return String(this.fieldValue) }
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
		supportText += dstr + "<br>";
		aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"), dstr)
	}
}