/*------------------------------------------------------------------------------------------------------/
| | Program : SetTransferToTaxRollScript.js
| Event   : Cap Set Script
|
| Usage   : For use with the cap set script functionality available in 6.5.0 and later.
|
| Client  : N/A
| Action# : N/A
|
| Notes   : This script finds all the active Building Inspection - Enforcement CAPs of Sub Type:
|			'Housing', 'Construction', 'Property Maintenance', 'Zoning' with Appplication Status
|			that aren't 'No Violation', 'Void' and they aren't Temporary CAPs.  It will then loop 
|      		through each CAP determining which fees are 'Reinspection' fees and were invoiced during 
|			the specified date range.  For those fees with a balance above zero it "pay" with the 
|			payment method "Transfer to Tax Roll."
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| BEGIN Initialize Variables
/------------------------------------------------------------------------------------------------------*/
var debug = "";	
var showMessage = true;		// Set to true to see results in popup window
var showDebug = true;	
var br = "<BR>";
var message =	"";
var megMessage = "";
var noBegin = true;
var includeNoEntry = true;
var todaysDate = new Date();
var year = todaysDate.getFullYear();
/*------------------------------------------------------------------------------------------------------/
| END Initialize Variables
/------------------------------------------------------------------------------------------------------*/

var SetMemberTest = aa.env.getValue("SetMemberArray");
var idTest = SetMemberTest[0];
var capIdTest = aa.cap.getCapID(idTest.getID1(), idTest.getID2(),idTest.getID3()).getOutput();
var capTest = aa.cap.getCap(capIdTest).getOutput();
var appTypeResultTest = capTest.getCapType();
var appTypeStringTest = appTypeResultTest.getType();

if (appTypeStringTest == "Fire") 
{
	if (noBegin == false) 
	{
		var beginDate = new Date("10/01/" + (year - 1));
		var endDate = new Date("09/30/" + (year));
	} 
	else
	{
		var beginDate = new Date("01/01/1900");
		var endDate = new Date("09/30/" + (year));
	}
}
else
{
	if (noBegin == false) 
	{
		if ( todaysDate >= new Date("01/01/" + year) && todaysDate <= new Date("01/30/" + year) ) {
			var beginDate = new Date("08/01/" + (year - 1));
			var endDate = new Date("09/30/" + (year - 1));
		} else if ( todaysDate >= new Date("01/31/" + year) && todaysDate <= new Date("03/30/" + year) ) {
			var beginDate = new Date("10/01/" + (year - 1));
			var endDate = new Date("11/30/" + (year - 1));
		} else if ( todaysDate >= new Date("03/31/" + year) && todaysDate <= new Date("05/30/" + year) ) {
			var beginDate = new Date("12/01/" + (year - 1));
			var endDate = new Date("01/31/" + year);
		} else if ( todaysDate >= new Date("05/31/" + year) && todaysDate <= new Date("07/30/" + year) ) {
			var beginDate = new Date("02/01/" + year);
			var endDate = new Date("03/31/" + year);
		} else if ( todaysDate >= new Date("07/31/" + year) && todaysDate <= new Date("09/29/" + year) ) {
			var beginDate = new Date("04/01/" + year);
			var endDate = new Date("05/31/" + year);
		} else if ( todaysDate >= new Date("09/30/" + year) && todaysDate <= new Date("11/29/" + year) ) {
			var beginDate = new Date("06/01/" + year);
			var endDate = new Date("07/31/" + year);
		} else if ( todaysDate >= new Date("11/30/" + year) && todaysDate <= new Date("12/31/" + year) ) {
			var beginDate = new Date("08/01/" + year);
			var endDate = new Date("09/30/" + year);
		}
	} 
	else
	{
		if ( todaysDate >= new Date("01/01/" + year) && todaysDate <= new Date("01/30/" + year) ) {
			var beginDate = new Date("01/01/1900");
			var endDate = new Date("09/30/" + (year - 1));
		} else if ( todaysDate >= new Date("01/31/" + year) && todaysDate <= new Date("03/30/" + year) ) {
			var beginDate = new Date("01/01/1900");
			var endDate = new Date("11/30/" + (year - 1));
		} else if ( todaysDate >= new Date("03/31/" + year) && todaysDate <= new Date("05/30/" + year) ) {
			var beginDate = new Date("01/01/1900");
			var endDate = new Date("01/31/" + year);
		} else if ( todaysDate >= new Date("05/31/" + year) && todaysDate <= new Date("07/30/" + year) ) {
			var beginDate = new Date("01/01/1900");
			var endDate = new Date("03/31/" + year);
		} else if ( todaysDate >= new Date("07/31/" + year) && todaysDate <= new Date("09/29/" + year) ) {
			var beginDate = new Date("01/01/1900");
			var endDate = new Date("05/31/" + year);
		} else if ( todaysDate >= new Date("09/30/" + year) && todaysDate <= new Date("11/29/" + year) ) {
			var beginDate = new Date("01/01/1900");
			var endDate = new Date("07/31/" + year);
		} else if ( todaysDate >= new Date("11/30/" + year) && todaysDate <= new Date("12/31/" + year) ) {
			var beginDate = new Date("01/01/1900");
			var endDate = new Date("09/30/" + year);
		}
	}
}

comment("Hello Support,<br>"); 
comment("The following variables determine the run process.  Following that the CAP list is comprised of the CAPs that have Reinspection and No Entry Fees that have been transferred to taxes.<br>");
comment("Include No Entry Fee: " + includeNoEntry + "<br>");
comment("No Begin Date: " + noBegin + "<br>");
comment("Today's Date: " + todaysDate + "<br>");
comment("Begin Date: " + beginDate + "<br>");
comment("End Date: " + endDate + "<br>");
megMessage = "<br>"; 
megMessage += "The following record list is comprised of the records that have Reinspection and No Entry Fees that have been transferred to taxes.<br>";
var SetMemberArray = aa.env.getValue("SetMemberArray");

SetMemberArray.sort();

for(var s = 0; s < SetMemberArray.length; s++) 
{
	var id= SetMemberArray[s];
	var capId = aa.cap.getCapID(id.getID1(), id.getID2(),id.getID3()).getOutput();
	var altId = capId.getCustomID();
	comment("<br>CAP: " + altId);
	megMessage += "<br>CAP: " + altId;
	var capAdd = aa.address.getAddressByCapId(capId);
		if (capAdd.getSuccess())
			{
				var Address = capAdd.getOutput();
				for (a in Address)
				{
					comment("Address: " + Address[a].getDisplayAddress());
					megMessage += "<br>Address: " + Address[a].getDisplayAddress(); 
				}
			}
	// load invoices for a CAP and cycle through them
	var invoices = aa.finance.getInvoiceByCapID(capId, null);
	
	if (invoices.getSuccess()) 
	{
		var invoice = invoices.getOutput();
		
		for(var i = 0; i < invoice.length; i++)
		{
			var invoiceDate = convertDate(invoice[i].getInvDate());
			var invoiceNumber = invoice[i].getInvNbr();
			//if invoice date is within the quarter process it
			if (invoiceDate >= beginDate && invoiceDate <= endDate) 
			{ 
				//load fees for the invoice and cycle throug them
				var fees = aa.finance.getFeeItemInvoiceByInvoiceNbr(capId, invoiceNumber, null);
				var feeSeqNumber = new Array();
				var feeInvNumber = new Array();
				var feeAmount = new Array();
				var index = 0;
				var paymentAmount = 0;
				//if invoice amount is greater than 0 write line
				if (invoice[i].getInvoiceModel().getInvAmount() > 0)
				{
					comment("    Invoice: " + invoiceNumber + " invoiced on " + formatJSDate(invoiceDate));
				}
			
				if (fees.getSuccess())
				{
					var fee = fees.getOutput();
					for(var f = 0; f < fee.length; f++)
					{
						var feeItemStatus = fee[f].getFeeitemStatus();
						var feeDescription = fee[f].getFeeDescription();
						var feeItemInvoice = fee[f].getInvoiceNbr();
						var feeItemSeqNum = fee[f].getFeeSeqNbr();
						
						//if the fee item is invoiced and is a reinspection fee add seq# to array, add invoice number to array
						//add fee amount array and total fee amount in paymentAmount
						if (includeNoEntry == true)
						{
							if (feeItemStatus == "INVOICED" && (feeDescription == "Reinspection Fee" || feeDescription == "No Entry Fee"))
							{
								var item = isFeePaid(capId, feeItemInvoice, feeItemSeqNum);
								if (item == false)
								{
									feeSeqNumber[index] = fee[f].getFeeSeqNbr();
									feeInvNumber[index] = fee[f].getInvoiceNbr();
									feeAmount[index] = fee[f].getFee();
									paymentAmount = paymentAmount + fee[f].getFee();
									index++
									comment("        Fee: " + feeDescription + " with a status of " 
									+ feeItemStatus + " in the amount of $" + fee[f].getFee() + ".00");				
								}
							}
						}
						else
						{
							if (feeItemStatus == "INVOICED" && feeDescription == "Reinspection Fee")
							{
								var item = isFeePaid(capId, feeItemInvoice, feeItemSeqNum);
								if (item == false)
								{
									feeSeqNumber[index] = fee[f].getFeeSeqNbr();
									feeInvNumber[index] = fee[f].getInvoiceNbr();
									feeAmount[index] = fee[f].getFee();
									paymentAmount = paymentAmount + fee[f].getFee();
									index++
									comment("        Fee: " + feeDescription + " with a status of " 
									+ feeItemStatus + " in the amount of $" + fee[f].getFee() + ".00");				
								}
							}
						}
					}
					
					if (invoice[i].getInvoiceModel().getInvAmount() > 0 && paymentAmount > 0)
					{
						comment("        Payment Amount Needed: $" + paymentAmount + ".00");
						
						var makePay = aa.finance.makePayment(capId, "Transfer to Tax Roll", "9999", "", aa.date.getCurrentDate(), "TaxRoll", 
						aa.date.getCurrentDate(), paymentAmount, 0, paymentAmount, "Paid", "", "TaxRoll", "123", "Transfer to Tax Roll");
						
						if (makePay.getSuccess())
						{
							var payments = aa.finance.getPaymentByCapID(capId, null);
							
							if (payments.getSuccess()) 
							{
								var payment = payments.getOutput();
						
								for(var p = 0; p < payment.length; p++)
								{
									var receiptNumber = payment[p].getReceiptNbr();
									var amountNotAllocated = payment[p].getAmountNotAllocated();
									var payDate = payment[p].getPaymentDate();
									var payMethod = payment[p].getPaymentMethod();
									var paySeqNum = payment[p].getPaymentSeqNbr();
									
									if(payMethod == "Transfer to Tax Roll" && receiptNumber == 0 && amountNotAllocated > 0)
									{
										var applyPay = aa.finance.applyPayment(capId, paySeqNum, 0, feeSeqNumber, feeInvNumber, 
										feeAmount, aa.date.getCurrentDate(), feeItemStatus, "INVOICED", "TaxRoll", "123");
											
										if (applyPay.getSuccess())
										{
											var genReceipt = aa.finance.generateReceipt(capId, payDate, paySeqNum, "TaxRoll", "123");
											
											if(genReceipt.getSuccess())
											{
												comment("<b>Payment was made and applied.  The receipt was generated for CAP: " + altId + ", Invoice: " + invoiceNumber + "</b><br>");
												megMessage += "<br>  Invoice: " + invoiceNumber + " Payment Amount: $" + paymentAmount + ".00";
											}
											else
											{
												comment("<font color='red'><b>Payment was made and applied. The receipt was not generated for CAP: " + altId + ", Invoice: " + invoiceNumber + "</b></font><br>");
												megMessage += "<br>Invoice: " + invoiceNumber + " Payment Amount: $" + paymentAmount + ".00";
											}
											
										} 
										else 
										{
											comment("<font color='red'><b>Payment was made but not applied to CAP: " + altId + ", Invoice: " + invoiceNumber + "</b></font><br>"); 
										}
									}
								}
							}
						} 
						else 
						{
							comment("<font color='red'><b>Payment failed for CAP: " + altId + ", Invoice: " + invoiceNumber + "</b></font><br>"); 
						}
					}
					else 
					{
						comment("<b>Payment was previously made for CAP: " + altId + ", Invoice: " + invoiceNumber + "</b><br>"); 
						megMessage += "<br>  Invoice: " + invoiceNumber + " Payment Amount: $" + paymentAmount + ".00";
					}
				}
			}
		}
	}
	megMessage += "<br>";
} 

if (appTypeStringTest == "Fire") 
{
	aa.sendMail("noreply@cityofmadison.com", "cpeterson@cityofmadison.com", "elamsupport@cityofmadison.com", "Transfer to Taxroll", megMessage);
} 
else
{
	aa.sendMail("noreply@cityofmadison.com", "mzopelis@cityofmadison.com", "elamsupport@cityofmadison.com", "Transfer to Taxroll", megMessage);
}
aa.sendMail("noreply@cityofmadison.com", "glabelle-brown@cityofmadison.com", "elamsupport@cityofmadison.com", "Transfer to Taxroll", debug);
aa.env.setValue("ScriptReturnCode","0");
aa.env.setValue("ScriptReturnMessage", "The Transfer to Taxroll process is complete.  You will be receiving an email with the results shortly.");

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function isFeePaid(xCapId, xiNum, xfSeq)
	{
		var pass = false;
		var xPayFees = aa.finance.getPaymentFeeItems(capId, null);
		
		if (xPayFees.getSuccess())
		{
			var xPayFee = xPayFees.getOutput();
			for(var x = 0; x < xPayFee.length; x++)
			{
				var xPayFeeInvoice = xPayFee[x].getInvoiceNbr();
				var xPayFeeSeqNum = xPayFee[x].getFeeSeqNbr();
				
				if (xPayFeeInvoice == xiNum && xPayFeeSeqNum == xfSeq)
				{
					pass = true;
					break;
				}
			}
		}
		return pass;
	}
	
function formatDate(thisDate)
//format ScriptDateTime to MM/dd/yyyy
	{
	return thisDate.getMonth() + "/" + thisDate.getDayOfMonth() + "/" + thisDate.getYear();
	}

function convertDate(thisDate)
// convert ScriptDateTime to Javascript Date Object
	{
			xMonth = thisDate.getMonth();
			xYear = thisDate.getYear();
			xDay = thisDate.getDayOfMonth();
			var xDate = xMonth + "/" + xDay + "/" + xYear;
		return (new Date(xDate));
	}	

function formatJSDate(thisDate)
//format javascriptDateTime to MM/dd/yyyy
	{
	xMonth = thisDate.getMonth() + 1;
	xYear = thisDate.getFullYear();
	xDay = thisDate.getDate();
	xDate = xMonth + "/" + xDay + "/" + xYear;
	return xDate;
	}

function logDebug(dstr)
	{
	debug+=dstr + br;
	}

function logMessage(dstr)
	{
	message+=dstr + br;
	}

function debugObject(object)
{
 var output = ''; 
 for (property in object) { 
   output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
 } 
 logDebug(output);
} 

function comment(cstr)
	{
	if (showDebug) logDebug(cstr);
	if (showMessage) logMessage(cstr);
	}