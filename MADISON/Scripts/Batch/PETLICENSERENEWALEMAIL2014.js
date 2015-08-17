/*------------------------------------------------------------------------------------------------------/
| Program: Batch Expiration.js  Trigger: Batch
| Client: Treasurer Department
|
| Note: The process to set the Pet Licenses to About to Expire and Expired must run before this process.
|
| Version 1.0 - Base Version. 9/24/2013 ITJSM
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
var maxSeconds = 60 * 20;
var timeExpired = false;
var useAppSpecificGroupName = true;
var br = "<BR>";
var tab = "    ";
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

var servProvCode = "MADISON";
var cAppGroup = "Licenses";
var cAppType = "Treasurer";
var cAppSubtype =  "*";
var cAppCategory = "NA";
var curStatus = "About to Expire";
var fromDate = "12/29/" + startDate.getFullYear();
var toDate = "12/30/" + (startDate.getFullYear());
var capId = null;
var appSubType = "";
var emailAddress = "glabelle-brown@cityofmadison.com";

var emailTo = "";
var emailCC = "";
var emailSubject = "";
var emailBody = "";
var emailFrom = "noreply@cityofmadison.com";

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
	logDebug("<b>Processing: Pet License Notification</b>" + br);
	processNotify();
}

function processNotify() {
	logDebug(br + "Processing " + curStatus + " for the Expiration Date to be between " + fromDate + " and " + toDate);
	
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
		appSubType = appTypeArray[2];

		var emailRenewInfo = getAppSpecific("NOTIFICATIONS.I would like to receive renewal information via email", capId);
		logDebug("Email Renewal is:"+emailRenewInfo);					

		if (emailRenewInfo == "CHECKED" && appTypeArray[0] == cAppGroup && appTypeArray[1] == cAppType && appTypeArray[3] == cAppCategory) {
			var emailSubject = "";
			var emailbody = "";
			var capStatus = cap.getCapStatus();
			var createdByACA = cap.isCreatedByACA();
			logDebug("<b>" + altId + "</b>");
			logDebug(tab + "License Type: " + appSubType);
			logDebug(tab + "Cap Status: " + capStatus);
			logDebug(tab + "Created by ACA: " + createdByACA);
			logDebug(tab + "Renewal Status: " + b1Status); 
			logDebug(tab + "Expires on: " + b1ExpDate);
			if (capStatus == "About to Expire" || capStatus == "Expired") {
				getApplicantInfo();
				logDebug(tab + "Applicant Name: " + applicantName);
				logDebug(tab + "Applicant Email: " + applicantEmail);
				prepareAndSendRenewOnlineEmail();
                        }
		}
	}
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/
function prepareAndSendRenewOnlineEmail() {
	if (appSubType == "Chicken Owner") {
		appSubType = "Chicken Registration";
	} else if (appSubType == "Dog Registration") {
		appSubType = "Dog License"; 
	} else {
		appSubType = "Cat License";
	}
	emailTo = applicantEmail;
	emailCC = " "
	emailSubject = appSubType + " is " + curStatus;
	emailBody = "<html><body><p>Hello " + applicantName + ",</p><p>Please be advised your " + appSubType + 
	" with the City of Madison is " + curStatus + ".</p><p>This license can be renewed online. " +
	" You are receiving this email because you selected that you would like to receive renewal information via email. If you need to mail your renewal, please contact the Treasurer's office and they will send you a paper notice. " +
	"To renew online, please go to the <a href='http://www.cityofmadison.com/treasurer'>Treasurer's web page </a>, under Licensing " +
	"for more information.  Follow the instructions to login to the City of Madison Licenses and Permits site.</p><div>"

	emailBody += tab + "Once logged in click on 'Search Licenses/Registrations'" + br + 
	tab + "Locate the License Number (" + altId + ")" + br + 
	tab + "In the Action column click on the 'Renew Application' link." + br +
	tab + "Follow the remaining steps to complete the renewal of your " + appSubType + ".</div>" +
	"<p>Thank You," + br + "City of Madison Treasurer's Office</p></body></html>"
	logDebug(tab + "Email To: " + emailTo);
	logDebug(tab + "Email CC: " + emailCC);
	logDebug(tab + "Email Subject: " + emailSubject);
	logDebug(tab + "Email Body: " + emailBody);
	if (applicantEmail != "No Email Address") {
		aa.sendMail(emailFrom, emailTo, emailCC, emailSubject, emailBody);
		updateAppStatus("Notification Sent","Renewal Notification", capId);
		logDebug(tab + "Email will be sent." + br);
	} else {
		logDebug(tab + "License was created by ACA but applicant does not have an email address." + br);
	}
}

function updateAppStatus(stat, cmt, itemCap) {
	updateStatusResult = aa.cap.updateAppStatus(itemCap, "APPLICATION", stat, sysDate, cmt, systemUserObj);
	if (!updateStatusResult.getSuccess()) {
		logDebug("ERROR: application status update to " + stat + " was unsuccessful.  The reason is " + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
	}
}

function getApplicantInfo() {
	var capContactResult = aa.people.getCapContactByCapID(capId);
		if (capContactResult.getSuccess()) {
		var capContactArray = capContactResult.getOutput();
		for (c in capContactArray) {
			applicant = capContactArray[c];
			people = applicant.getPeople();
			if (people.getContactType() == "Applicant") {
				applicantEmail = people.getEmail();
				applicantName = people.getContactName();
				applicantBusiness = people.getBusinessName();
			}
		}
		if (applicantEmail == null || applicantEmail == "" ) {
			applicantEmail = "No Email Address";
		}
	}
}

function editAppSpecific(itemName,itemValue) {//optional: itemCap
	var itemCap = capId;
	var itemGroup = null;
	if (arguments.length == 3) itemCap = arguments[2]; // use cap ID specified in args
  	if (useAppSpecificGroupName) {
		if (itemName.indexOf(".") < 0) { 
			logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true");
			return false 
		}
		itemGroup = itemName.substr(0,itemName.indexOf("."));
		itemName = itemName.substr(itemName.indexOf(".")+1);
	}
   	var appSpecInfoResult = aa.appSpecificInfo.editSingleAppSpecific(itemCap,itemName,itemValue,itemGroup);
	if (appSpecInfoResult.getSuccess()) {
	 	if(arguments.length < 3) { //If no capId passed update the ASI Array
	 		AInfo[itemName] = itemValue;
		}
	} else { 
	logDebug( "WARNING: " + itemName + " was not updated."); 
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

function lookup(stdChoice,stdValue) {
	var strControl;
	var bizDomScriptResult = aa.bizDomain.getBizDomainByValue(stdChoice,stdValue);
	if (bizDomScriptResult.getSuccess()) {
		var bizDomScriptObj = bizDomScriptResult.getOutput();
		strControl = "" + bizDomScriptObj.getDescription(); // had to do this or it bombs.  who knows why?
		//logDebug("lookup(" + stdChoice + "," + stdValue + ") = " + strControl);
	} else {
		//logDebug("lookup(" + stdChoice + "," + stdValue + ") does not exist");
	}
	return strControl;
}
function exists(eVal, eArray) {
	  for (ii in eArray)
	  	if (eArray[ii] == eVal) return true;
	  return false;
}

function getParam(pParamName) {//gets parameter value and logs message showing param value
	var ret = "" + aa.env.getValue(pParamName);
	logDebug("Parameter : " + pParamName+" = "+ret);
	return ret;
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