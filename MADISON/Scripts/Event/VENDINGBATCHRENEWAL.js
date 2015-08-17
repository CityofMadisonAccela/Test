/*------------------------------------------------------------------------------------------------------/
| Program: Vending Batch Expiration.js  Trigger: Batch
| Client: Madison
| Version 1.0 Jeff Moyer 3/13/2013
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
var useAppSpecificGroupName = true;
var br = "<BR>";
var tab = "&nbsp;&nbsp;&nbsp;&nbsp;";

sysDate = aa.date.getCurrentDate();
batchJobResult = aa.batchJob.getJobID();
batchJobName = "" + aa.env.getValue("BatchJobName");
wfObjArray = null;

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
var timeDate = new Date();
var startTime = timeDate.getTime();// Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var timeExpired = false;
var emailAddress = "jmoyer@cityofmadison.com";//email to send report
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
	logDebug("Start Date: " + startDate+ br);
	logDebug("Starting the timer for this job.  If it takes longer than 5 minutes an error will be listed at the bottom of the email." + br);
	if (!timeExpired) {
		mainProcess();
		logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
		logDebug("End Date: " + startDate);
		aa.sendMail("noreply@cityofmadison.com", emailAddress, "", "Batch Job - Vending Licenses Expired", emailText);
	}
}
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/
function mainProcess() {
	
	var febBeginDate = new Date("2/14/" + startDate.getFullYear());
	var febEndDate = new Date("2/28/" + startDate.getFullYear());
	var aprBeginDate = new Date("4/14/" + startDate.getFullYear());
	var aprEndDate = new Date("4/30/" + startDate.getFullYear());
	
	logDebug("Run Date: " + startDate);
	logDebug("February Begin Date: " + febBeginDate);
	logDebug("February End Date: " + febEndDate);
	logDebug("April Begin Date: " + aprBeginDate);
	logDebug("April End Date: " + aprEndDate + br); 
	
	if (startDate >= febBeginDate && startDate <= febEndDate) {
		logDebug("Processing annual active licenses and 30-Day licenses.  This process runs on 2/15 of the current year and processes licenses that expire on 4/15 " +
		"of the current year.");
		processAnnualActive();
		logDebug("Processing annual active and 30-Day licenses completed." + br);
	} else if (startDate >= aprBeginDate && startDate <= aprEndDate) {
		logDebug("Processing annual about to expire licenses.  This process runs on 4/15 of the current year and processes licenses that expire on 4/15 " +
		"of the current year.");
		processAnnualAboutToExpire();
		logDebug("Processing annual about to expire licenses completed." + br);
		logDebug("Processing 30-Day licenses.  This process runs on the 15th of every month and closes expired 30-day licenses for the previous month.");
		processThirtyDayActive();
		logDebug("Processing 30-Day licenses completed." + br);
		logDebug("Processing annual expired licenses.  This process runs on 4/15 of the current year and processes licenses that expire on 4/15 " +
		"of previous years.");
		processAnnualExpired();
		logDebug("Processing annual expired licenses completed." + br);
	} else {
		logDebug("Processing 30-Day licenses.  This process runs on the 15th of every month and closes expired 30-day licenses for the previous month.");
		processThirtyDayActive();
		logDebug("Processing 30-Day licenses completed." + br);
	}
}

function processAnnualExpired() { //Set currently Expired Annual Licenses to Closed
	var fromDate = new Date("4/14/" + startDate.getFullYear());
	var toDate = new Date("4/15/" + startDate.getFullYear());
	fromDate = dateAddMonths(fromDate, -14); 
	toDate = dateAddMonths(toDate, -12);
	
	logDebug("Set currently expired annual Vending licenses to closed. Expired licenses will be retreived for date range -- From Date: " + 
	fromDate + ", To Date: " + toDate + "." + br);
	
	var expResult = aa.expiration.getLicensesByDate("Expired",fromDate,toDate);
	
	if (expResult.getSuccess()) {
		myExp = expResult.getOutput();
		logDebug("Processing " + myExp.length + " expiration records." + br);
	} else { 
		logDebug("ERROR: Getting Expirations, reason is: " + expResult.getErrorType() + ":" + expResult.getErrorMessage()); 
		return false;
	}
	
	for (thisExp in myExp) {
		
		if (elapsed() > maxSeconds) {
			logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		
		b1Exp = myExp[thisExp];
		var expDate = b1Exp.getExpDate();
		
		if (expDate) {
			
			var b1ExpDate = expDate.getMonth() + "/" + expDate.getDayOfMonth() + "/" + expDate.getYear();
			var b1Status = b1Exp.getExpStatus();
			capId = aa.cap.getCapID(b1Exp.getCapID().getID1(),b1Exp.getCapID().getID2(),b1Exp.getCapID().getID3()).getOutput();
			altId = capId.getCustomID();
			cap = aa.cap.getCap(capId).getOutput();
			
			if (cap) {
				appTypeResult = cap.getCapType();
				appTypeString = appTypeResult.toString();
				appTypeArray = appTypeString.split("/");
				var licenseType = "Annual";
				
				if(appTypeArray[0] == "Licenses" && appTypeArray[1] == "Vending" && appTypeArray[3] == "NA") {
					
					licenseType = checkLicenseType(appTypeArray);
					
					if (licenseType == "Annual") {
						logDebug("<b>" + altId + "</b>");
						logDebug(tab + "License Type: " + appTypeArray[2]);
						logDebug(tab + "Renewal Status: " + b1Status); 
						logDebug(tab + "Expires on: " + b1ExpDate);
						logDebug(tab + "License Duration: " + licenseType);
						getContactInfo();
						//update Expiration Status
						b1Exp.setExpStatus("Inactive");
						aa.expiration.editB1Expiration(b1Exp.getB1Expiration());
						logDebug(tab + "Updated Expiration Status: Inactive");
						//update CAP status
						updateAppStatus("Closed","Set to Closed by Expire batch process.");
						logDebug(tab + "Updated Application Status: Closed");
						//close Workflow
						taskCloseAllExcept("Closed","Closed by Expire Process")
						logDebug(tab + "Closed all workflow steps with Status: Closed" + br);
					}
				}
			}
		}
	}
}

function processAnnualAboutToExpire() { //Set currently About to Expire Annual Licenses to Expired
	var fromDate = new Date("4/14/" + startDate.getFullYear());
	var toDate = new Date("4/15/" + startDate.getFullYear());
	fromDate = dateAddMonths(fromDate, -2); 
	toDate = dateAddMonths(toDate, 0);
	
	logDebug("Set currently about to expire annual Vending licenses to expired. About to expire licenses will be retreived for date range -- From Date: " +
	fromDate + ", To Date: " + toDate + "." + br);
	
	var expResult = aa.expiration.getLicensesByDate("About to Expire",fromDate,toDate);
	
	if (expResult.getSuccess()) {
		myExp = expResult.getOutput();
		logDebug("Processing " + myExp.length + " expiration records." + br);
	} else { 
		logDebug("ERROR: Getting Expirations, reason is: " + expResult.getErrorType() + ":" + expResult.getErrorMessage()); 
		return false;
	}
	
	for (thisExp in myExp) {
		
		if (elapsed() > maxSeconds) {
			logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		
		b1Exp = myExp[thisExp];
		var expDate = b1Exp.getExpDate();
		
		if (expDate) {
			
			var b1ExpDate = expDate.getMonth() + "/" + expDate.getDayOfMonth() + "/" + expDate.getYear();
			var b1Status = b1Exp.getExpStatus();
			capId = aa.cap.getCapID(b1Exp.getCapID().getID1(),b1Exp.getCapID().getID2(),b1Exp.getCapID().getID3()).getOutput();
			altId = capId.getCustomID();
			cap = aa.cap.getCap(capId).getOutput();
			
			if (cap) {
				appTypeResult = cap.getCapType();
				appTypeString = appTypeResult.toString();
				appTypeArray = appTypeString.split("/");
				var licenseType = "Annual";
				
				if(appTypeArray[0] == "Licenses" && appTypeArray[1] == "Vending" && appTypeArray[3] == "NA") {
					
					licenseType = checkLicenseType(appTypeArray);
					
					if (licenseType == "Annual") { 
						logDebug("<b>" + altId + "</b>");
						logDebug(tab + "License Type: " + appTypeArray[2]);
						logDebug(tab + "Renewal Status: " + b1Status); 
						logDebug(tab + "Expires on: " + b1ExpDate);
						logDebug(tab + "License Duration: " + licenseType);
						getContactInfo();
						//update Expiration Status
						b1Exp.setExpStatus("Expired");
						aa.expiration.editB1Expiration(b1Exp.getB1Expiration());
						logDebug(tab + "Updated Expiration Status: Expired");
						//update CAP status
						updateAppStatus("Expired","Set to Expired by Expire batch process.");
						logDebug(tab + "Updated Application Status: Expired" + br);
					}
				}
			}
		}
	}
}

function processThirtyDayActive() { //Set currently Active 30 Day Licenses to Inactive
	var fromDate = new Date((startDate.getMonth()+1) + "/15/" + startDate.getFullYear()); 
	var toDate = new Date((startDate.getMonth()+1) + "/15/" + startDate.getFullYear());
	fromDate = dateAddMonths(fromDate, -2); 
	toDate = dateAddMonths(toDate, 0);
	var countProcess = 0;
	
	logDebug("Set currently active 30-Day Vending licenses to close with an expiration date between " + fromDate + " and " + toDate + "." + br);
	
	var expResult = aa.expiration.getLicensesByDate("Active",fromDate,toDate);
	
	if (expResult.getSuccess()) {
		myExp = expResult.getOutput();
		logDebug("Processing " + myExp.length + " expiration records");
	} else { 
		logDebug("ERROR: Getting Expirations, reason is: " + expResult.getErrorType() + ":" + expResult.getErrorMessage()); 
		return false;
	}
	
	for (thisExp in myExp) {
		
		if (elapsed() > maxSeconds) {
			logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		
		b1Exp = myExp[thisExp];
		var expDate = b1Exp.getExpDate();
		
		if (expDate) {
			
			var b1ExpDate = expDate.getMonth() + "/" + expDate.getDayOfMonth() + "/" + expDate.getYear();
			var b1Status = b1Exp.getExpStatus();
			capId = aa.cap.getCapID(b1Exp.getCapID().getID1(),b1Exp.getCapID().getID2(),b1Exp.getCapID().getID3()).getOutput();
			altId = capId.getCustomID();
			cap = aa.cap.getCap(capId).getOutput();
			
			if (cap) {
				appTypeResult = cap.getCapType();
				appTypeString = appTypeResult.toString();
				appTypeArray = appTypeString.split("/");
				var licenseType = "Annual";
				
				if(appTypeArray[0] == "Licenses" && appTypeArray[1] == "Vending" && appTypeArray[3] == "NA") {
					
					licenseType = checkLicenseType(appTypeArray);
					
					if (licenseType == "ThirtyDay") {
						var expireDate = convertDate(expDate);
						var compareDate = convertDate(toDate);
						if (expireDate <= compareDate){
							countProcess += 1
							logDebug("<b>" + altId + "</b>");
							logDebug(tab + "License Type: " + appTypeArray[2]);
							logDebug(tab + "Renewal Status: " + b1Status); 
							logDebug(tab + "Expires on: " + b1ExpDate);
							logDebug(tab + "License Duration: " + licenseType);
							getContactInfo();
							//update expiration status
							b1Exp.setExpStatus("Inactive");
							aa.expiration.editB1Expiration(b1Exp.getB1Expiration());
							logDebug(tab + "Updated Expiration Status: Inactive");
							//update CAP status
							updateAppStatus("Closed","Set to Closed by Expire batch process.");
							logDebug(tab + "Updated Application Status: Closed");
							//close Workflow
							taskCloseAllExcept("Closed","Closed by Expire Process")
							logDebug(tab + "Closed all workflow steps with Status: Closed" + br);
						}
					}
				}
			}
		}
	}
	if (countProcess == 0) {
		logDebug("There were no 30-day licenses to close.");
	}
}

function processAnnualActive() { //Set currently Active Annual Licenses to About to Expire
	var fromDate = new Date("4/14/" + startDate.getFullYear());
	var toDate = new Date("4/15/" + startDate.getFullYear());
	fromDate = dateAddMonths(fromDate, -2); 
	toDate = dateAddMonths(toDate, 0);
	
	logDebug("Set currently active annual Vending licenses to about to expire for date range -- From Date: " + fromDate + ", To Date: " + toDate + ".");
	logDebug("Set currently active 30-Day Vending licenses to close with an expiration date between " + fromDate + " and " + toDate + "." + br);
	
	var expResult = aa.expiration.getLicensesByDate("Active",fromDate,toDate);
	
	if (expResult.getSuccess()) {
		myExp = expResult.getOutput();
		logDebug("Processing " + myExp.length + " expiration records." + br);
	} else { 
		logDebug("ERROR: Getting Expirations, reason is: " + expResult.getErrorType() + ":" + expResult.getErrorMessage()); 
		return false;
	}
	
	for (thisExp in myExp) {
		
		if (elapsed() > maxSeconds) {
			logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		
		b1Exp = myExp[thisExp];
		var expDate = b1Exp.getExpDate();
		
		if (expDate) {
			
			var b1ExpDate = expDate.getMonth() + "/" + expDate.getDayOfMonth() + "/" + expDate.getYear();
			var b1Status = b1Exp.getExpStatus();
			capId = aa.cap.getCapID(b1Exp.getCapID().getID1(),b1Exp.getCapID().getID2(),b1Exp.getCapID().getID3()).getOutput();
			altId = capId.getCustomID();
			cap = aa.cap.getCap(capId).getOutput();
			
			if (cap) {
				appTypeResult = cap.getCapType();
				appTypeString = appTypeResult.toString();
				appTypeArray = appTypeString.split("/");
				var licenseType = "Annual";
				
				if(appTypeArray[0] == "Licenses" && appTypeArray[1] == "Vending" && appTypeArray[3] == "NA") {
					
					licenseType = checkLicenseType(appTypeArray);
					
					if (licenseType == "Annual") { 
						logDebug("<b>" + altId + "</b>");
						logDebug(tab + "License Type: " + appTypeArray[2]);
						logDebug(tab + "Renewal Status: " + b1Status); 
						logDebug(tab + "Expires on: " + b1ExpDate);
						logDebug(tab + "License Duration: " + licenseType);
						//update Expiration Status
						b1Exp.setExpStatus("About to Expire");
						aa.expiration.editB1Expiration(b1Exp.getB1Expiration());
						logDebug("Updated Expiration Status: About to Expire");
						//update CAP status
						updateAppStatus("About to Expire","Set to About to Expire by Expire batch process.");
						logDebug("Updated Application Status: About to Expire" + br);
					} else {
						var expireDate = convertDate(expDate);
						var compareDate = convertDate(toDate);
						if (expireDate <= compareDate){
							logDebug("<b>" + altId + "</b>");
							logDebug(tab + "License Type: " + appTypeArray[2]);
							logDebug(tab + "Renewal Status: " + b1Status); 
							logDebug(tab + "Expires on: " + b1ExpDate);
							logDebug(tab + "License Duration: " + licenseType);
							getContactInfo();
							//update expiration status
							b1Exp.setExpStatus("Inactive");
							aa.expiration.editB1Expiration(b1Exp.getB1Expiration());
							logDebug(tab + "Updated Expiration Status: Inactive");
							//update CAP status
							updateAppStatus("Closed","Set to Closed by Expire batch process.");
							logDebug(tab + "Updated Application Status: Closed");
							//close Workflow
							taskCloseAllExcept("Closed","Closed by Expire Process")
							logDebug(tab + "Closed all workflow steps with Status: Closed" + br);
						}
					}
				}
			}
		}
	}
}

function getContactInfo() {
	var contactEmail = "No Email Address";
	var contactName = "No Name";
	var contactBusiness = "No business Name";
	var capContactResult = aa.people.getCapContactByCapID(capId);
	if (capContactResult.getSuccess()) {
		var capContactArray = capContactResult.getOutput();
		for (c in capContactArray) {
			var contact = capContactArray[c];
			var people = contact.getPeople();
			if (people.getContactType() == "Applicant") {
				contactEmail = people.getEmail();
				contactName = people.getContactName();
				contactBusiness = people.getBusinessName();
				logDebug(tab + "Applicant Organization: " + contactBusiness);
				logDebug(tab + "Applicant Name: " + contactName);
				logDebug(tab + "Applicant Email: " + contactEmail);
			}
			if (people.getContactType() == "Company") {
				contactEmail = people.getEmail();
				contactName = people.getContactName();
				contactBusiness = people.getBusinessName();
				logDebug(tab + "Company Organization: " + contactBusiness);
				logDebug(tab + "Company Name: " + contactName);
				logDebug(tab + "Company Email: " + contactEmail);
			}
		
		}
	}
}


function checkLicenseType(appArray) { //Set currently Expired Annual Licenses to Closed
	var appField = "";
	var lType = "Annual";
	var fValue = "";
	var camp = "Season";
	var tDay = "30";
	
		if (appArray[2] == "HighDensityVending") {
			appField = getAppSpecific("APPLICANT TYPE.Location", capId);
			i = appField.indexOf(camp);
			if (i > 0) {
				lType = "ThirtyDay";
			} 
		}
		
		if (appArray[2] == "HighDensityVending") {
			appField = getAppSpecific("APPLICANT TYPE.Location", capId);
			i = appField.indexOf(tDay);
			if (i > 0) {
				lType = "ThirtyDay";
			} 
		}
		
		if (appArray[2] == "MallCraftVendor") {
			appField = getAppSpecific("APPLICANT TYPE.Location", capId);
			i = appField.indexOf(tDay);
			if (i > 0) {
				lType = "ThirtyDay";
			} 
		}
		
		if (appArray[2] == "MallCraftVendor") {
			appField = getAppSpecific("APPLICANT TYPE.Location", capId);
			i = appField.indexOf(tDay);
			if (i > 0) {
				lType = "ThirtyDay";
			} 
		}
		
		if (appArray[2] == "StreetVendor") {
			appField = getAppSpecific("APPLICANT TYPE.Type of License", capId);
			if (appField == "30-Day") {
				lType = "ThirtyDay";
			}
		}
		
	return lType
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

function getAppSpecific(itemName) { // optional: itemCap
	var updated = false;
	var i=0;
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
	
	if (useAppSpecificGroupName) {
		if (itemName.indexOf(".") < 0) {
			logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true"); 
			return false 
		}
		var itemGroup = itemName.substr(0,itemName.indexOf("."));
		var itemName = itemName.substr(itemName.indexOf(".")+1);
	}
	
	var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
	if (appSpecInfoResult.getSuccess()) {
		var appspecObj = appSpecInfoResult.getOutput();
		if (itemName != "") {
			for (i in appspecObj) {
				if( appspecObj[i].getCheckboxDesc() == itemName && (!useAppSpecificGroupName || appspecObj[i].getCheckboxType() == itemGroup) )
				{
					return appspecObj[i].getChecklistComment();
					break;
				}
			}
		}
	} else { 
		logDebug( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage())
	}
}

function taskCloseAllExcept(pStatus,pComment) {
	// Closes all tasks in CAP with specified status and comment
	// Optional task names to exclude
	var taskArray = new Array();
	var closeAll = false;
	if (arguments.length > 2) { //Check for task names to exclude
		for (var i=2; i<arguments.length; i++) {
			taskArray.push(arguments[i]);
		}
	} else {
		closeAll = true;
	}
	var workflowResult = aa.workflow.getTasks(capId);
	if (workflowResult.getSuccess()) {
		var wfObj = workflowResult.getOutput();
		} else {
			logDebug("**ERROR: Failed to get workflow object: " + workflowResult.getErrorMessage()); 
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
		if (closeAll) {
			aa.workflow.handleDisposition(capId,stepnumber,pStatus,dispositionDate,wfnote,pComment,systemUserObj,"Y");
			//logDebug("Closing Workflow Task " + wftask + " with status " + pStatus);
		} else {
			if (!exists(wftask,taskArray)) {
				aa.workflow.handleDisposition(capId,stepnumber,pStatus,dispositionDate,wfnote,pComment,systemUserObj,"Y");
				logDebug("Closing Workflow Task " + wftask + " with status " + pStatus);
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
	if(showDebug) {
		aa.print(dstr)
		emailText += dstr + "<br>";
		aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"),dstr)
	}
}