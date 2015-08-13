/*------------------------------------------------------------------------------------------------------/
| SVN $Id: RegistrationSubmitAfter.js 6515 2013-03-22 18:15:38Z jeff.moyer $
| Program : RegistrationSubmitAfterV7.3.js
| Event   : Registration for an Account on Submit
|
| Usage   : Master Script by City of Madison.  See accompanying documentation and release notes.
|
| Client  : Madison, Wisconsin
| Action# : N/A
|
| Notes   : This event needs the additional line aa.env.setValue("isContinue", "1"); until this is tested thoroughly
|			This script is self contained and does not use the INCLUDES scripts
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| START User Configurable Parameters
|     Only variables in the following section may be changed.  If any other section is modified, this
|     will no longer be considered a "Master" script and will not be supported in future releases.  If
|     changes are made, please add notes above.
/------------------------------------------------------------------------------------------------------*/
aa.env.setValue("isContinue", "1");
var controlString = "RegistrationSubmitAfter";	//Standard choice for control
var preExecute = "RegistrationSubmitAfter";		//Standard choice to execute first (for globals, etc)
var documentOnly = false;						//Document Only -- displays hierarchy of std choice steps

/*------------------------------------------------------------------------------------------------------/
| END User Configurable Parameters
/------------------------------------------------------------------------------------------------------*/
var SCRIPT_VERSION = 2.0

var vScriptName = aa.env.getValue("ScriptCode");
var vEventName = aa.env.getValue("EventName");

var startDate = new Date();
var startTime = startDate.getTime();
var cancel = false;
var message =	"";
var debug = "";	
var emailText = "";
var showDebug = true;
var showMessage = false;
var useAppSpecificGroupName = true;
var br = "<BR>";
var tab = "";

sysDate = aa.date.getCurrentDate();

/*------------------------------------------------------------------------------------------------------/
| BEGIN Event Specific Variables
/------------------------------------------------------------------------------------------------------*/
var accountType 				= aa.env.getValue("accountType");
var attributeNames 				= aa.env.getValue("attributeNames");
var auditStatus 				= aa.env.getValue("auditStatus");
var businessLicExpDates 		= aa.env.getValue("businessLicExpDates");
var insuranceExpirationDates 	= aa.env.getValue("insuranceExpirationDates");
var licenseExpirationDates 		= aa.env.getValue("licenseExpirationDates");
var licenseSequenceNumbers 		= aa.env.getValue("licenseSequenceNumbers");
var licenseTypes 				= aa.env.getValue("licenseTypes");
var PublicUserModel 			= aa.env.getValue("PublicUserModel");
var stateLicenseNumbers 		= aa.env.getValue("stateLicenseNumbers");
/*------------------------------------------------------------------------------------------------------/
| END Event Specific Variables
/------------------------------------------------------------------------------------------------------*/

//if (preExecute.length) doStandardChoiceActions(preExecute,true,0);//run Pre-execution code

//logGlobals(AInfo);

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/
//
//  Get the Standard choices entry we'll use for this App type
//  Then, get the action/criteria pairs for this app
//
//doStandardChoiceActions(controlString,true,0);
	var pubUserFirstName;
	var pubUserLastName;
	var pubUserRefContNum

	var peeps = PublicUserModel.getPeoples();
	peepIterator = peeps.iterator();
	
	while (peepIterator.hasNext()) {
		var peep = peepIterator.next();
		pubUserFirstName = peep.getFirstName();
		pubUserLastName = peep.getLastName();
		pubUserRefContNum = peep.getContactSeqNumber();
	}
	
	var pubUserEmail = PublicUserModel.getEmail();
	var pubUserID = "PUBLICUSER" + PublicUserModel.getUserSeqNum();
		
	logDebug("First " + pubUserFirstName);
	logDebug("Last  " + pubUserLastName);
	logDebug("Email " + pubUserEmail);
	logDebug("Ref Cont Num " + pubUserRefContNum);
	logDebug("Public User ID " + pubUserID);
	
	var allPeople = findRefernceContact(pubUserEmail, pubUserFirstName, pubUserLastName);
	
	while (allPeople.next()) {
		logDebug(allPeople.getString("RefNumber"));
		logDebug(allPeople.getString("RefType"));
		var refContactNumber = allPeople.getString("RefNumber");
		var refContactType = allPeople.getString("RefType");
		if (refContactType.equals("License Holder")) {
			logDebug("Linking this public user with reference contact : " + refContactNumber + "PU SeqNbr: " + PublicUserModel.getUserSeqNum());
			aa.licenseScript.associateContactWithPublicUser(PublicUserModel.getUserSeqNum(), refContactNumber);
		}
	}

	var assocCAPs = findCAPRecordsByContactEmail(pubUserEmail);
	
	while (assocCAPs.next()) {
		var capIdResult = aa.cap.getCapID(assocCAPs.getString("B1_PER_ID1"), assocCAPs.getString("B1_PER_ID2"), assocCAPs.getString("B1_PER_ID3"))
		var pCapId = capIdResult.getOutput();
		var capResult = aa.cap.getCap(pCapId).getOutput();
		var capModelResult = capResult.getCapModel();
		capModelResult.setAccessByACA("Y");
		capModelResult.setCreatedBy(pubUserID);
		aa.cap.editCapByPK(capModelResult);
		//associateRefContactToCapContactsAndLink(pCapId, pubUserRefContNum)
	}
	
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/

if (debug.indexOf("**ERROR") > 0) {
	aa.env.setValue("ErrorCode", "1");
	aa.env.setValue("ErrorMessage", debug);
} else {
	if (cancel) {
		aa.env.setValue("ErrorCode", "-2");
		if (showMessage) aa.env.setValue("ErrorMessage", message);
		if (showDebug) 	aa.env.setValue("ErrorMessage", debug);
	} else {
		aa.env.setValue("ErrorCode", "0");
		if (showMessage) aa.env.setValue("ErrorMessage", message);
		if (showDebug) 	aa.env.setValue("ErrorMessage", debug);
	}
}

/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/


//aa.sendEmail("noreply@cityofmadison.com", "jmoyer@cityofmadison.com", "jmoyer@cityofmadison.com", "Registration Submit After", debug, "");

//ITJSM added 7/1/2013 updated 11/4/2013 to add date range check
function findRefernceContact(puEmail, puFirstName, puLastName) {
	
	var selectString = "DECLARE @PUEmail varchar(250); DECLARE @PUFirstName varchar(250); DECLARE @PULastName varchar(250); " +
		"SET @PUEmail = '" + puEmail + "'; SET @PUFirstName = '" + puFirstName + "'; SET @PULastName = '" + puLastName + "'; " +
		"SELECT C.G1_CONTACT_NBR As 'RefNumber', C.G1_CONTACT_TYPE As 'RefType', C.G1_FNAME As 'FirstName', C.G1_MNAME As 'MiddleName', " +
		"C.G1_LNAME As 'LastName', C.G1_BUSINESS_NAME As 'BusinessName', C.G1_ADDRESS1 As 'Address1' , C.G1_ADDRESS2 As 'Address2', " +
		"C.G1_CITY As 'City', C.G1_STATE As 'State', C.G1_ZIP As 'Zip', C.G1_PHONE1 As 'Phone1', C.G1_PHONE2 As 'Phone2', " + 
		"C.G1_PHONE3 As 'Phone 3', C.G1_EMAIL As 'Email', C.G1_PREFERRED_CHANNEL As 'PreferredChannel'" +
		"FROM G3CONTACT C WHERE C.SERV_PROV_CODE = 'MADISON' AND C.REC_STATUS = 'A' AND C.G1_EMAIL = @PUEmail " +
		" AND C.G1_FNAME = @PUFirstName AND C.G1_LNAME = @PULastName;";
		
	var initialContext = aa.proxyInvoker.newInstance("javax.naming.InitialContext").getOutput();
	var ds = initialContext.lookup("java:/AA");
	var conn = ds.getConnection();
	var sStmt = conn.prepareStatement(selectString);
	var rSet = sStmt.executeQuery();

	return rSet;
	conn.close();
}

//ITJSM added 4/30/2015
function findCAPRecordsByContactEmail(puEmail) {
	
	var selectString = "DECLARE @PUEmail varchar(250); SET @PUEmail = '" + puEmail + "'; SELECT B.B1_PER_ID1, B.B1_PER_ID2, B.B1_PER_ID3 " +
		"FROM B1PERMIT B INNER JOIN B3CONTACT C ON B.SERV_PROV_CODE = C.SERV_PROV_CODE AND B.B1_PER_ID1 = C.B1_PER_ID1	AND B.B1_PER_ID2 = C.B1_PER_ID2 " +
		"AND B.B1_PER_ID3 = C.B1_PER_ID3 AND C.REC_STATUS = 'A' AND C.B1_EMAIL = @PUEmail WHERE B.SERV_PROV_CODE = 'MADISON' AND B.REC_STATUS = 'A' " +
		"AND B.B1_PER_GROUP = 'Permitting' AND B.B1_PER_TYPE = 'Traffic Engineering' AND B.B1_PER_SUB_TYPE = 'Bicycle Registration' AND B.B1_PER_CATEGORY = 'NA';";
		
	var initialContext = aa.proxyInvoker.newInstance("javax.naming.InitialContext").getOutput();
	var ds = initialContext.lookup("java:/AA");
	var conn = ds.getConnection();
	var sStmt = conn.prepareStatement(selectString);
	var rSet = sStmt.executeQuery();

	return rSet;
	conn.close();
}

//ITJSM added 4/30/2015
/*
function associateRefContactToCapContactsAndLink(pCapId, pubUserRefContNum, overwriteRefContact) {
	if (overwriteRefContact == null) {
		overwriteRefContact = false;
	}	
	var c = aa.people.getCapContactByCapID(pCapId).getOutput();
	for (var i in c) {
		var con = c[i];
		var refContactType = "";
		var refContactNum = con.getCapContactModel().getRefContactNumber();
		var customID = pCapId.getCustomID();
		logDebug(customID);
		if (refContactNum)  {
			logDebug("Already associated to a reference contact");
	   	   	if (overwriteRefContact) {
				logDebug("Overwrite existing reference contact");
				//var ccm = con.getCapContactModel();
				//ccm.setRefContactNumber(pubUserRefContNum);  // set the contacts ref num to pu ref contact num
				//r = aa.people.editCapContact(ccm);
				//if (!r.getSuccess()) { 
				//	logDebug("WARNING: error updating cap contact model : " + r.getErrorMessage()); 
				//} else { 
				//	logDebug(tab + "Successfully linked ref contact " + refPeopleId + " to cap contact " + ccmSeq);
				//}
			} else {
				logDebug("Don't overwrite existing reference contact");
			}
	   	} else  {
			logDebug("Not associated to a reference contact");
			//var ccm = con.getCapContactModel();
		    //ccm.setRefContactNumber(refPeopleId);
		    //r = aa.people.editCapContact(ccm);
		    //if (!r.getSuccess()) { 
			//	logDebug("WARNING: error updating cap contact model : " + r.getErrorMessage()); 
			//} else { 
			//	logDebug(tab + "Successfully linked ref contact " + refPeopleId + " to cap contact " + ccmSeq);
			//}
	    } 
	}
}
*/

function debugObject(object) {
	var output = '';
	for (property in object) {
		output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" + '; ' + "<BR>";
	}
	logDebug(output);
}

function logDebug(dstr) {
	vLevel = 1
	if (arguments.length > 1)
		vLevel = arguments[1];
	if ((showDebug & vLevel) == vLevel || vLevel == 1)
		debug += dstr + br;
	if ((showDebug & vLevel) == vLevel)
		aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"), dstr);
}