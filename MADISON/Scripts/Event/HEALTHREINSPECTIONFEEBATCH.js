/*This is a batch script to run through a set and print a report and email the set version of the report.
	There are 5 parameters to use
	
	"SetName"
	"CrystalReport"
	"CrystalReportSet"
	"GroupEmail"
	"ProcessSetReport"
	
	It assumes we are dealing with a Crystal report and that the report uses the 'val1' parameter
*/

var maxMinutes = 60;
var maxSeconds = 60 * maxMinutes; //number of seconds allowed for batch processing, usually < 60 * 5
batchJobResult = aa.batchJob.getJobID()
batchJobName = "" + aa.env.getValue("BatchJobName");

batchJobID = 0;
if (batchJobResult.getSuccess()) {
	batchJobID = batchJobResult.getOutput();
	logDebug("Batch Job " + batchJobName + " Job ID is " + batchJobID);
} else {
	logDebug("Batch job ID not found " + batchJobResult.getErrorMessage());
}

var sysDate = aa.date.getCurrentDate();
var timeDate = new Date();
var startTime = timeDate.getTime();// Start timer
var timeExpired = false;
var showMessage = true;
var showDebug = true;
var message = "";
var debug = "";
var br = "<BR>";
var capId;
var altId;
var emailText = "";
var rptFile;
var cap;
var appTypeResult;
var appTypeString;
var appTypeArray;

var setName = getParam("SetName");
var crystalReportName = getParam("CrystalReport");
var crystalReportNameSet = getParam("CrystalReportSet");
var groupEmail = getParam("GroupEmail");
var processSetReport = getParam("ProcessSetReport");

var countAll = 0;
var countProcessed = 0;
var date = new Date();
var prevMonthFirst = new Date(date.getFullYear(), date.getMonth() - 1, 1);
var prevMonthLast = new Date(date.getFullYear(), date.getMonth(), 0);
var currMonthFirst = new Date(date.getFullYear(), date.getMonth(), 1);
var currMonthLast = new Date(date.getFullYear(), date.getMonth() + 1, 0);

logDebug("Previous Month First: " + prevMonthFirst);
logDebug("Previous Month Last: " + prevMonthLast);
logDebug("Current Month First: " + currMonthFirst);
logDebug("Current Month Last: " + currMonthLast);

if (!timeExpired) mainProcess();

function mainProcess() {

	if (processSetReport == "Y") {
		altId = setName;
		appTypeArray = new Array();
		appTypeArray[0] = "Licenses";
		rptFile = reportViewAttachEmail(crystalReportNameSet, false, false, true);
	} else {
		rptFile = "";
	}
	
	setMembers = aa.set.getCAPSetMembersByPK(setName);
	if (setMembers.getSuccess()) {
		setCaps = setMembers.getOutput().toArray();
		setCaps.sort();
		countAll = setCaps.length;
		logDebug("The total number of records to process is: " + countAll + br);
		var tempAltId;
		for(var c = 0; c < setCaps.length; c++) {
			if (elapsed() > maxSeconds) { //only continue if time hasn't expired
				logDebug("A script time-out has caused partial completion of this process.  Please re-run.  " + elapsed() + 
					" seconds elapsed, " + maxSeconds + " allowed.") ;
				timeExpired = true;
				break;
			}
			sca = String(setCaps[c]).split("-");
			capId = aa.cap.getCapID(sca[0],sca[1],sca[2]).getOutput();
			cap = aa.cap.getCap(capId).getOutput();
			altId = capId.getCustomID();
			if (altId.equals(tempAltId)) {
				logDebug("This record is in the set twice.  " + altId);
			} else {
				if (cap) {
					appTypeArray = new Array();
					appTypeResult = cap.getCapType();
					appTypeString = appTypeResult.toString();
					appTypeArray = appTypeString.split("/");
					logDebug("<b>Active Record " + altId + "</b>");
					// load invoices for a CAP and cycle through them
					var unpaidReinspection = 0;
					var futureUnpaidReinspection = 0;
					var invoices = aa.finance.getInvoiceByCapID(capId, null);
					if (invoices.getSuccess()) {
						var invoice = invoices.getOutput();
						for (var i = 0; i < invoice.length; i++) {
							var invoiceDate = convertDate(invoice[i].getInvDate());
							var invoiceNumber = invoice[i].getInvNbr();
							if (invoiceDate >= prevMonthFirst && invoiceDate < prevMonthLast) {
								var fees = aa.finance.getFeeItemInvoiceByInvoiceNbr(capId, invoiceNumber, null);
								if (fees.getSuccess()) {
									var fee = fees.getOutput();
									for(var f = 0; f < fee.length; f++) {
										var feeItemStatus = fee[f].getFeeitemStatus();
										var feeDescription = fee[f].getFeeDescription();
										var feeItemInvoice = fee[f].getInvoiceNbr();
										var feeItemSeqNum = fee[f].getFeeSeqNbr();
										if (feeDescription == "Re-Inspection Fee") {
											var item = isFeePaid(capId, feeItemInvoice, feeItemSeqNum);
											if (item == false) {
												unpaidReinspection++;
												logDebug("This fee is in the previous month.  This record will be removed from the set.");
												logDebug("  Unpaid Fee: " + feeDescription + " for invoice " + feeItemInvoice);
											} else {
												logDebug("This fee is in the previous month.  This record will be removed from the set.");
												logDebug("  Paid Fee: " + feeDescription + " for invoice " + feeItemInvoice);
											}
										}
									}
								}
							}
							if (invoiceDate >= currMonthFirst && invoiceDate < currMonthLast) {
								var fees = aa.finance.getFeeItemInvoiceByInvoiceNbr(capId, invoiceNumber, null);
								if (fees.getSuccess()) {
									var fee = fees.getOutput();
									for(var f = 0; f < fee.length; f++) {
										var feeItemStatus = fee[f].getFeeitemStatus();
										var feeDescription = fee[f].getFeeDescription();
										var feeItemInvoice = fee[f].getInvoiceNbr();
										var feeItemSeqNum = fee[f].getFeeSeqNbr();
										if (feeDescription == "Re-Inspection Fee") {
											var item = isFeePaid(capId, feeItemInvoice, feeItemSeqNum);
											if (item == false) {
												futureUnpaidReinspection++;
												logDebug("This fee is in the current month.  This record will not be removed from the set.");
												logDebug("  Unpaid Fee: " + feeDescription + " for invoice " + feeItemInvoice);
											} else {
												logDebug("This fee is in the current month.  This record will not be removed from the set.");
												logDebug("  Paid Fee: " + feeDescription + " for invoice " + feeItemInvoice);
											}
										}
									}
								}
							}
						}	
					}
					if (unpaidReinspection > 0) {
						var individualRptFile;
						individualRptFile = reportViewAttachEmail(crystalReportName, false, true, false); 
						countProcessed++;
						logDebug("Report Saved");
					}
					if (futureUnpaidReinspection == 0) {
						aa.set.removeSetHeadersListByCap("HEREINSPFEE", capId);
						logDebug("Record removed from set");
					} else {
						logDebug("Record not removed from set.");
					}
				}
			}
			tempAltId = altId;
		}
	}
}

aa.sendEmail("noreply@cityofmadison.com", "vstatz@publichealthmdc.com", "bcleary@publichealthmdc.com; " + groupEmail,  "Set Report for " +
		setName, "See Attached " + br + emailText + br + elapsed() + "seconds ", rptFile);		

//aa.sendEmail("noreply@cityofmadison.com", "jmoyer@cityofmadison.com", "jmoyer@cityofmadison.com",  "Set Report for " +
//		setName, "See Attached " + br + emailText + br + elapsed() + "seconds ", rptFile);
		

function reportViewAttachEmail(reportName, view, attach, email) {
	var name = "";
	var reportFile = "";
	var error = "";
	var parameters;
	var reportModel = aa.reportManager.getReportModelByName(reportName); //get detail of report to drive logic
	if (reportModel.getSuccess()) {
		reportDetail = reportModel.getOutput();
		name = reportDetail.getReportDescription();
		if (name == null || name == "") {
			name = reportDetail.getReportName();
		}
		var reportInfoModel = aa.reportManager.getReportInfoModelByName(reportName);  //get report info to change the way report runs
		if (reportInfoModel.getSuccess()) { 
			report = reportInfoModel.getOutput();
			report.setModule(appTypeArray[0]); 
			report.setCapId(capId);
			reportInfo = report.getReportInfoModel();
			//set parameters
			if (reportDetail.getReportType().equals("URL_Report")) {
				//if REPORT_TYPE = URL_Report then val1 is Report Parameter
				parameters = aa.util.newHashMap(); 
				parameters.put("AltID", altId);
			} else {
				//if REPORT_TYPE is a Reporting Service then AltID is used
				parameters = aa.util.newHashMap();
				parameters.put("AltID", altId);
			}
			report.setReportParameters(parameters);
			//process parameter selection and EDMS save
			if (attach == true && view == true ) {
				reportRun = aa.reportManager.runReport(parameters, reportDetail);
				showMessage = true;
				comment(reportRun.getOutput()); //attaches report
				if (email == true) {
					reportInfo.setNotSaveToEDMS(false);
					reportResult = aa.reportManager.getReportResult(report); //attaches report
					changeNameofDocument();
					if (reportResult.getSuccess()) {
						reportOut = reportResult.getOutput();
						reportOut.setName(changeNameofAttachment(reportOut.getName()));
						reportFile = aa.reportManager.storeReportToDisk(reportOut);
						if (reportFile.getSuccess()) {
							reportFile = reportFile.getOutput();
						} else {
							reportFile = "";
							error = "Report failed to store to disk.  Debug reportFile for error message.";
							logDebug(error);
						}
					} else {
						reportFile = "";
						error = "Report failed to run and store to disk.  Debug reportResult for error message.";
						logDebug(error);
					}
				} else {
					reportFile = "";
				}
			} else if (attach == true && view == false) {
				reportInfo.setNotSaveToEDMS(false);
				reportResult = aa.reportManager.getReportResult(report); //attaches report
				changeNameofDocument();
				if (reportResult.getSuccess()) {
					reportOut = reportResult.getOutput();
					reportOut.setName(changeNameofAttachment(reportOut.getName()));
					if (email == true) {
						reportFile = aa.reportManager.storeReportToDisk(reportOut);
						if (reportFile.getSuccess()) {
							reportFile = reportFile.getOutput();
						} else {
							reportFile = "";
							error = "Report failed to store to disk.  Debug reportFile for error message.";
							logDebug(error);
						}
					} else {
						reportFile = "";
					}
				} else {
					reportFile = "";
					error = "Report failed to run and store to disk.  Debug reportResult for error message.";
					logDebug(error);
				}
			} else if (attach == false && view == true) {
				reportRun = aa.reportManager.runReport(parameters, reportDetail);
				showMessage = true;
				comment(reportRun.getOutput());
				if (email == true) {
					reportInfo.setNotSaveToEDMS(true);
					reportResult = aa.reportManager.getReportResult(report);
					if (reportResult.getSuccess()) {
						reportOut = reportResult.getOutput();
						reportOut.setName(changeNameofAttachment(reportOut.getName()));
						reportFile = aa.reportManager.storeReportToDisk(reportOut);
						if (reportFile.getSuccess()) {
							reportFile = reportFile.getOutput();
						} else {
							reportFile = "";
							error = "Report failed to store to disk.  Debug reportFile for error message.";
							logDebug(error);
						}
					} else {
						reportFile = "";
						error = "Report failed to run and store to disk.  Debug reportResult for error message";
						logDebug(error);
					}
				} else {
					reportFile = "";
				}
			} else if (attach == false && view == false) {
				if (email == true) {
					reportInfo.setNotSaveToEDMS(true);
					reportResult = aa.reportManager.getReportResult(report);
					if (reportResult.getSuccess()) {
						reportOut = reportResult.getOutput();
						reportOut.setName(changeNameofAttachment(reportOut.getName()));
						reportFile = aa.reportManager.storeReportToDisk(reportOut);
						if (reportFile.getSuccess()) {
							reportFile = reportFile.getOutput();
						} else {
							reportFile = "";
							error = "Report failed to store to disk.  Debug reportFile for error message.";
							logDebug(error);
						}
					} else {
						reportFile = "";
						error = "Report failed to run and store to disk.  Debug reportResult for error message.";
						logDebug(error);
					}
				} else {
					reportFile = "";
				}
			}
		} else {
			reportFile = "";
			error = "Failed to get report information.  Check report name matches name in Report Manager.";
			logDebug(error);
		}
	} else {
		reportFile = "";
		error = "Failed to get report detail.  Check report name matches name in Report Manager.";
		logDebug(error);
	}
	function changeNameofDocument() {
		var docList = aa.document.getDocumentListByEntity(capId, "CAP");
		if (docList.getSuccess()) {
			var docs = docList.getOutput();
			var idocs = docs.iterator();
			while (idocs.hasNext()) {
				var doc = idocs.next();
				var curDate = new Date();
				compareDate = new Date(curDate.setMinutes(curDate.getMinutes() - 1));
				var fileUpload = doc.getFileUpLoadDate();
				fileUpload = new Date(fileUpload.toLocaleString());
				if (compareDate <= fileUpload) {				
					docName = doc.getDocName();
					extLoc = docName.indexOf(".");
					docLen = docName.length();
					ext = docName.substr(extLoc, docLen);
					docName = name + ext;
					doc.setDocName(docName);
					doc.setFileName(docName);
					aa.document.updateDocument(doc);
				}
			}
		}
	}
	function changeNameofAttachment(attachmentName) {
		rptExtLoc = attachmentName.indexOf(".");
		rptLen = attachmentName.length();
		ext = attachmentName.substr(rptExtLoc, rptLen);
		attachName = name + ext;
		return attachName
	}
	return reportFile;
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

function getParam(pParamName) {
	var ret = "" + aa.env.getValue(pParamName);
	logDebug("" + pParamName+": "+ret);
	return ret;
}

function elapsed() {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000) 
}
	
function debugObject(object) {
	var output = ''; 
	for (property in object) { 
		output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
	} 
	logDebug(output);
}

function logDebug(dstr) {
	emailText+=dstr + br;
}

function logMessage(dstr) {
	message+=dstr + br;
}

function comment(cstr) {
	if (showDebug) logDebug(cstr);
	if (showMessage) logMessage(cstr);
}
	
function dateAdd(td,amt) {
	// perform date arithmetic on a string
	// td can be "mm/dd/yyyy" (or any string that will convert to JS date)
	// amt can be positive or negative (5, -3) days
	// if optional parameter #3 is present, use working days only
	var useWorking = false;
	if (arguments.length == 3) useWorking = true;
	if (!td) {
		dDate = new Date();
	} else {
		dDate = new Date(td);
	}
	var i = 0;
	if (useWorking) {
		if (!aa.calendar.getNextWorkDay) {
			logDebug("getNextWorkDay function is only available in Accela Automation 6.3.2 or higher.");
			while (i < Math.abs(amt)) {
				dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * (amt > 0 ? 1 : -1)));
				if (dDate.getDay() > 0 && dDate.getDay() < 6)
					i++
			}
		} else 	{
			while (i < Math.abs(amt)) {
				dDate = new Date(aa.calendar.getNextWorkDay(aa.date.parseDate(dDate.getMonth()+1 + "/" + dDate.getDate() + "/" + dDate.getFullYear())).getOutput().getTime());
				i++;
			}
		}
	} else {
		dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * amt));
	}
	return dDate;
}

function convertDate(thisDate) { // convert ScriptDateTime to Javascript Date Object
	xMonth = thisDate.getMonth();
	xYear = thisDate.getYear();
	xDay = thisDate.getDayOfMonth();
	var xDate = xMonth + "/" + xDay + "/" + xYear;
	return (new Date(xDate));
}