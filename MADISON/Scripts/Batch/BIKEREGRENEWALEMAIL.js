/*------------------------------------------------------------------------------------------------------/
| Program: Bike Reg Renewal Email  Trigger: Batch
| Client: Madison
| Version 2.0 Jeff Moyer 3/31/2014
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var maxMinutes = 30;
var maxSeconds = 60 * maxMinutes; //number of seconds allowed for batch processing, usually < 60 * 5
var showDebug = true; //Set to true to see debug messages in email confirmation
var showMessage = false;
var useAppSpecificGroupName = true;
var emailText = "";
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
/----------------------------------------------------------------------------------------------------*/

var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var timeExpired = false;
var startDate = new Date();
var startTime = startDate.getTime(); // Start timer
var fDate = "05/10/" + startDate.getFullYear();
var tDate = "05/20/" + startDate.getFullYear();
var fromDate = aa.date.getScriptDateTime(aa.util.parseDate(fDate));
var toDate = aa.date.getScriptDateTime(aa.util.parseDate(tDate));
var dispFromDate = jsDateToMMDDYYYY(convertDate(fromDate));
var dispToDate = jsDateToMMDDYYYY(convertDate(toDate));

var m_names = new Array("January", "February", "March", 
"April", "May", "June", "July", "August", "September", 
"October", "November", "December");

var dispExpireDate = m_names[4] + " 15, " + startDate.getFullYear();

var emailCount = 0;
var countProcessed = 0;
var loopCount = 0;

var emailAddress = "elamsupport@cityofmadison.com";//email to send report
var elamsupport = "elamsupport@cityofmadison.com";//email for batch
var emailFrom = "BikeRegRenewal@cityofmadison.com";

var capId;
var altId;
var cap;
var capMod;
var capIDString;
var emailTo = "";
var emailCC = "";

/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/----------------------------------------------------------------------------------------------------*/
/*----------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/----------------------------------------------------------------------------------------------------*/
var paramsOK = true;

if (paramsOK) {
	logDebug("Start Date: " + startDate + br);
	logDebug("Starting the timer for this job.  If it takes longer than " + maxMinutes + 
		" minutes an error will be listed at the bottom of the email." + br);
	if (!timeExpired) {
		mainProcess();
		logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
		logDebug("End Date: " + startDate);
	}
}
/*-----------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/-----------------------------------------------------------------------------------------------------*/
function mainProcess() {

	logDebug("This process gathers all Bike Reg Permits with an expiration date between " + dispFromDate + 
	" and " + dispToDate + " It then sets them to About to expire and emails the contact an email." + br);

	var capIdList = aa.cap.getCapIDsByAppSpecificInfoDateRange("DECAL INFORMATION", "Expiration Date", fromDate, toDate);		 
	if (capIdList.getSuccess()) {
	
		var capIds = capIdList.getOutput();
		logDebug("**The number of Bike Reg Permits: " + capIds.length + br);
	} else {
		logDebug("ERROR: Retrieving permits: " + capIdList.getErrorType() + ":" + capIdList.getErrorMessage());
		return false;
	}
	
	for (var ci = 0; ci < capIds.length; ci++) {
		loopCount++;
		if (elapsed() > maxSeconds) { //only continue if time hasn't expired
			logDebug("A script time-out has caused partial completion of this process.  Please re-run.  " + elapsed() + 
				" seconds elapsed, " + maxSeconds + " allowed.");
			timeExpired = true;
			break;
		}
		var cCapId = capIds[ci].getCapID().toString();
		var capIdArray = cCapId.split("-");
		capId = aa.cap.getCapID(capIdArray[0], capIdArray[1], capIdArray[2]).getOutput();
		altId = capId.getCustomID();
		cap = aa.cap.getCap(capId).getOutput();
		if (cap) {
			var capStat = cap.getCapStatus();
			appTypeResult = cap.getCapType();
			appTypeString = appTypeResult.toString();
			appTypeArray = appTypeString.split("/");
			if(appTypeArray[0] == "Permitting" && appTypeArray[1] == "Traffic Engineering" && appTypeArray[2] == "Bicycle Registration") {
				capMod = cap.getCapModel();
				var capStatus = capMod.getCapStatus();
				if (capStatus != "About to Expire" && capStatus != "Renewal Email Sent") {
					var asiExpDate = getAppSpecific("DECAL INFORMATION.Expiration Date", capId);
					var doNotContact = getAppSpecific("OFFICE USE ONLY.Do Not Contact", capId);
					if (doNotContact == null) {
						doNotContact = "UNCHECKED"
					}
					var b1ExpMod = aa.expiration.getLicensesByCapID(capId).getOutput();
					b1ExpMod.setExpStatus("About to Expire");
					b1ExpMod.setExpDate(aa.date.getScriptDateTime(aa.util.parseDate(asiExpDate)));
					aa.expiration.editB1Expiration(b1ExpMod.getB1Expiration());
					logDebug("<b>" + altId + "</b>");
					updateAppStatus("About to Expire", "Set to About to Expire by batch process.");
					b1ExpMod = aa.expiration.getLicensesByCapID(capId).getOutput();
					var expStatus = b1ExpMod.getExpStatus();
					var expDate = b1ExpMod.getExpDateString();
					logDebug("ASI Exp Date: " + asiExpDate);
					logDebug("Do Not Contact: " + doNotContact);
					logDebug("Renewal Status: " + expStatus); 
					logDebug("Renewal Expire: " + expDate);
					if (doNotContact == "UNCHECKED") {
						getContactEmail("Permanent Address", "To");
						logDebug("Email Address: " + emailTo);
					if (emailTo != "No Email Address")
						prepareAndSendEmail();
					}
					countProcessed++
				}
			}
		}
	}
	logDebug("Total records with ASI Expiration Date set to " + asiExpDate + ": " + loopCount);
	logDebug("Number or records set that were processed: " + countProcessed);
	logDebug("Number of processed records that were sent an email: " + countProcessed);
	logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
	aa.sendMail("noreply@cityofmadison.com", emailAddress, elamsupport, "Bike Reg Report", emailText);
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function prepareAndSendEmail() {
	var serialNumber = getAppSpecific("BICYCLE INFORMATION.Serial Number", capId);
	if (serialNumber == null) {
		serialNumber = "";
	}
	var manufacturer = getAppSpecific("BICYCLE INFORMATION.Manufacturer", capId);
	if (manufacturer == null) {
		manufacturer = "";
	}
	var model = getAppSpecific("BICYCLE INFORMATION.Model", capId);
	if (model == null) {
		model = "";
	}
	var framType = getAppSpecific("BICYCLE INFORMATION.Frame Type", capId);
	var bikeType = getAppSpecific("BICYCLE INFORMATION.Bicycle Type", capId);
	var other = "";
	if (framType == "Other") {
		if (bikeType == "Other") {
			other = getAppSpecific("BICYCLE INFORMATION.If you selected 'Other' above, please describe", capId);
		} else {
			other = getAppSpecific("BICYCLE INFORMATION.If you selected 'Other' above, please describe", capId) + " - " + bikeType;
		}
	} else {
		if (bikeType == "Other") {
			other = framType + " - " + getAppSpecific("BICYCLE INFORMATION.If you selected 'Other' above, please describe", capId);
		} else {
			other = framType + " - " + bikeType;
		}
	}
	var framSize = getAppSpecific("BICYCLE INFORMATION.Frame Size", capId);
	var framSizeMeasure = getAppSpecific("BICYCLE INFORMATION.Frame Size Measurement Units", capId);
	if (framSize == null) {
		framSize = "";
	} else {
		if (framSizeMeasure != null) {
			framSize = framSize + " " + framSizeMeasure;
		}
	}
	var wheelSize = getAppSpecific("BICYCLE INFORMATION.Wheel Size", capId);
	if (wheelSize == null) {
		wheelSize = "";
	}
	var speeds = getAppSpecific("BICYCLE INFORMATION.Number of Speeds", capId);
	if (speeds == null) {
		speeds = "";
	}
	var firstColor = getAppSpecific("BICYCLE INFORMATION.First Frame Color", capId);
	var secondColor = getAppSpecific("BICYCLE INFORMATION.Second Frame Color", capId);
	if (firstColor == null) {
		firstColor = "";
	} else {
		if (secondColor != null) {
			firstColor = firstColor + " then " + secondColor;			
		}
	}
	emailSubject = "Bicycle Registration Renewal Notice";
	emailBody = "<html><body><font face='verdana' ><p>Dear " + contactName + ":</p>" + 
	"<p>Our records indicate that your <b>Madison Bicycle Registration will expire on " + dispExpireDate + ".</b></p>" +
	"<p>The City of Madison has a new system for renewing bicycle registrations and for registering bicycles that will " +
	"give you the ability to manage your bike registrations online.  You will be able to update your own address and other " +
	"contact information, easily renew online, and register additional bicycles owned by you or your family members.</p>" +
	"<p>Since this is a new system, if you decide to renew online, you will need to create a Madison Citizen Access " +
	"online account (unless you already have created an account for pet licenses or another reason).  You can then enter the required " +
	"information about your bicycle as listed later in this email.</p>" +
	"<p><strong>To Renew Online:</strong><br>" +
	"Go to <a href='http://www.cityofmadison.com/bikeMadison/programs/registration.cfm'>" +
	"http://www.cityofmadison.com/bikeMadison/programs/registration.cfm</a><br>then click on " +
	"<u>register or renew online</u>.  Use the bicycle information listed later in this email, and pay by " +
	"credit or debit card.  Your registration information will be updated and you will be sent a new 4-year registration decal for your " + 
	"bicycle.  Click here for instructions on how to navigate to the City of Madison Licenses & Permits page to get to Bicycle " + 
	"Registration.</p><p><b>If you prefer not to renew online, you will also receive a renewal notice by mail this year.</b></p>" +
	"<p>If you have already renewed your bicycle registration this year, please disregard this letter.<br>If you no longer own this " +
	"bicycle or if you no longer live in Madison, please reply to this email to let us know of these changes.</p>" + 
	"<p><b>If this bicycle has been sold, given to another person or donated to an organization</b>, please reply to this email to let " +
	"us know that you no longer own this bicycle and provide us with the new owner's name. address, phone number and email if you " +
	"have this information.  We will change the registration information for that bicycle to the new owner.</p>" +
	"<table border='1'><tr><th>Owner</th><th> </th><th>Bicycle</th><th> </th></tr>" +
	"<tr><td><div style='width: 50px; word-wrap:break-word'>Name</div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'>" + contactName + "</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>Serial Number</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>" + serialNumber + "</div></td></tr>" +
	"<tr><td><div style='width: 50px; word-wrap:break-word'>Address</div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'>" + address1 + "</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>Manufacturer</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>" + manufacturer + "</div></td></tr>" +
	"<tr><td><div style='width: 50px; word-wrap:break-word'>City</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>" + city + "</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>Model</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>" + model + "</div></td></tr>" +
	"<tr><td><div style='width: 50px; word-wrap:break-word'>State</div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'>" + state + "</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>Frame & Bicycle Type</div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'>" + other + "</div></td></tr>" +
	"<tr><td><div style='width: 50px; word-wrap:break-word'>Zip</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>" + zip + "</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>Frame Size</div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'>" + framSize + "</div></td></tr>" +
	"<tr><td><div style='width: 50px; word-wrap:break-word'>Phone</div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'>" + phone1 + "</div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'>Wheel Size</div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'>" + wheelSize + "</div></td></tr>" +
	"<tr><td><div style='width: 50px; word-wrap:break-word'></div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'></div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'>Number of Speeds</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>" + speeds + "</div></td></tr>" +
	"<tr><td><div style='width: 50px; word-wrap:break-word'></div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'></div></td>" +
	"<td><div style='width: 50px; word-wrap:break-word'>First and/or Second Color</div></td>" + 
	"<td><div style='width: 50px; word-wrap:break-word'>" + firstColor + "</div></td></tr></table>" +
	"<p>Since this is a new system, you will need to enter your bicycle information this one time.  You will not need to do " +
	"this for future bicycle registration renewals.</p>" +
	"<p><b>Madison General Ordinance 12.78(2) requires all bicycles used by Madison residents to be registered.</b></p>" +
	"<p>If you or other family members have other bicycles that are not registered, you can register them using the methods " +
	"listed for how to renew above.  You can also find 'Mail-In' forms on the City of Madison's website at: " +
	"<a href='http://www.cityofmadison.com/bikeMadison/programs/registration.cfm'>" +
	"http://www.cityofmadison.com/bikeMadison/programs/registration.cfm</a> or by requesting one at " +
	"<a href='mailto:bikereg@cityofmadison.com'>bikereg@cityofmadison.com</a>, or at Madison Public Libraries</p>" +
	"<p>Thank you for renewing your bicyle registration and for keeping your bicycle registration information up-to-date.</p>" +
	"<p>City of Madison Bicycle Registration Program<br>" +
	"<a href='mailto:bikereg@cityofmadison.com'>bikereg@cityofmadison.com</a><br>" +
	"608-266-4474</p></font></body></html>";
	logDebug(tab + "Email To: " + emailTo);
	logDebug(tab + "Email CC: " + emailCC);
	//logDebug(tab + "Email Subject: " + emailSubject);
	//logDebug(tab + "Email Body: " + emailBody);
	if (emailTo != "No Email Address") {
		//aa.sendMail(emailFrom, emailTo, emailCC, emailSubject, emailBody);
		emailCount++
		updateAppStatus("Renewal Email Sent", "Set to Renewal Email Sent by batch process.");
		logDebug(tab + "Email will be sent." + br);
	} else {
		logDebug(tab + "License was renewed by ACA but License Holder does not have an email address." + br);
	}
}

function getContactEmail(contactType, emailType) {
	var capContactResult = aa.people.getCapContactByCapID(capId);
	var contact;
	if (emailType == "To") {
		emailTo = "";
		contactName = "";
		contactAddress = "";
		address1 = "";
		city = "";
		state = "";
		zip = "";
		phone1 = "";
		contactBusiness = "";
	} else {
		emailCC = "";
	}
	if (capContactResult.getSuccess()) {
		var capContactArray = capContactResult.getOutput();
		for (var c in capContactArray) {
			contact = capContactArray[c];
			var people = contact.getPeople();
			contactAddress = people.getCompactAddress();
			if (people.getContactType() == contactType && emailType == "To") {
				emailTo += people.getEmail() + "; ";
				if (contactName != "") {
					contactName = contactName + "/" + people.getContactName();
					address1 = contactAddress.getAddressLine1();
					city = contactAddress.getCity();
					state = contactAddress.getState();
					zip = contactAddress.getZip();
					phone1 = people.getPhone1();
				} else {
					contactName += people.getContactName();
					address1 = contactAddress.getAddressLine1();
					city = contactAddress.getCity();
					state = contactAddress.getState();
					zip = contactAddress.getZip();
					phone1 = people.getPhone1();
				}
				if (contactBusiness != "") {
					contactBusiness = contactBusiness + "/" + people.getBusinessName();
				} else {
					contactBusiness += people.getBusinessName();
				}
			}
			if (people.getContactType() == contactType && emailType == "CC") {
				emailCC += people.getEmail() + "; ";
			}
		}
		if (emailTo.equals("null; ") || emailTo.equals("; ")) {
			emailTo = "No Email Address";
		}
	}
}

function updateAppStatus(stat,cmt) {
	updateStatusResult = aa.cap.updateAppStatus(capId, "APPLICATION", stat, sysDate, cmt ,systemUserObj);
	if (!updateStatusResult.getSuccess()) {
		logDebug("ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + 
		updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
	} else {
		logDebug("Application Status updated to " + stat);
	}
}

function getAppSpecific(itemName) { //optional: itemCap
	var updated = false;
	var i = 0;
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
	if (useAppSpecificGroupName) {
		if (itemName.indexOf(".") < 0) {
			logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true"); 
			return false 
		}
		var itemGroup = itemName.substr(0,itemName.indexOf("."));
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
		logDebug( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage())
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

function comment(cstr) {
	if (showDebug) logDebug(cstr);
	if (showMessage) logMessage(cstr);
}