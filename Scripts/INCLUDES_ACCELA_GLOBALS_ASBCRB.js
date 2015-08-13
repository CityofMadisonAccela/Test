/*------------------------------------------------------------------------------------------------------/
| Program : INCLUDES_ACCELA_GLOBALS_ASBCRCB.js
| Event   : N/A
|
| Usage   : Accela Global Includes.  Required for all master scripts.
|
| Notes   : 
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| START User Configurable Parameters
|
|     Only variables in the following section may be changed.  If any other section is modified, this
|     will no longer be considered a "Master" script and will not be supported in future releases.  If
|     changes are made, please add notes above.
/------------------------------------------------------------------------------------------------------*/
var showMessage = false;		// Set to true to see results in popup window
var showDebug = false;			// Set to true to see debug messages in popup window
var disableTokens = false;		// turn off tokenizing of std choices (enables use of "{} and []")
var useAppSpecificGroupName = false;	// Use Group name when populating App Specific Info Values
var useTaskSpecificGroupName = false;	// Use Group name when populating Task Specific Info Values
var enableVariableBranching = true;	// Allows use of variable names in branching.  Branches are not followed in Doc Only
var maxEntries = 99;			// Maximum number of std choice entries.  Entries must be Left Zero Padded
/*------------------------------------------------------------------------------------------------------/
| END User Configurable Parameters
/------------------------------------------------------------------------------------------------------*/
var GLOBAL_VERSION = 2.0

var cancel = false;

var vScriptName = aa.env.getValue("ScriptCode");
var vEventName = aa.env.getValue("EventName");

var startDate = new Date();
var startTime = startDate.getTime();
var message = "";									// Message String
var debug = "";										// Debug String
var br = "<BR>";									// Break Tag
var feeSeqList = new Array();						// invoicing fee list
var paymentPeriodList = new Array();				// invoicing pay periods

var currentUserID = aa.env.getValue("CurrentUserID"); // Current User
var systemUserObj = null;							// Current User Object
var currentUserGroup = null;						// Current User Group
var publicUserID = null;
var publicUser = false;

if (currentUserID.indexOf("PUBLICUSER") == 0){
	publicUserID = currentUserID; 
	currentUserID = "ADMIN"; 
	publicUser = true;
}
if(currentUserID != null){
	systemUserObj = aa.person.getUser(currentUserID).getOutput(); //Current User Object
}

var sysDate = aa.date.getCurrentDate();
var sysDateMMDDYYYY = dateFormatted(sysDate.getMonth(),sysDate.getDayOfMonth(),sysDate.getYear(),"");

var servProvCode = aa.getServiceProviderCode();

logDebug("EMSE Script Framework Versions");
logDebug("EVENT TRIGGERED: " + vEventName);
logDebug("SCRIPT EXECUTED: " + vScriptName);
logDebug("INCLUDE VERSION: " + INCLUDE_VERSION);
logDebug("SCRIPT VERSION : " + SCRIPT_VERSION);
logDebug("GLOBAL VERSION : " + GLOBAL_VERSION);

var AdditionalInfoBuildingCount 			= aa.env.getValue("AdditionalInfoBuildingCount");
var AdditionalInfoConstructionTypeCode 		= aa.env.getValue("AdditionalInfoConstructionTypeCode");
var AdditionalInfoHouseCount 				= aa.env.getValue("AdditionalInfoHouseCount");
var AdditionalInfoPublicOwnedFlag 			= aa.env.getValue("AdditionalInfoPublicOwnedFlag");
var AdditionalInfoValuation 				= aa.env.getValue("AdditionalInfoValuation");
var AdditionalInfoWorkDescription 			= aa.env.getValue("AdditionalInfoWorkDescription");
var AddressCity 							= aa.env.getValue("AddressCity");
var AddressHouseFraction 					= aa.env.getValue("AddressHouseFraction");
var AddressHouseNumber 						= aa.env.getValue("AddressHouseNumber");
var AddressPrimaryFlag 						= aa.env.getValue("AddressPrimaryFlag");
var AddressState 							= aa.env.getValue("AddressState");
var AddressStreetDirection 				= aa.env.getValue("AddressStreetDirection");
var AddressStreetName 			= aa.env.getValue("AddressStreetName");
var AddressStreetSuffix 		= aa.env.getValue("AddressStreetSuffix");
var AddressUnitNumber 			= aa.env.getValue("AddressUnitNumber");
var AddressUnitType 			= aa.env.getValue("AddressUnitType");
var AddressValidatedNumber 		= aa.env.getValue("AddressValidatedNumber");
var AddressZip 				= aa.env.getValue("AddressZip");
var AppSpecificInfoModels 		= aa.env.getValue("AppSpecificInfoModels");
var ApplicantAddressLine1 		= aa.env.getValue("ApplicantAddressLine1");
var ApplicantAddressLine2 		= aa.env.getValue("ApplicantAddressLine2");
var ApplicantAddressLine3 		= aa.env.getValue("ApplicantAddressLine3");
var ApplicantBusinessName 		= aa.env.getValue("ApplicantBusinessName");
var ApplicantCity 			= aa.env.getValue("ApplicantCity");
var ApplicantContactType 		= aa.env.getValue("ApplicantContactType");
var ApplicantCountry 			= aa.env.getValue("ApplicantCountry");
var ApplicantEmail 			= aa.env.getValue("ApplicantEmail");
var ApplicantFirstName 			= aa.env.getValue("ApplicantFirstName");
var ApplicantId 			= aa.env.getValue("ApplicantId");
var ApplicantLastName 			= aa.env.getValue("ApplicantLastName");
var ApplicantMiddleName 		= aa.env.getValue("ApplicantMiddleName");
var ApplicantPhone1 			= aa.env.getValue("ApplicantPhone1");
var ApplicantPhone2 			= aa.env.getValue("ApplicantPhone2");
var ApplicantRelation 			= aa.env.getValue("ApplicantRelation");
var ApplicantState 			= aa.env.getValue("ApplicantState");
var ApplicantZip 			= aa.env.getValue("ApplicantZip");
var ApplicationSubmitMode 		= aa.env.getValue("ApplicationSubmitMode");
var ApplicationName 			= aa.env.getValue("AppSpecialText");
var ApplicationTypeLevel1 		= aa.env.getValue("ApplicationTypeLevel1");
var ApplicationTypeLevel2 		= aa.env.getValue("ApplicationTypeLevel2");
var ApplicationTypeLevel3 		= aa.env.getValue("ApplicationTypeLevel3");
var ApplicationTypeLevel4 		= aa.env.getValue("ApplicationTypeLevel4");
var CAEAddressLine1 			= aa.env.getValue("CAEAddressLine1");
var CAEAddressLine2 			= aa.env.getValue("CAEAddressLine2");
var CAEAddressLine3 			= aa.env.getValue("CAEAddressLine3");
var CAEBusinessName 			= aa.env.getValue("CAEBusinessName");
var CAECity 				= aa.env.getValue("CAECity");
var CAEEmail 				= aa.env.getValue("CAEEmail");
var CAEFirstName 			= aa.env.getValue("CAEFirstName");
var CAELastName 			= aa.env.getValue("CAELastName");
var CAELienseNumber 			= aa.env.getValue("CAELienseNumber");
var CAELienseType 			= aa.env.getValue("CAELienseType");
var CAEMiddleName 			= aa.env.getValue("CAEMiddleName");
var CAEPhone1 				= aa.env.getValue("CAEPhone1");
var CAEPhone2 				= aa.env.getValue("CAEPhone2");
var CAEState 				= aa.env.getValue("CAEState");
var CAEValidatedNumber 			= aa.env.getValue("CAEValidatedNumber");
var CAEZip 				= aa.env.getValue("CAEZip");
var ComplainantAddressLine1 		= aa.env.getValue("ComplainantAddressLine1");
var ComplainantAddressLine2 		= aa.env.getValue("ComplainantAddressLine2");
var ComplainantAddressLine3 		= aa.env.getValue("ComplainantAddressLine3");
var ComplainantBusinessName 		= aa.env.getValue("ComplainantBusinessName");
var ComplainantCity 			= aa.env.getValue("ComplainantCity");
var ComplainantContactType 		= aa.env.getValue("ComplainantContactType");
var ComplainantCountry 			= aa.env.getValue("ComplainantCountry");
var ComplainantEmail 			= aa.env.getValue("ComplainantEmail");
var ComplainantFax 			= aa.env.getValue("ComplainantFax");
var ComplainantFirstName 		= aa.env.getValue("ComplainantFirstName");
var ComplainantId 			= aa.env.getValue("ComplainantId");
var ComplainantLastName 		= aa.env.getValue("ComplainantLastName");
var ComplainantMiddleName 		= aa.env.getValue("ComplainantMiddleName");
var ComplainantPhone1 			= aa.env.getValue("ComplainantPhone1");
var ComplainantRelation 		= aa.env.getValue("ComplainantRelation");
var ComplainantState 			= aa.env.getValue("ComplainantState");
var ComplainantZip 			= aa.env.getValue("ComplainantZip");
var ComplaintDate 			= aa.env.getValue("ComplaintDate");
var ComplaintReferenceId1 		= aa.env.getValue("ComplaintReferenceId1");
var ComplaintReferenceId2 		= aa.env.getValue("ComplaintReferenceId2");
var ComplaintReferenceId3 		= aa.env.getValue("ComplaintReferenceId3");
var ComplaintReferenceSource 		= aa.env.getValue("ComplaintReferenceSource");
var ComplaintReferenceType 		= aa.env.getValue("ComplaintReferenceType");
var CurrentUserID 			= aa.env.getValue("CurrentUserID");
var OwnerFirstName 			= aa.env.getValue("OwnerFirstName");
var OwnerFullName 			= aa.env.getValue("OwnerFullName");
var OwnerLastName 			= aa.env.getValue("OwnerLastName");
var OwnerMailAddressLine1 		= aa.env.getValue("OwnerMailAddressLine1");
var OwnerMailAddressLine2 		= aa.env.getValue("OwnerMailAddressLine2");
var OwnerMailAddressLine3 		= aa.env.getValue("OwnerMailAddressLine3");
var OwnerMailCity 			= aa.env.getValue("OwnerMailCity");
var OwnerMailState 			= aa.env.getValue("OwnerMailState");
var OwnerMailZip 			= aa.env.getValue("OwnerMailZip");
var OwnerMiddleName 			= aa.env.getValue("OwnerMiddleName");
var OwnerPhone 				= aa.env.getValue("OwnerPhone");
var OwnerPrimaryFlag 			= aa.env.getValue("OwnerPrimaryFlag");
var OwnerValidatedNumber 		= aa.env.getValue("OwnerValidatedNumber");
var ParcelArea 				= aa.env.getValue("ParcelArea");
var ParcelBlock 			= aa.env.getValue("ParcelBlock");
var ParcelBook 				= aa.env.getValue("ParcelBook");
var ParcelExcemptValue 			= aa.env.getValue("ParcelExcemptValue");
var ParcelImprovedValue 		= aa.env.getValue("ParcelImprovedValue");
var ParcelLandValue 			= aa.env.getValue("ParcelLandValue");
var ParcelLegalDescription 		= aa.env.getValue("ParcelLegalDescription");
var ParcelLot 				= aa.env.getValue("ParcelLot");
var ParcelPage 				= aa.env.getValue("ParcelPage");
var ParcelParcel 			= aa.env.getValue("ParcelParcel");
var ParcelTract 			= aa.env.getValue("ParcelTract");
var ParcelValidatedNumber 		= aa.env.getValue("ParcelValidatedNumber");
var ViolationAddressLine1 		= aa.env.getValue("ViolationAddressLine1");
var ViolationAddressLine2 		= aa.env.getValue("ViolationAddressLine2");
var ViolationCity 			= aa.env.getValue("ViolationCity");
var ViolationComment 			= aa.env.getValue("ViolationComment");
var ViolationLocation 			= aa.env.getValue("ViolationLocation");
var ViolationState 			= aa.env.getValue("ViolationState");
var ViolationZip  			= aa.env.getValue("ViolationZip");

var capId = null;
var cap = null;
var capIDString = "";
var appTypeResult = null;
var appTypeString = "";
var appTypeArray = new Array();
var capName = null;
var capStatus = null;
var fileDateObj = null;
var fileDate = null;
var fileDateYYYYMMDD = null;
var parcelArea = 0;
var estValue = 0;
var calcValue = 0;
var houseCount = 0;
var feesInvoicedTotal = 0;
var balanceDue = 0;
var houseCount = 0;
var feesInvoicedTotal = 0;
var capDetail = "";
var AInfo = new Array();
var partialCap = false;
var feeFactor = "";
var parentCapId = null;

var appName = ApplicationName;
appTypeString = ApplicationTypeLevel1 + "/" + ApplicationTypeLevel2 + "/" + ApplicationTypeLevel3 + "/" + ApplicationTypeLevel4;
appTypeArray = appTypeString.split("/");// Array of application type string

var currentUserGroupObj = aa.userright.getUserRight(appTypeArray[0],currentUserID).getOutput();
if (currentUserGroupObj) currentUserGroup = currentUserGroupObj.getGroupName();

logDebug("<B>EMSE Script Results for " + appName + "</B>");
logDebug("currentUserID = " + currentUserID);
logDebug("currentUserGroup = " + currentUserGroup);
logDebug("systemUserObj = " + systemUserObj.getClass());
logDebug("appTypeString = " + appTypeString);
logDebug("sysDate = " + sysDate.getClass());

var CAENumber = parseInt(CAEValidatedNumber);
var CAE;
var CAEAtt;

loadAppSpecificBefore(AInfo);
loadASITablesBefore();
//loadParcelAttributes(AInfo);

// Get CAE Attributes
if (CAENumber > 0) {
	var CAEResult = aa.licenseScript.getRefLicenseProfBySeqNbr(servProvCode,CAENumber)
	if (CAEResult.getSuccess()) { 
		CAE=CAEResult.getOutput();
	} else { 
		logDebug("**ERROR: getting CAE : " + CAEResult.getErrorMessage()); 
	}
}

if (CAE) CAEAtt = CAE.getLicenseModel().getAttributes();

if (CAEAtt) {
	itr = CAEAtt.values().iterator();
	while(itr.hasNext()) {
		y = itr.next()
		itr2 = y.iterator();
		while (itr2.hasNext()) {
			pam = itr2.next();
			AInfo["CAEAttribute." + pam.getAttributeName()] = pam.getAttributeValue();
		}
	}
}

logDebug("parcelArea = " + parcelArea);

capId = null;
if (typeof(getCapId) != "undefined")
	capId = getCapId();
 
if(capId == null){
	if(aa.env.getValue("CapId") != ""){
		sca = String(aa.env.getValue("CapId")).split("-");
		capId = aa.cap.getCapID(sca[0],sca[1],sca[2]).getOutput();
	}else if(aa.env.getValue("CapID") != ""){
		sca = String(aa.env.getValue("CapID")).split("-");
		capId = aa.cap.getCapID(sca[0],sca[1],sca[2]).getOutput();
	}
}

if(capId != null){
	capIDString = capId.getCustomID();
	cap = aa.cap.getCap(capId).getOutput();
	capName = cap.getSpecialText();
	capStatus = cap.getCapStatus();
	partialCap = !cap.isCompleteCap();
	fileDateObj = cap.getFileDate();
	fileDate = "" + fileDateObj.getMonth() + "/" + fileDateObj.getDayOfMonth() + "/" + fileDateObj.getYear();
	fileDateYYYYMMDD = dateFormatted(fileDateObj.getMonth(),fileDateObj.getDayOfMonth(),fileDateObj.getYear(),"YYYY-MM-DD");

	var valobj = aa.finance.getContractorSuppliedValuation(capId,null).getOutput();

	if (valobj.length) {
		estValue = valobj[0].getEstimatedValue();
		calcValue = valobj[0].getCalculatedValue();
		feeFactor = valobj[0].getbValuatn().getFeeFactorFlag();
	}

	var capDetailObjResult = aa.cap.getCapDetail(capId);
	if (capDetailObjResult.getSuccess()) {
		capDetail = capDetailObjResult.getOutput();
		var houseCount = capDetail.getHouseCount();
		var feesInvoicedTotal = capDetail.getTotalFee();
		var balanceDue = capDetail.getBalance();
	}

	var parentCapString = "" + aa.env.getValue("ParentCapID");
	if (parentCapString.length > 0) { parentArray = parentCapString.split("-"); parentCapId = aa.cap.getCapID(parentArray[0], parentArray[1], parentArray[2]).getOutput(); }
	if (!parentCapId) { parentCapId = getParent(); }
	if (!parentCapId) { parentCapId = getParentLicenseCapID(capId); }


	logDebug("capId = " + capId.getClass());
	logDebug("cap = " + cap.getClass());
	logDebug("capName = " + capName);
	logDebug("capStatus = " + capStatus);
	logDebug("fileDate = " + fileDate);
	logDebug("fileDateYYYYMMDD = " + fileDateYYYYMMDD);
	logDebug("estValue = " + estValue);
	logDebug("calcValue = " + calcValue);
	logDebug("feeFactor = " + feeFactor);
	logDebug("houseCount = " + houseCount);
	logDebug("feesInvoicedTotal = " + feesInvoicedTotal);
	logDebug("balanceDue = " + balanceDue);
	if (parentCapId) { logDebug("parentCapId = " + parentCapId.getCustomID()); }
}
//aa.sendMail("noreply@cityofmadison.com", "jmoyer@cityofmadison.com", "jmoyer@cityofmadison.com", "CRCBIG", debug);