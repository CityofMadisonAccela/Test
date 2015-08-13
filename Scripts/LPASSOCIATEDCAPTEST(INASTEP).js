 var showMessage = false;			// Set to true to see results in popup windowvar showDebug = true;				// Set to true to see debug messages in popup windowvar controlString = "ApplicationStatusUpdateToApprovedAfter";  // Standard choice for controlvar documentOnly = false;			// Document Only -- displays hierarchy of std choice stepsvar disableTokens = false;			// turn off tokenizing of App Specific and Parcel Attributesvar useAppSpecificGroupName = false;		// Use Group name when populating App Specific Info Valuesvar useTaskSpecificGroupName = false;		// Use Group name when populating Task Specific Info Valuesvar maxEntries = 99;				// Maximum number of std choice entries.  Must be Left Zero Padded/*----------------------------------------------------------------------------------------------------/|| END USER CONFIGURABLE PARAMETERS|/------------------------------------------------------------------------------------------------------*/var capId = getCapId();					// CapId objectvar cap = aa.cap.getCap(capId).getOutput();		// Cap object (CapScriptModel)var currentUserID = aa.env.getValue("CurrentUserID");   // Current UServar licenseType = "CONTRACTOR";/*------1st group trade name key in ASI------------*/var tradeName1Key1 = "EnglishTradeName1";var tradeName2Key1 = "ArabicTradeName1";/*------2nd group trade name key in ASI------------*/var tradeName1Key2 = "EnglishTradeName2";var tradeName2Key2 = "ArabicTradeName2";/*------3rd group trade name key in ASI------------*/var tradeName1Key3 = "EnglishTradeName3";var tradeName2Key3 = "ArabicTradeName3";/*------People template attribute name key in ASI------------*/var legalFormKey = "LegalForm";var financeNbrKey = "FinanceNbr";var status = aa.env.getValue("ApplicationStatus"); //status = "Approved";if (status == "Approved"){//Update "Approved" to the status value which delegates "approve" in status group	var licenseResult = aa.licenseScript.createAssociatedLicenseProfessional(cap,licenseType,tradeName1Key1,tradeName1Key2,tradeName1Key3,tradeName2Key1,tradeName2Key2,tradeName2Key3,legalFormKey,financeNbrKey);	if (licenseResult.getSuccess())	{		aa.print("Successfully created AssociatedLicenseProfessional .");			}	else	{		aa.print("ERROR: Failed to created ref license professional Info : " + licenseResult.getErrorMessage());	}}function getCapId()  {/*    var s_id1 = aa.env.getValue("PermitId1");    var s_id2 = aa.env.getValue("PermitId2");    var s_id3 = aa.env.getValue("PermitId3"); */ var s_id1 = "08HUI";    var s_id2 = "00000";    var s_id3 = "00133";    var s_capResult = aa.cap.getCapID(s_id1, s_id2, s_id3);    if(s_capResult.getSuccess())      return s_capResult.getOutput();    else    {      aa.print("ERROR: Failed to get capId: " + s_capResult.getErrorMessage());      return null;    }}