/*------------------------------------------------------------------------------------------------------/
| | Program : BikeRegRenewalSetScript.js
| Event   : Process the BIKEREGRENEWAL Set
|
| Usage   : For use with the cap set script functionality available in 6.5.0 and later.
|
| Client  : N/A
| Action# : N/A
|
| Notes   : This script process the Parent Bicycle Renewals that were entered in AA.  It invoices and 
| pays the Incomplete Renewal record.  Completes the Renewal record.  Sets the Parent Record
| Application Status to Active, sets the parent workflow to Active, sets the parent expiration status 
| to Active and sets the parent expiration date to 5/15 of 4 years in the future."
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| BEGIN Initialize Variables
/------------------------------------------------------------------------------------------------------*/

var debug = "";
var showMessage = true;
var showDebug = true;
var br = "<BR>";
var message = "";
var useAppSpecificGroupName = true;
var todaysDate = new Date();
var renewalYear = todaysDate.getFullYear() + 4;
var feeSeqList = new Array();
var paymentPeriodList = new Array();
var sysDate = aa.date.getCurrentDate();
var sysDateMMDDYYYY = dateFormatted(sysDate.getMonth(),sysDate.getDayOfMonth(),sysDate.getYear(),"");
var currentUserID = aa.env.getValue("CurrentUserID"); // Current User
var systemUserObj = null;  							// Current User Object
var currentUserGroup = null;						// Current User Group
var publicUserID = null;
var publicUser = false;

if (currentUserID.indexOf("PUBLICUSER") == 0){
	publicUserID = currentUserID; 
	currentUserID = "ADMIN"; 
	publicUser = true;
}
if(currentUserID != null){
	systemUserObj = aa.person.getUser(currentUserID).getOutput();  	// Current User Object
}
/*------------------------------------------------------------------------------------------------------/
| END Initialize Variables
/------------------------------------------------------------------------------------------------------*/

var SetMemberArray = aa.env.getValue("SetMemberArray");

SetMemberArray.sort();

for(var s = 0; s < SetMemberArray.length; s++) {
	var id = SetMemberArray[s];
	var capId = aa.cap.getCapID(id.getID1(), id.getID2(),id.getID3()).getOutput();
	var altId = capId.getCustomID();
	comment("<br>CAP: " + altId);
	
	proj = aa.cap.getProjectByChildCapID(capId, "Renewal", "Review");
	projSuccess = proj.getSuccess();
	
	if (projSuccess == true) {
		cap = aa.cap.getCap(capId).getOutput();

		if (cap) {
			logDebug("<b>Active Record " + altId + "</b>");
			capFees = aa.finance.getFeeItemByCapID(capId);
				if (capFees) {
					fees = capFees.getOutput();
					for(fee in fees) {
					invoiceFee(fees[fee].getFeeCod(), "Final", fees[fee].getCapID());
					}
				}
				// load invoices for a CAP and cycle through them
				var invoices = aa.finance.getInvoiceByCapID(capId, null);
			if (invoices.getSuccess()) {
				var invoice = invoices.getOutput();
				for(var i = 0; i < invoice.length; i++) {
					var invoiceDate = convertDate(invoice[i].getInvDate());
					var invoiceNumber = invoice[i].getInvNbr();
	//load fees for the invoice and cycle throug them
					var fees = aa.finance.getFeeItemInvoiceByInvoiceNbr(capId, invoiceNumber, null);
					var feeSeqNumber = new Array();
					var feeInvNumber = new Array();
					var feeAmount = new Array();
					var index = 0;
					var paymentAmount = 0;
	//if invoice amount is greater than 0 write line
					if (invoice[i].getInvoiceModel().getInvAmount() > 0) {
						comment("    Invoice: " + invoiceNumber + " invoiced on " + formatJSDate(invoiceDate));
					}

					if (fees.getSuccess()) {
						var fee = fees.getOutput();
						for(var f = 0; f < fee.length; f++) {
							var feeItemStatus = fee[f].getFeeitemStatus();
							var feeDescription = fee[f].getFeeDescription();
							var feeItemInvoice = fee[f].getInvoiceNbr();
							var feeItemSeqNum = fee[f].getFeeSeqNbr();
	//if the fee item is invoiced and is a reinspection fee add seq# to array, add invoice number to array
	//add fee amount array and total fee amount in paymentAmount
							if (feeItemStatus == "INVOICED") {
								var item = isFeePaid(capId, feeItemInvoice, feeItemSeqNum);
								if (item == false) {
									feeSeqNumber[index] = fee[f].getFeeSeqNbr();
									feeInvNumber[index] = fee[f].getInvoiceNbr();
									feeAmount[index] = fee[f].getFee();
									paymentAmount = paymentAmount + fee[f].getFee();
									index++;
									comment("  Fee: " + feeDescription + " with a status of " + feeItemStatus + " in the amount of $" + fee[f].getFee() + ".00");
								}
							}
						}
					}
					
					if (invoice[i].getInvoiceModel().getInvAmount() > 0 && paymentAmount > 0) {
							comment("        Payment Amount Needed: $" + paymentAmount + ".00");
							var makePay = aa.finance.makePayment(capId, "Process", "9999", "", aa.date.getCurrentDate(), "Bicycle Registration Renewal", 
							aa.date.getCurrentDate(), paymentAmount, 0, paymentAmount, "Paid", "", "BikeRenew", "123", "Bicycle Registration Renewal");
						if (makePay.getSuccess()) {
							var payments = aa.finance.getPaymentByCapID(capId, null);
							if (payments.getSuccess()) {
									var payment = payments.getOutput();
								for(var p = 0; p < payment.length; p++) {
										var receiptNumber = payment[p].getReceiptNbr();
										var amountNotAllocated = payment[p].getAmountNotAllocated();
										var payDate = payment[p].getPaymentDate();
										var payMethod = payment[p].getPaymentMethod();
										var paySeqNum = payment[p].getPaymentSeqNbr();									
									if(payMethod == "Process" && receiptNumber == 0 && amountNotAllocated > 0) {
											var applyPay = aa.finance.applyPayment(capId, paySeqNum, 0, feeSeqNumber, feeInvNumber, 
											feeAmount, aa.date.getCurrentDate(), feeItemStatus, "INVOICED", "BikeRenew", "123");
										if (applyPay.getSuccess()) {
											r = aa.cap.getProjectByChildCapID(capId, "Renewal", "Review").getOutput();
											parentCapId = r[0].getProjectID();
											r[0].setStatus("Complete");
											aa.cap.updateProject(r[0]);
											pConArray = getContactArray(parentCapId);
											if (pConArray) {
												for (pC in pConArray) {
													aa.people.removeCapContact(parentCapId, pConArray[pC].contactSeqNumber);
												}
											}
											copyContacts(capId, parentCapId);
											copyASIFields(capId, parentCapId);
											var ifTwo = getAppSpecific("DECAL INFORMATION.If two other bicycles currently registered in household, check this box", capId);
											editAppSpecific("DECAL INFORMATION.If two other bicycles currently registered in household, check this box", ifTwo, parentCapId);
											editAppSpecific("DECAL INFORMATION.Expiration Date", "5/15/" + renewalYear, parentCapId);
											licEditExpInfo("Active", "5/15/" + renewalYear, parentCapId);
											updateTask("License Status","Active","Updated from Renewal Set", "Updated from Renewal Set", "TEBKREG", parentCapId);
											updateAppStatus("Registration Active", "Updated from Renewal Set", parentCapId);
											var bicycleDecal = getAppSpecific("DECAL INFORMATION.Decal Number"); 
											var bicycleSerial = getAppSpecific("BICYCLE INFORMATION.Serial Number");
											updateShortNotes(bicycleDecal, parentCapId); 
											editAppName(bicycleSerial, parentCapId);
											var genReceipt = aa.finance.generateReceipt(capId, payDate, paySeqNum, "TaxRoll", "123");
											//aa.set.removeSetHeadersListByCap("BIKEREGRENEWAL", capId);
											if(genReceipt.getSuccess()) {
												comment("<b>Payment was made and applied.  The receipt was generated for the most recent renewal record for CAP: " + 
												altId + ", Invoice: " + invoiceNumber + "</b><br>");
											} else {
												comment("<font color='red'><b>Payment was made and applied. The receipt was not generated for CAP: " + altId + ", Invoice: " + invoiceNumber + "</b></font><br>");
											}
										} else {
											comment("<font color='red'><b>Payment was made but not applied to CAP: " + altId + ", Invoice: " + invoiceNumber + "</b></font><br>"); 
										}
									}
								}
							}
						} else {
							comment("<font color='red'><b>Payment failed for CAP: " + altId + ", Invoice: " + invoiceNumber + "</b></font><br>"); 
						}
					} else {
						comment("<b>Payment was previously made for CAP: " + altId + ", Invoice: " + invoiceNumber + "</b><br>"); 
					}
				}
			}
		}
	}
}
aa.sendMail("noreply@cityofmadison.com", "jmoyer@cityofmadison.com", " ", "Bike Reg Renewal", debug);
aa.env.setValue("ScriptReturnCode","0");
aa.env.setValue("ScriptReturnMessage", "The Bicycle Registration Renewal payment/completion process is complete.");

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function invoiceFee(fcode, fperiod, itemCap) { //invoices all assessed fees having fcode and fperiod
	var feeFound=false;
	getFeeResult = aa.finance.getFeeItemByFeeCode(itemCap,fcode,fperiod);
	if (getFeeResult.getSuccess()) {
		var feeList = getFeeResult.getOutput();
		for (feeNum in feeList) {
			if (feeList[feeNum].getFeeitemStatus().equals("NEW")) {
				var feeSeq = feeList[feeNum].getFeeSeqNbr();
				feeSeqList.push(feeSeq);
				paymentPeriodList.push(fperiod);
				var inv = aa.finance.createInvoice(itemCap, feeSeqList, paymentPeriodList);
				logDebug("Assessed fee " + fcode + " found and invoiced");
				feeFound=true;
			}
		}
	} else { 
		logDebug( "**ERROR: getting fee items (" + fcode + "): " + getFeeResult.getErrorMessage())}
		return feeFound;
}

function isFeePaid(xCapId, xiNum, xfSeq) {
	var pass = false;
	var xPayFees = aa.finance.getPaymentFeeItems(capId, null);
	if (xPayFees.getSuccess()) {
		var xPayFee = xPayFees.getOutput();
		for(var x = 0; x < xPayFee.length; x++) {
			var xPayFeeInvoice = xPayFee[x].getInvoiceNbr();
			var xPayFeeSeqNum = xPayFee[x].getFeeSeqNbr();
			if (xPayFeeInvoice == xiNum && xPayFeeSeqNum == xfSeq) {
				pass = true;
				break;
			}
		}
	}
	return pass;
}

function copyASIFields(sourceCapId,targetCapId) {//optional groups to ignore
	var ignoreArray = new Array();
	for (var i=2; i<arguments.length;i++)
		ignoreArray.push(arguments[i])
	var targetCap = aa.cap.getCap(targetCapId).getOutput();
	var targetCapType = targetCap.getCapType();
	var targetCapTypeString = targetCapType.toString();
	var targetCapTypeArray = targetCapTypeString.split("/");
	var sourceASIResult = aa.appSpecificInfo.getByCapID(sourceCapId)
	if (sourceASIResult.getSuccess()) {
		var sourceASI = sourceASIResult.getOutput(); 
	} else {
		logDebug( "**ERROR: getting source ASI: " + sourceASIResult.getErrorMessage());
		return false
	}
	for (ASICount in sourceASI) {
		thisASI = sourceASI[ASICount];
		if (!exists(thisASI.getCheckboxType(),ignoreArray)) {
			thisASI.setPermitID1(targetCapId.getID1())
			thisASI.setPermitID2(targetCapId.getID2())
			thisASI.setPermitID3(targetCapId.getID3())
			thisASI.setPerType(targetCapTypeArray[1])
			thisASI.setPerSubType(targetCapTypeArray[2])
			test = aa.cap.createCheckbox(thisASI);
			if (test.getErrorMessage() == "CreateAppSpecInfoDuplicatedException") {
				editAppSpecific(thisASI.getCheckboxType() + "." + thisASI.getCheckboxDesc(), thisASI.getChecklistComment(), targetCapId);
			}
		}
	}
}

function getAppSpecific(itemName) {//optional: itemCap
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
				if( appspecObj[i].getCheckboxDesc() == itemName && (!useAppSpecificGroupName || appspecObj[i].getCheckboxType() == itemGroup)) {
					return appspecObj[i].getChecklistComment();
					break;
				}
			}
		}//item name blank
	} else { 
		logDebug( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage())
	}
}

function editAppSpecific(itemName,itemValue) {//optional: itemCap
	var itemCap = capId;
	var itemGroup = null;
	if (arguments.length == 3) itemCap = arguments[2];//use cap ID specified in args
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
	 	if(arguments.length < 3) //If no capId passed update the ASI Array
	 		AInfo[itemName] = itemValue; 
	} else {
		logDebug( "Information: " + itemName + " was not updated.");
	}
}

function updateShortNotes(newSN) {//option CapId
	var itemCap = capId
	if (arguments.length > 1) itemCap = arguments[1]; //use cap ID specified in args
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
	cd.setShortNotes(newSN);
	cdWrite = aa.cap.editCapDetail(cd)
	if (cdWrite.getSuccess()) {
		logDebug("updated short notes to " + newSN)
	} else {
		logDebug("**ERROR writing capdetail : " + cdWrite.getErrorMessage());
		return false;
	}
}

function editAppName(newname) {//option CapId
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1];//use cap ID specified in args
	capResult = aa.cap.getCap(itemCap)
	if (!capResult.getSuccess()) {
		logDebug("**WARNING: error getting cap : " + capResult.getErrorMessage());
		return false;
	}
	capModel = capResult.getOutput().getCapModel()
	capModel.setSpecialText(newname)
	setNameResult = aa.cap.editCapByPK(capModel)
	if (!setNameResult.getSuccess()) {
		logDebug("**WARNING: error setting cap name : " + setNameResult.getErrorMessage());
		return false
	}
	return true;
}

function copyContacts(pFromCapId, pToCapId) {//Copies all contacts from pFromCapId to pToCapId
	if (pToCapId==null) {
		var vToCapId = capId;
	} else {
		var vToCapId = pToCapId;
	}
	var capContactResult = aa.people.getCapContactByCapID(pFromCapId);
	var copied = 0;
	if (capContactResult.getSuccess()) {
		var Contacts = capContactResult.getOutput();
		for (yy in Contacts) {
			var newContact = Contacts[yy].getCapContactModel();
			newContact.setCapID(vToCapId);
			aa.people.createCapContact(newContact);
			copied++;
			logDebug("Copied contact from "+pFromCapId.getCustomID()+" to "+vToCapId.getCustomID());
		}
	} else {
		logMessage("**ERROR: Failed to get contacts: " + capContactResult.getErrorMessage()); 
		return false; 
	}
	return copied;
}

function getContactArray() {//optional capid
	var thisCap = capId;
	if (arguments.length == 1) thisCap = arguments[0];
	var cArray = new Array();
	var capContactResult = aa.people.getCapContactByCapID(thisCap);
	if (capContactResult.getSuccess()) {
		var capContactArray = capContactResult.getOutput();
	}
	if (capContactArray) {
		for (yy in capContactArray) {
			var aArray = new Array();
			aArray["contactSeqNumber"] =capContactArray[yy].getPeople().contactSeqNumber;
			cArray.push(aArray);
		}
	}
	return cArray;
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

function updateTask(wfstr,wfstat,wfcomment,wfnote) { //optional process name, capid
	var useProcess = false;
	var processName = "";
	if (arguments.length > 4) {
		if (arguments[4] != "") {
			processName = arguments[4]; //subprocess
			useProcess = true;
		}
	}
	var itemCap = capId;
	if (arguments.length == 6) itemCap = arguments[5]; //use cap ID specified in args
	var workflowResult = aa.workflow.getTasks(itemCap);
	if (workflowResult.getSuccess()) {
		var wfObj = workflowResult.getOutput();
	} else { 
		logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); 
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
				logMessage("Updating Workflow Task " + wfstr + " with status " + wfstat);
				logDebug("Updating Workflow Task " + wfstr + " with status " + wfstat);
				}
			}
		}
	}
}

function updateAppStatus(stat,cmt) { //optional cap id
	var itemCap = capId;
	if (arguments.length == 3) {
		itemCap = arguments[2]; // use cap ID specified in args
	}
	var updateStatusResult = aa.cap.updateAppStatus(itemCap, "APPLICATION", stat, sysDate, cmt, systemUserObj);
	if (updateStatusResult.getSuccess()) {
		logDebug("Updated application status to " + stat + " successfully.");
	} else {
		logDebug("**ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
	}
}

function licEditExpInfo (pExpStatus, pExpDate, pCap) {//Edits expiration status and/or date
	var lic = new licenseObject(null, pCap);
	if (pExpStatus!=null) {
		lic.setStatus(pExpStatus);
	}
	if (pExpDate!=null) {
		lic.setExpiration(pExpDate);
	}
}

function licenseObject(licnumber) {//optional renewal Cap ID -- uses the expiration on the renewal CAP.
	itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
	this.refProf = null;		// licenseScriptModel (reference licensed professional)
	this.b1Exp = null;		// b1Expiration record (renewal status on application)
	this.b1ExpDate = null;
	this.b1ExpCode = null;
	this.b1Status = null;
	this.refExpDate = null;
	this.licNum = licnumber;	// License Number
	// Load the reference License Professional if we're linking the two
	if (licnumber) {//we're linking
		var newLic = getRefLicenseProf(licnumber)
		if (newLic) {
			this.refProf = newLic;
			tmpDate = newLic.getLicenseExpirationDate();
			if (tmpDate) {
				this.refExpDate = tmpDate.getMonth() + "/" + tmpDate.getDayOfMonth() + "/" + tmpDate.getYear();
				logDebug("Loaded reference license professional with Expiration of " + this.refExpDate);
			}
		}
	}
	// Load the renewal info (B1 Expiration)
	b1ExpResult = aa.expiration.getLicensesByCapID(itemCap)
	if (b1ExpResult.getSuccess()) {
		this.b1Exp = b1ExpResult.getOutput();
		tmpDate = this.b1Exp.getExpDate();
		if (tmpDate) {
			this.b1ExpDate = tmpDate.getMonth() + "/" + tmpDate.getDayOfMonth() + "/" + tmpDate.getYear();
			this.b1Status = this.b1Exp.getExpStatus();
			logDebug("Found renewal record of status : " + this.b1Status + ", Expires on " + this.b1ExpDate);
		}
	} else { 
		logDebug("**ERROR: Getting B1Expiration Object for Cap.  Reason is: " + b1ExpResult.getErrorType() + ":" + b1ExpResult.getErrorMessage()); 
		return false;
	}
	this.setExpiration = function(expDate) {// Update expiration date
		var expAADate = aa.date.parseDate(expDate);
		if (this.refProf) {
			this.refProf.setLicenseExpirationDate(expAADate);
			aa.licenseScript.editRefLicenseProf(this.refProf);
			logDebug("Updated reference license expiration to " + expDate); 
		}
		if (this.b1Exp) {
			this.b1Exp.setExpDate(expAADate);
			aa.expiration.editB1Expiration(this.b1Exp.getB1Expiration());
			logDebug("Updated renewal to " + expDate); 
		}
	}
	this.setIssued = function(expDate) {// Update Issued date
		var expAADate = aa.date.parseDate(expDate);
		if (this.refProf) {
			this.refProf.setLicenseIssueDate(expAADate);
			aa.licenseScript.editRefLicenseProf(this.refProf);
			logDebug("Updated reference license issued to " + expDate);
		}
	}
	this.setLastRenewal = function(expDate) {//Update expiration date
		var expAADate = aa.date.parseDate(expDate)
		if (this.refProf) {
			this.refProf.setLicenseLastRenewalDate(expAADate);
			aa.licenseScript.editRefLicenseProf(this.refProf);
			logDebug("Updated reference license issued to " + expDate);
		}
	}
	this.setStatus = function(licStat) {//Update expiration status
		if (this.b1Exp)  {
			this.b1Exp.setExpStatus(licStat);
			aa.expiration.editB1Expiration(this.b1Exp.getB1Expiration());
			logDebug("Updated renewal to status " + licStat); 
		}
	}
	this.getStatus = function() {//Get Expiration Status
		if (this.b1Exp) {
			return this.b1Exp.getExpStatus();
		}
	}
	this.getCode = function() {
		if (this.b1Exp) {
			return this.b1Exp.getExpCode();
		}
	}
}

function convertDate(thisDate) { // convert ScriptDateTime to Javascript Date Object
	xMonth = thisDate.getMonth();
	xYear = thisDate.getYear();
	xDay = thisDate.getDayOfMonth();
	var xDate = xMonth + "/" + xDay + "/" + xYear;
	return (new Date(xDate));
}

function formatDate(thisDate) { //format ScriptDateTime to MM/dd/yyyy
	return thisDate.getMonth() + "/" + thisDate.getDayOfMonth() + "/" + thisDate.getYear();
}

function formatJSDate(thisDate) { //format javascriptDateTime to MM/dd/yyyy
	xMonth = thisDate.getMonth() + 1;
	xYear = thisDate.getFullYear();
	xDay = thisDate.getDate();
	xDate = xMonth + "/" + xDay + "/" + xYear;
	return xDate;
}

function dateFormatted(pMonth,pDay,pYear,pFormat) {//returns date string formatted as YYYY-MM-DD or MM/DD/YYYY (default)
	var mth = "";
	var day = "";
	var ret = "";
	if (pMonth > 9) {
		mth = pMonth.toString();
	} else {
		mth = "0"+pMonth.toString();
	}
	if (pDay > 9) {
		day = pDay.toString();
	} else {
		day = "0"+pDay.toString();
	}
	if (pFormat=="YYYY-MM-DD") {
		ret = pYear.toString()+"-"+mth+"-"+day;
	} else {
		ret = ""+mth+"/"+day+"/"+pYear.toString();
	}
	return ret;
}

function exists(eVal, eArray) {
	  for (ii in eArray)
	  	if (eArray[ii] == eVal) return true;
	  return false;
}

function logDebug(dstr) {
	debug+=dstr + br;
}

function logMessage(dstr) {
	message+=dstr + br;
}

function debugObject(object) {
	var output = ''; 
	for (property in object) { 
		output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
	} 
	logDebug(output);
} 

function comment(cstr) {
	if (showDebug) logDebug(cstr);
	if (showMessage) logMessage(cstr);
}