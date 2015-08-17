/*------------------------------------------------------------------------------------------------------/
| Program: Batch Expiration.js  Trigger: Batch
| Client: Tresurer Department
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
var maxSeconds = 60 * 5;
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

var publicCheck = getParam("PublicUserCheck");
var servProvCode = "MADISON";
var cAppGroup = "Licenses";
var cAppType = "Treasurer";
var cAppSubtype =  "*";
var cAppCategory = "NA";
var curStatus = "";
var fromDate = "12/30/" + startDate.getFullYear();
var toDate = "01/01/" + (startDate.getFullYear() + 1);
var capId = null;
var appSubType = "";
var emailAddress = "jmoyer@cityofmadison.com";

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
	var notifyStartDate = new Date("11/01/" + startDate.getFullYear());
	var notifyEndDate = new Date("11/30/" + startDate.getFullYear());
	
	if (startDate >= notifyStartDate && startDate <= notifyEndDate) {
		logDebug("<b>Processing: Pet License Notification</b>" + br);
		curStatus = "About to Expire";
		processNotify();
	} 
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

		if (appTypeArray[0] == cAppGroup && appTypeArray[1] == cAppType && appTypeArray[3] == cAppCategory) {
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
				if (createdByACA) {
					prepareAndSendRenewOnlineEmail(false, null);
				} else {//License created by staff
					if (applicantEmail != "No Email Address") {//An email exists for the applicant
						if (publicCheck == "Y") {//Create accounts
							var refContNum = applicant.getCapContactModel().getRefContactNumber();
							logDebug(tab + "Ref. Contact Number: " + refContNum);
							if (refContNum) {//Found a reference contact
								var puRefContactResult = aa.publicUser.getPublicUserListByContactNBR(aa.util.parseLong(refContNum));
								if (puRefContactResult != null) {//Found a public user(s) associated with the ref contact
									var puRefContactIterator = puRefContactResult.getOutput().iterator();
									var puByEmailResult = aa.publicUser.getPublicUserByEmail(applicantEmail).getOutput();
									if (puByEmailResult != null) {//Found a public user with the same email as the applicant contact email
										var puBEEmail = puByEmailResult.getEmail();
										logDebug(tab + "Applicant Public User Email: " + puBEEmail);
										var found = false;
										while (puRefContactIterator.hasNext()) {
											refCon = puRefContactIterator.next();
											puRefContactEmail = refCon.getEmail();
											logDebug(tab + "Ref Contact Public User Email: " + puRefContactEmail);
											if (puRefContactEmail.equals(puBEEmail)) {//There is a match for public user email and email of a ref contact on the account
												found = true;
											} 
										}
										if (found) {//Already associated
											logDebug(tab + "Public User already associated to Ref. Contact and Ref. Contact is associated " + 
											"to Applicant." + br);
											prepareAndSendRenewOnlineEmail(false, null);
										} else {//Verified email match, now link
											aa.licenseScript.associateContactWithPublicUser(puByEmailResult.getUserSeqNum(), refContNum);
											logDebug(tab + "Ref. Contact associated to Applicant Public User." + br);
											prepareAndSendRenewOnlineEmail(false, null);
										}
									} else {//No matching public user email
										var userMod = createPublicUserFromContact();
										logDebug(tab + "Ref. Contact Existed.  Public user created and associated to Ref Contact." + br);
										prepareAndSendRenewOnlineEmail(true, userMod);
									}
								} else {//Did not find a public user associated with the reference contact
									var puByEmailResult = aa.publicUser.getPublicUserByEmail(applicantEmail).getOutput();
									if (puByEmailResult != null) {//However there is a public user account with the applicant email address
										aa.licenseScript.associateContactWithPublicUser(puByEmailResult.getUserSeqNum(), refContNum);
										logDebug(tab + "Applicant Public User exits and Ref. Contact is associated to Public User." + br);
										prepareAndSendRenewOnlineEmail(false, null);
									} else {//No public user found for email address, create the public user. 
										var userMod = createPublicUserFromContact();
										logDebug(tab + "Applicant Public User created and Ref. Contact is associated to Public User." + br);
										prepareAndSendRenewOnlineEmail(true, userMod);
									}
								}
							} else {//Did not find a reference contact. Create one and link it to the public user account
								var puByEmailResult = aa.publicUser.getPublicUserByEmail(applicantEmail).getOutput();
								if (puByEmailResult != null) {//There is a public user with the same email
									var cTypeArray = new Array("Applicant");
									createRefContactsFromCapContactsAndLink(capId, cTypeArray, null, false, false, false);
									getApplicantInfo();
									var newRefConNum = applicant.getCapContactModel().getRefContactNumber();
									aa.licenseScript.associateContactWithPublicUser(puByEmailResult.getUserSeqNum(), newRefConNum);
									logDebug(tab + "Ref. Contact Created.  Associated to Public User." + br);
									prepareAndSendRenewOnlineEmail(false, null);
								} else {//There is a not public user for the email. Create the ref contact and link it to public user. 
									var cTypeArray = new Array("Applicant");
									createRefContactsFromCapContactsAndLink(capId, cTypeArray, null, false, false, false);
									var userMod = createPublicUserFromContact();
									logDebug(tab + "Ref. Contact Created.  Public user created." + br);
									prepareAndSendRenewOnlineEmail(true, userMod);
								}
							}
						} else {//Do not create an account
							//commenting this out because they don't want this email to go out this year if we choose not to create accounts
							//if (appSubType == "Chicken Owner") {
							//	appSubType = "Chicken Registration";
							//} else if (appSubType == "Dog Registration") {
							//	appSubType = "Dog License"; 
							//} else {
							//	appSubType = "Cat License";
							//}
							//emailTo = applicantEmail;
							//emailCC = " "
							//emailSubject = appSubType + " is " + curStatus;
							//emailBody = "<html><body><p>Hello " + applicantName + ",</p><p>Please be advised your " + appSubType + 
							//" with the City of Madison is " + curStatus + ".</p><p>Please visit the " +
							//"<a href='http://www.cityofmadison.com/treasurer/petLicensing.cfm'>Treasurer Pet License</a> " +
							//"website to renew your registration by mail.  Please follow the APPLY BY MAIL instructions.</p>" + 
							//"<p>You may also allow your current registration to expire and close if you wish to manage your " + 
							//appSubType + " registration online.  Follow the APPLY ONLINE instructions to start new " +
							//appSubType + ".</p>" +
							//"<p>Thank You," + br + "City of Madison Treasurer's Office</p></body></html>"
							//logDebug(tab + "Email To: " + emailTo);
							//logDebug(tab + "Email CC: " + emailCC);
							//logDebug(tab + "Email Subject: " + emailSubject);
							//logDebug(tab + "Email Body: " + emailBody);
							//if (applicantEmail != "No Email Address") {
								//aa.sendMail(emailFrom, emailTo, emailCC, emailSubject, emailBody);
							//	logDebug(tab + "Email will be sent." + br);
							//} else {
							//	logDebug(tab + "License was created by ACA but applicant does not have an email address." + br);
							//}
						}
					} else {
						logDebug(tab + "License was not created by ACA and applicant does not have an email address." + br);
					}
				}
			} else {
				logDebug(br);
			}
		}
	}
}

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/
function prepareAndSendRenewOnlineEmail(sendPubUserInfo, uMod) {
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
	" with the City of Madison is " + curStatus + ".</p><p>This license can be renewed by mail or online.  " +
	" You will receive a renewal notice from our office if you would like to continue renewing your license by mail.  " +
	"If you would like to renew online please go to the <a href='http://www.cityofmadison.com/treasurer/petLicensing.cfm'>Treasurer Pet License</a> " +
	"website for more information.  Follow the instructions to login to the City of Madison Licenses and Permits.</p><div>"
	if (sendPubUserInfo) {
		var uPwd = uMod.getPassword().toString();
		var encPwd = encryptPassword(uPwd);
		editAppSpecific("OFFICE USE ONLY.TempPassword", encPwd, capId);
		emailBody += "Your login information is listed below.  " +
		"You will be required to change your password once you are logged in." + br + br +
		tab + tab + "User Name: " + tab + uMod.getUserID() + br +
		tab + tab + "Temporary Password:  will be sent separately in the mail." + br + br +
		"It is recommended you update your Account Information under the Account Management option." + br + br
	}
	emailBody += tab + "Once logged in click on 'Search Licenses/Registrations'" + br + 
	tab + "Locate the License Number (" + altId + ")" + br + 
	tab + "In the Action column click on the 'Renew Application'." + br +
	tab + "Follow the remaining steps to complete the renewal of your " + appSubType + ".</div>" +
	"<p>Thank You," + br + "City of Madison Treasurer's Office</p></body></html>"
	logDebug(tab + "Email To: " + emailTo);
	logDebug(tab + "Email CC: " + emailCC);
	logDebug(tab + "Email Subject: " + emailSubject);
	logDebug(tab + "Email Body: " + emailBody);
	if (applicantEmail != "No Email Address") {
		//aa.sendMail(emailFrom, emailTo, emailCC, emailSubject, emailBody);
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

function encryptPassword(pass) {
	var newPass = "";
	var pwd = pass;
	var passLen = pwd.length();
	for (var i = 0; i < passLen; i++) {
		var letter = pwd.charAt(i);
		var asciiLetter = pwd.charCodeAt(i);
		var newAsciiLetter = 0;
		if (asciiLetter >= 126) {
			newAsciiLetter = 33;
		} else {
			newAsciiLetter = asciiLetter + 1;
		}
		var newLetter = String.fromCharCode(newAsciiLetter);
		newPass += newLetter;
	}
	return newPass;
}

function createPublicUserFromContact() {//optional: Contact Type, default Applicant
    var contactType = "Applicant";
	var refContactNum;
    var userModel;
    if (arguments.length > 0) contactType = arguments[0]; // use contact type specified
    var capContactResult = aa.people.getCapContactByCapID(capId);
    if (capContactResult.getSuccess()) {
		var Contacts = capContactResult.getOutput();
        for (yy in Contacts) {
            if (contactType.equals(Contacts[yy].getCapContactModel().getPeople().getContactType()))
				contact = Contacts[yy];
        }
    }
    if (!contact) { 
		logDebug("Couldn't create public user for " + contactType + ", no such contact"); 
		return false;
	}
    if (!contact.getEmail()) { 
		logDebug("Couldn't create public user for " + contactType + ", no email address");
		return false;
	}
	// get the reference contact ID.   We will use to connect to the new public user
    refContactNum = contact.getCapContactModel().getRefContactNumber();
	// check to see if public user exists already based on email address
    var getUserResult = aa.publicUser.getPublicUserByEmail(contact.getEmail())
    if (getUserResult.getSuccess() && getUserResult.getOutput()) {
        userModel = getUserResult.getOutput();
        logDebug(tab + "Found an existing public user: " + userModel.getUserID());
	}
    if (!userModel) { //create one
	    logDebug(tab + "Creating new user based on email address: " + contact.getEmail()); 
	    var publicUser = aa.publicUser.getPublicUserModel();
	    publicUser.setFirstName(contact.getFirstName());
	    publicUser.setLastName(contact.getLastName());
	    publicUser.setEmail(contact.getEmail());
	    publicUser.setUserID(contact.getEmail());
	    publicUser.setPassword("e8248cbe79a288ffec75d7300ad2e07172f487f6"); //password : 1111111111
	    publicUser.setAuditID("PublicUser");
	    publicUser.setAuditStatus("A");
	    publicUser.setCellPhone(contact.getCapContactModel().getPeople().getPhone2());
	    var result = aa.publicUser.createPublicUser(publicUser);
	    if (result.getSuccess()) {
			//logDebug("Created public user " + contact.getEmail() + "  successfully.");
			var userSeqNum = result.getOutput();
			var userModel = aa.publicUser.getPublicUser(userSeqNum).getOutput()
			//create for agency
			aa.publicUser.createPublicUserForAgency(userModel);
			//activate for agency
			var userPinBiz = aa.proxyInvoker.newInstance("com.accela.pa.pin.UserPINBusiness").getOutput()
			userPinBiz.updateActiveStatusAndLicenseIssueDate4PublicUser(servProvCode,userSeqNum,"ADMIN");
			//reset password
			var resetPasswordResult = aa.publicUser.resetPassword(contact.getEmail());
			if (resetPasswordResult.getSuccess()) {
				var resetPassword = resetPasswordResult.getOutput();
				userModel.setPassword(resetPassword);
				//logDebug("Reset password for " + contact.getEmail() + "  successfully.");
			} else {
				logDebug("**ERROR: Reset password for  " + contact.getEmail() + "  failure:" + resetPasswordResult.getErrorMessage());
			}
	    } else {
    	    logDebug("**Warning creating public user " + contact.getEmail() + "  failure: " + result.getErrorMessage()); return null;
    	}
    }
	//Now that we have a public user let's connect to the reference contact		
	if (refContactNum) {
		logDebug(tab + "Linking this public user with reference contact : " + refContactNum);
		aa.licenseScript.associateContactWithPublicUser(userModel.getUserSeqNum(), refContactNum);
	}
	return userModel; //send back the new or existing public user
}

function createRefContactsFromCapContactsAndLink(pCapId, contactTypeArray, ignoreAttributeArray, replaceCapContact, overwriteRefContact, refContactExists) {
	// contactTypeArray is either null (all), or an array or contact types to process
	// ignoreAttributeArray is either null (none), or an array of attributes to ignore when creating a REF contact
	// replaceCapContact not implemented yet
	// overwriteRefContact -- if true, will refresh linked ref contact with CAP contact data
	// refContactExists is a function for REF contact comparisons.
	// Version 2.0 Update:   This function will now check for the presence of a standard choice "REF_CONTACT_CREATION_RULES". 
	// This setting will determine if the reference contact will be created, as well as the contact type that the reference contact will 
	// be created with.  If this setting is configured, the contactTypeArray parameter will be ignored.   The "Default" in this standard
	// choice determines the default action of all contact types.   Other types can be configured separately.   
	// Each contact type can be set to "I" (create ref as individual), "O" (create ref as organization), 
	// "F" (follow the indiv/org flag on the cap contact), "D" (Do not create a ref contact), and "U" (create ref using transaction contact type).
	
	var standardChoiceForBusinessRules = "REF_CONTACT_CREATION_RULES";
	var ingoreArray = new Array();
	if (arguments.length > 1) ignoreArray = arguments[1];
	var defaultContactFlag = lookup(standardChoiceForBusinessRules,"Default");
	var c = aa.people.getCapContactByCapID(pCapId).getOutput()
	var cCopy = aa.people.getCapContactByCapID(pCapId).getOutput()  // must have two working datasets
	for (var i in c) {
		var ruleForRefContactType = "U"; //default behaviour is create the ref contact using transaction contact type
		var con = c[i];
		var p = con.getPeople();
		var contactFlagForType = lookup(standardChoiceForBusinessRules,p.getContactType());
		if (!defaultContactFlag && !contactFlagForType) {//standard choice not used for rules, check the array passed
	   	   	if (contactTypeArray && !exists(p.getContactType(),contactTypeArray)) {
				continue;//not in the contact type list.  Move along.
			}
		}
		if (!contactFlagForType && defaultContactFlag) {//explicit contact type not used, use the default
			ruleForRefContactType = defaultContactFlag;
		}
		if (contactFlagForType) {//explicit contact type is indicated
			ruleForRefContactType = contactFlagForType;
		}
		if (ruleForRefContactType.equals("D")) {
			continue;
	   	}
		var refContactType = "";
		switch(ruleForRefContactType) {
			case "U":
				refContactType = p.getContactType();
				break;
			case "I":
				refContactType = "Individual";
				break;
			case "O":
				refContactType = "Organization";
				break;
			case "F":
				if (p.getContactTypeFlag() && p.getContactTypeFlag().equals("organization")) {
					refContactType = "Organization";
				} else {
					refContactType = "Individual";
					break;
				}
		}
		var refContactNum = con.getCapContactModel().getRefContactNumber();
		if (refContactNum)  {// This is a reference contact.   Let's refresh or overwrite as requested in parms.
	   	   	if (overwriteRefContact) {
				p.setContactSeqNumber(refContactNum);  // set the ref seq# to refresh
				p.setContactType(refContactType);
				var a = p.getAttributes();
				if (a) {
					var ai = a.iterator();
					while (ai.hasNext()) {
						var xx = ai.next();
						xx.setContactNo(refContactNum);
					}
				}
				var r = aa.people.editPeopleWithAttribute(p,p.getAttributes());
				if (!r.getSuccess()) {
					logDebug("WARNING: couldn't refresh reference people : " + r.getErrorMessage()); 
				} else {
					logDebug("Successfully refreshed ref contact #" + refContactNum + " with CAP contact data"); 
				}
				if (replaceCapContact) {
					// To Be Implemented later.   Is there a use case?
				}
			
			}
	   	} else  {//user entered the contact freehand.   Let's create or link to ref contact.
			var ccmSeq = p.getContactSeqNumber();
			var existingContact = refContactExists;//Call the custom function to see if the REF contact exists
			var p = cCopy[i].getPeople();//get a fresh version, had to mangle the first for the search
			if (existingContact) {//we found a match with our custom function.  Use this one.
				refPeopleId = existingContact;
			} else {//did not find a match, let's create one
				var a = p.getAttributes();
				if (a) {//Clear unwanted attributes
					var ai = a.iterator();
					while (ai.hasNext()) {
						var xx = ai.next();
						if (ignoreAttributeArray && exists(xx.getAttributeName().toUpperCase(),ignoreAttributeArray)) {
							ai.remove();
						}
					}
				}
				p.setContactType(refContactType);
				var r = aa.people.createPeopleWithAttribute(p,a);
				if (!r.getSuccess()) {
					logDebug("WARNING: couldn't create reference people : " + r.getErrorMessage());
					continue;
				}
				// createPeople is nice and updates the sequence number to the ref seq
				var p = cCopy[i].getPeople();
				var refPeopleId = p.getContactSeqNumber();
				logDebug(tab + "Successfully created reference contact #" + refPeopleId);
			}
			// now that we have the reference Id, we can link back to reference
			var ccm = aa.people.getCapContactByPK(pCapId,ccmSeq).getOutput().getCapContactModel();
		    ccm.setRefContactNumber(refPeopleId);
		    r = aa.people.editCapContact(ccm);
		    if (!r.getSuccess()) { 
				logDebug("WARNING: error updating cap contact model : " + r.getErrorMessage()); 
			} else { 
				logDebug(tab + "Successfully linked ref contact " + refPeopleId + " to cap contact " + ccmSeq);
			}
	    } 
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