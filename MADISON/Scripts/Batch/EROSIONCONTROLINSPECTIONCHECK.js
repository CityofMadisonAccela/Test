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
var useAppSpecificGroupName = true;
var br = "<BR>";
var link = "<a href='https://elam.cityofmadison.com/CitizenAccess/'>City of Madison Licenses & Permits</a>";
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
var startTime = startDate.getTime();// Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var timeExpired = false;

var appGroup = "Permitting";
var appTypeType = "Engineering";
var appSubtype =  "Erosion Control";
var appCategory = "Inspection";
var appType = appGroup+"/"+appTypeType+"/"+appSubtype+"/"+appCategory;
var capId = null;

var emailTo = "";
var emailCC = "";
var emailSubject = "Erosion Control Inspection Reporting Non-Compliance";
var emailBody = "";
var emailFrom = "noreply@cityofmadison.com";

var emailAddress = "ttroester@cityofmadison.com; jbenedict@cityofmadison.com;";//email to send report
var staffEmailAddress = "erosioncontrol@cityofmadison.com";

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
	logDebug("This process started on " + startDate + br);
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
	var fromDate = new Date();
	fromDate = dateAddMonths(fromDate, 0);
	fromDate = dateAdd(fromDate,-8)
	
	logDebug("The purpose of this process is to check if an inspection was completed since " + fromDate + 
		" for Erosion Control permits that are on the work flow Inspection task with a status of Ongoing." + br);
	
	var wfResult = aa.workflow.getTasks("Inspection", "Ongoing");
	
	if (wfResult.getSuccess()) {
		workFlow = wfResult.getOutput();
	} else { 
		logDebug("ERROR: Getting Erosion Control work flow, reason is: " + wfResult.getErrorType() + ":" + wfResult.getErrorMessage()); 
		return false;
	}
	for (wf in workFlow) {
		if (elapsed() > maxSeconds) { //only continue if time hasn't expired
			logDebug("A script time out has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		b1WF = workFlow[wf];
		capId = b1WF.getCapID();
		var cap = aa.cap.getCap(capId).getOutput().getCapModel();
		var inspected = true;
		var appField = getAppSpecific("TYPE OF PERMIT.Permit Type", capId);
		var projectName = getShortNotes(capId);
		var capAddress = aa.address.getAddressByCapId(capId);
		var noAddress = false;
		var aCount = 0;
		if (capAddress.getSuccess()) {
			addresses = capAddress.getOutput();
			for (a in addresses) {
				aCount += 1;
			}
			if (aCount = 1) {
				address = addresses[0].getDisplayAddress();
			} else if (aCount > 1) {
				for (add in addresses) {
					if (addresses[add].getPrimaryFlag() == "Y") {
						address = addresses[add].getDisplayAddress();
					} else {
						noAddress = true;
						address = "No primary address is associated with the Erosion Control Permit."
					}
				}
			} else {
				noAddress = true;
				address = "No address is associated with the Erosion Control Permit."
			}
		}
		if (appField == "Full Plan") {
			inspected = false;
			var childCapResult = aa.cap.getChildByMasterID(capId);
			if (childCapResult) {
				var childCapArray = childCapResult.getOutput();
				if (childCapArray != 'undefined' && childCapArray != null){ // Riki 05/07/13: I needed to add this line for permits that haven't had a single related child cap
					for (childCap in childCapArray) {
						child = childCapArray[childCap];
						if (child.getCapType() == appType) {
							fileDate = convertDate(child.getFileDate());
							compareDate = convertDate(fromDate);
							if (fileDate > compareDate) {
								if (child.isCompleteCap()) {
									inspected = true;
								}
							} else {
								inspected = false;
							}
						}
					}
				}
			}
		}
		if (inspected == false) {
			getContactEmail("Applicant", "To");
			getContactInfo("Applicant");
			getContactEmail("Authorized Inspector", "CC");
			if (emailTo == "No Email Address") {
				var failEmailAddress = "Applicant for record " + cap.getAltID() + " does not have a valid email address and did not submit an inspection in the last 7 days.";
				aa.sendMail("noreply@cityofmadison.com", emailAddress, "", "Erosion Control Inspection Check - No Email", failEmailAddress);
			} else {
				emailBody = "<html><body>";
				emailBody += "<p>Project: " + projectName + "</p>";
				if (noAddress == false) {
					emailBody += "<p>Address: " + address + "</p>";
				}
				emailBody += "<p>The required erosion control inspection reporting has not been performed for Erosion Control Permit - " + 
					cap.getAltID() + ".</p>";
				emailBody += "<p>This permitted project is in non-compliance with the weekly erosion control inspection reporting requirement.  " +
					"Continued failure to complete the required inspection reporting will result in enforcement action for not being in compliance " +
					"with the permit conditions.  Enforcement action can consist of issuance of citation or referral to the City Attorney for " +
					"resolution depending on past violation or non-compliance status of the permit.  Inspections should be entered through " +
					"Accela Citizen Access using your account login at " + link + ".</p><br><p>NOTE: IN ACORDANCE WITH CITY POLICY, THE THIRD " +
					"NOTICE OF NON-REPORTING SHALL RESULT IN A CITATION.</p>";				emailBody += "<p>This is an automated email so DO NOT REPLY to this email.  If there are questions regarding the permit, " +
					"permit status, this notice, or non-compliance issues please contact City Engineering Erosion Control Staff at " + 
					staffEmailAddress + ".</p>";
				emailBody += "</body></html>";
				aa.sendMail("noreply@cityofmadison.com", emailTo, emailCC, emailSubject, emailBody);
				logDebug("<b>Record " + cap.getAltID() + "</b>");
				logDebug("Project: " + projectName);
				logDebug("Address: " + address);
				logDebug("Email To: " + emailTo);
				logDebug("Email CC: " + emailCC);
				logDebug("An inspection was not created and completed for " + cap.getAltID() + " after " + fromDate + 
					" an email was sent to the applicant - " + contactName + "." + br);
			}
		} 
	}
 
 	aa.sendMail("noreply@cityofmadison.com", emailAddress, "ecpermits@cityofmadison.com", "Erosion Control Inspection Check", emailText);
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function getContactEmail(contactType, emailType) {
	var capContactResult = aa.people.getCapContactByCapID(capId);
	var contact;
	if (emailType == "To") {
		emailTo = "";
	} else {
		emailCC = "";
	}
	if (capContactResult.getSuccess()) {
		var capContactArray = capContactResult.getOutput();
		for (c in capContactArray) {
			contact = capContactArray[c];
			var people = contact.getPeople();
			if (people.getContactType() == contactType && emailType == "To") {
				emailTo += people.getEmail() + "; ";
			}
			if (people.getContactType() == contactType && emailType == "CC") {
				emailCC += people.getEmail() + "; ";
			}
		}
		if (emailTo == null || emailTo == "" ) {
			emailTo = "No Email Address";
		}
	}
}

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

function debugObject(object) {
	 var output = ''; 
	 for (property in object) { 
	   output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
	 } 
	 logDebug(output);
} 

function getShortNotes() {//option CapId
	var itemCap = capId
	if (arguments.length > 0) itemCap = arguments[0]; // use cap ID specified in args
	var cdScriptObjResult = aa.cap.getCapDetail(itemCap);
	if (!cdScriptObjResult.getSuccess()) { 
		logDebug("**ERROR: No cap detail script object : " + cdScriptObjResult.getErrorMessage());
		return false;
	}
	var cdScriptObj = cdScriptObjResult.getOutput();
	if (!cdScriptObj) { 
		logDebug("**ERROR: No cap detail script object");
		return false;
	}
	cd = cdScriptObj.getCapDetailModel();
	var sReturn = cd.getShortNotes();
	if(sReturn != null) {
		return sReturn;
	} else {
		return "";
	}
}

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